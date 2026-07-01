use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, AtomicI32, Ordering},
        Arc,
    },
    time::Duration,
};

use tokio::{sync::Mutex, task::JoinHandle, time::sleep};

use crate::db::{load_simulation, row_to_state, save_state, upsert_individuals, DbBackend};
use sim_core::advance_one_day;

#[derive(Clone, Default)]
pub struct RuntimeManager {
    sessions: Arc<Mutex<HashMap<String, RuntimeSession>>>,
}

struct RuntimeSession {
    stop: Arc<AtomicBool>,
    fast_forward_target: Arc<AtomicI32>,
    _handle: JoinHandle<()>,
}

impl RuntimeManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn start(&self, backend: DbBackend, sim_id: String) {
        let mut sessions = self.sessions.lock().await;
        if let Some(existing) = sessions.get(&sim_id) {
            if !existing._handle.is_finished() {
                return;
            }
            sessions.remove(&sim_id);
        }
        if sessions.contains_key(&sim_id) {
            return;
        }

        let stop = Arc::new(AtomicBool::new(false));
        let fast_forward_target = Arc::new(AtomicI32::new(-1));
        let stop_clone = Arc::clone(&stop);
        let target_clone = Arc::clone(&fast_forward_target);
        let sim_id_clone = sim_id.clone();
        let sessions_clone = Arc::clone(&self.sessions);

        let handle = tokio::spawn(async move {
            runtime_loop(backend, sim_id_clone, stop_clone, target_clone, sessions_clone).await;
        });

        sessions.insert(
            sim_id,
            RuntimeSession {
                stop,
                fast_forward_target,
                _handle: handle,
            },
        );
    }

    pub async fn pause(&self, sim_id: &str) {
        let _ = sim_id;
    }

    pub async fn terminate(&self, sim_id: &str) {
        if let Some(session) = self.sessions.lock().await.remove(sim_id) {
            session.stop.store(true, Ordering::SeqCst);
        }
    }

    pub async fn fast_forward(&self, sim_id: &str, target_day: i32) {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(sim_id) {
            session.fast_forward_target.store(target_day, Ordering::SeqCst);
            session.stop.store(false, Ordering::SeqCst);
        }
    }

    pub async fn cancel_fast_forward(&self, sim_id: &str) {
        if let Some(session) = self.sessions.lock().await.get(sim_id) {
            session.fast_forward_target.store(-1, Ordering::SeqCst);
        }
    }
}

async fn runtime_loop(
    backend: DbBackend,
    sim_id: String,
    stop: Arc<AtomicBool>,
    fast_forward_target: Arc<AtomicI32>,
    sessions: Arc<Mutex<HashMap<String, RuntimeSession>>>,
) {
    loop {
        if stop.load(Ordering::SeqCst) {
            break;
        }

        let row = match load_simulation(&backend, &sim_id).await {
            Ok(Some(row)) => row,
            _ => break,
        };
        let mut state = row_to_state(&row);
        let status = state.status.clone().unwrap_or_default();
        if status == "completed" || status == "terminated" {
            break;
        }
        if status != "running" {
            sleep(Duration::from_millis(250)).await;
            continue;
        }

        let target = fast_forward_target.load(Ordering::SeqCst);
        let fast_forwarding = target >= 0;
        if fast_forwarding && state.current_day >= target {
            fast_forward_target.store(-1, Ordering::SeqCst);
            sleep(Duration::from_millis(50)).await;
            continue;
        }

        let speed = state.speed_multiplier.unwrap_or(1).clamp(1, 1000) as usize;
        let batch_size = if fast_forwarding {
            let remaining = (target - state.current_day).max(1) as usize;
            remaining.min(100)
        } else {
            speed.clamp(1, 10)
        };

        for _ in 0..batch_size {
            if stop.load(Ordering::SeqCst) {
                break;
            }
            let current_target = fast_forward_target.load(Ordering::SeqCst);
            if current_target >= 0 && state.current_day >= current_target {
                fast_forward_target.store(-1, Ordering::SeqCst);
                break;
            }
            advance_one_day(&mut state);
            if current_target >= 0 && state.current_day >= current_target {
                fast_forward_target.store(-1, Ordering::SeqCst);
                break;
            }
        }

        if let Err(err) = save_state(&backend, &state).await {
            eprintln!("[runtime] save_state failed for {sim_id}: {err}");
            sleep(Duration::from_millis(250)).await;
            continue;
        }
        if let Err(err) = upsert_individuals(&backend, &state).await {
            eprintln!("[runtime] upsert_individuals failed for {sim_id}: {err}");
        }

        if !fast_forwarding {
            let delay_ms = (1000 / speed as u64).clamp(20, 1000);
            sleep(Duration::from_millis(delay_ms)).await;
        }
    }

    let mut sessions = sessions.lock().await;
    sessions.remove(&sim_id);
}
