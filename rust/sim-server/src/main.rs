#![recursion_limit = "256"]

mod admin;
mod analysis;
mod aria;
mod db;
mod auth;
mod god;
mod routes;
mod runtime;
mod ws;

use std::{net::SocketAddr, path::PathBuf};

use axum::{routing::{get, post}, Router};
use db::AppState;
use routes::{health, simulation_routes, system_status};
use tokio::net::TcpListener;
use tower_http::{cors::{Any, CorsLayer}, services::{ServeDir, ServeFile}};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("sim_server=info".parse()?))
        .init();

    let state = AppState::new().await?;
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let mut app = Router::new()
        .route("/api/health", axum::routing::get(health))
        .route("/api/system/status", axum::routing::get(system_status))
        .route("/ws", get(ws::ws_handler))
        .nest("/api/auth", Router::new()
            .route("/register", post(auth::register))
            .route("/login", post(auth::login))
            .route("/refresh", post(auth::refresh))
            .route("/logout", post(auth::logout))
            .route("/pending-status/:userCode", get(auth::pending_status)))
        .nest("/api/admin", Router::new()
            .route("/users", get(admin::list_users))
            .route("/users/:id/approve", post(admin::approve_user))
            .route("/users/:id/reject", post(admin::reject_user))
            .route("/users/:id/ban", post(admin::ban_user))
            .route("/users/:id/unban", post(admin::unban_user))
            .route("/users/:id", axum::routing::delete(admin::delete_user_route))
            .route("/seed-admin", post(admin::seed_admin))
            .route("/cleanup-admin", post(admin::cleanup_admin))
            .route("/test-email", get(admin::test_email))
            .route("/review/:token", get(admin::review))
            .route("/quick-approve/:token", get(admin::quick_approve))
            .route("/quick-reject/:token", get(admin::quick_reject)))
        .nest("/api/analysis", Router::new()
            .route("/:simId", post(analysis::analyze))
            .route("/:simId/hypothesis", post(analysis::hypothesis)))
        .nest("/api/aria", Router::new()
            .route("/command", post(aria::command))
            .route("/speak", post(aria::speak))
            .route("/inner-voice", post(aria::inner_voice)))
        .nest("/api/god", Router::new()
            .route("/:simId/intervene", post(god::intervene))
            .route("/:simId/quarantine", post(god::quarantine))
            .route("/:simId/talk/:individualId", post(god::talk)))
        .nest("/api/simulations", simulation_routes())
        .layer(cors)
        .with_state(state);

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let client_dist = [cwd.join("client/dist"), cwd.join("../client/dist")]
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| cwd.join("client/dist"));
    if client_dist.exists() {
        let index_file = client_dist.join("index.html");
        app = app.fallback_service(
            ServeDir::new(client_dist).not_found_service(ServeFile::new(index_file))
        );
    }

    let port = std::env::var("PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(3002);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(addr).await?;
    tracing::info!("sim-server listening on {}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}
