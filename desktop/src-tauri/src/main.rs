#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    net::TcpStream,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

fn wait_for_server(port: u16, attempts: usize) {
    for _ in 0..attempts {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return;
        }
        thread::sleep(Duration::from_millis(250));
    }
}

fn resolve_server_binary(app: &tauri::AppHandle) -> Option<PathBuf> {
    let rel = if cfg!(target_os = "windows") {
        "rust/target/release/sim-server.exe"
    } else {
        "rust/target/release/sim-server"
    };
    app.path_resolver().resolve_resource(rel)
}

fn spawn_server(app: &tauri::AppHandle) -> Result<Child, String> {
    let binary = resolve_server_binary(app).ok_or_else(|| "Rust server binary not found in resources".to_string())?;
    let cwd = binary
        .ancestors()
        .nth(3)
        .map(PathBuf::from)
        .unwrap_or_else(|| binary.parent().unwrap_or_else(|| std::path::Path::new(".")).to_path_buf());

    let mut cmd = Command::new(binary);
    cmd.current_dir(cwd)
        .env("PORT", "3001")
        .env("NODE_ENV", "production")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    cmd.spawn().map_err(|err| err.to_string())
}

fn main() {
    let child_state = Arc::new(Mutex::new(None::<Child>));
    let setup_state = Arc::clone(&child_state);
    let close_state = Arc::clone(&child_state);

    tauri::Builder::default()
        .setup(move |app| {
            let child = spawn_server(&app.handle())?;
            if let Ok(mut slot) = setup_state.lock() {
                *slot = Some(child);
            }
            wait_for_server(3001, 120);
            Ok(())
        })
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                if let Ok(mut slot) = close_state.lock() {
                    if let Some(mut child) = slot.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
