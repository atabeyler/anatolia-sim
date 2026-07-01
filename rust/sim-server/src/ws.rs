use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::json;
use std::time::Duration;
use tokio::time::interval;

use crate::{
    auth::decode_access_token,
    db::{load_simulation, row_to_state, AppState},
};

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    #[serde(rename = "simId")]
    pub sim_id: Option<String>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
) -> impl IntoResponse {
    let Some(sim_id) = query.sim_id else {
        return axum::http::StatusCode::BAD_REQUEST.into_response();
    };
    ws.on_upgrade(move |socket| handle_socket(socket, state, sim_id))
}

async fn close_socket(socket: &mut WebSocket) {
    let _ = socket.send(Message::Close(None)).await;
}

async fn handle_socket(mut socket: WebSocket, state: AppState, sim_id: String) {
    let auth_msg = match socket.recv().await {
        Some(Ok(Message::Text(text))) => text,
        _ => {
            close_socket(&mut socket).await;
            return;
        }
    };

    let token = match serde_json::from_str::<serde_json::Value>(&auth_msg)
        .ok()
        .and_then(|v| {
            if v.get("type").and_then(|v| v.as_str()) == Some("auth") {
                v.get("token").and_then(|v| v.as_str()).map(|s| s.to_string())
            } else {
                None
            }
        }) {
        Some(token) => token,
        None => {
            close_socket(&mut socket).await;
            return;
        }
    };

    let claims = match decode_access_token(&token) {
        Some(claims) => claims,
        None => {
            close_socket(&mut socket).await;
            return;
        }
    };

    let sim_row = match load_simulation(&state.backend, &sim_id).await {
        Ok(Some(row)) => row,
        _ => {
            close_socket(&mut socket).await;
            return;
        }
    };

    let sim = row_to_state(&sim_row);
    if sim.user_id.clone().unwrap_or_default() != claims.id && claims.role != "admin" {
        close_socket(&mut socket).await;
        return;
    }

    let mut last_day: Option<i32> = None;
    let mut heartbeat = interval(Duration::from_secs(30));
    let mut tick = interval(Duration::from_secs(1));

    loop {
        tokio::select! {
            _ = heartbeat.tick() => {
                if socket.send(Message::Ping(vec![].into())).await.is_err() {
                    break;
                }
            }
            _ = tick.tick() => {
                let row = match load_simulation(&state.backend, &sim_id).await {
                    Ok(Some(row)) => row,
                    _ => break,
                };
                let sim = row_to_state(&row);
                let current_day = sim.current_day;
                let alive_population = sim.individuals.iter().filter(|ind| ind.alive && !ind.is_dead).count();
                let status_running = sim.status.as_deref() == Some("running");

                if socket.send(Message::Text(json!({
                    "type": "status",
                    "runtime_running": status_running,
                    "is_warping": false,
                    "fast_forward_target": serde_json::Value::Null,
                    "current_day": current_day,
                }).to_string().into())).await.is_err() {
                    break;
                }

                if last_day.map(|d| d != current_day).unwrap_or(false) {
                    let tick_payload = json!({
                        "type": "tick",
                        "current_day": current_day,
                        "stats": {
                            "day": current_day,
                            "year": sim.current_year,
                            "population": alive_population,
                            "speed_multiplier": sim.speed_multiplier.unwrap_or(1),
                        },
                        "events": [],
                        "centroid_trail": [],
                        "is_warping": false,
                        "fast_forward_target": serde_json::Value::Null,
                    });
                    let _ = socket.send(Message::Text(tick_payload.to_string().into())).await;
                }
                last_day = Some(current_day);
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }
}
