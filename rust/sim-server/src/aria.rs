use axum::{extract::State, response::IntoResponse, Json};
use serde::Deserialize;
use serde_json::json;

use crate::{auth::auth_user_from_headers, db::AppState};

#[derive(Debug, Deserialize)]
pub struct CommandPayload {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct SpeakPayload {
    pub text: String,
}

fn classify_command(message: &str) -> Vec<serde_json::Value> {
    let msg = message.to_lowercase();
    let mut actions = Vec::new();
    if msg.contains("analysis") || msg.contains("analiz") {
        actions.push(json!({"type": "navigate_panel", "panel": "analysis"}));
    }
    if msg.contains("god") || msg.contains("tanrı") {
        actions.push(json!({"type": "navigate_panel", "panel": "god"}));
    }
    if msg.contains("population") || msg.contains("nüfus") {
        actions.push(json!({"type": "navigate_panel", "panel": "population"}));
    }
    if msg.contains("start") || msg.contains("başlat") {
        actions.push(json!({"type": "start_simulation"}));
    }
    if msg.contains("pause") || msg.contains("duraklat") {
        actions.push(json!({"type": "pause_simulation"}));
    }
    if msg.contains("speed") || msg.contains("hız") {
        actions.push(json!({"type": "change_speed", "speed": 5}));
    }
    if msg.contains("quake") || msg.contains("earthquake") || msg.contains("deprem") {
        actions.push(json!({"type": "apply_disaster", "disaster": "earthquake", "params": {"magnitude": 7, "radius": 200}}));
    }
    if msg.contains("flood") || msg.contains("sel") {
        actions.push(json!({"type": "apply_disaster", "disaster": "flood", "params": {"severity": 0.7, "radius": 200}}));
    }
    actions
}

pub async fn command(
    State(_state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CommandPayload>,
) -> impl IntoResponse {
    if auth_user_from_headers(&headers).is_none() {
        return Json(json!({"error": "Unauthorized"})).into_response();
    }
    let actions = classify_command(&payload.message);
    Json(json!({
        "text": if actions.is_empty() { "Rust ARIA: command received." } else { "Rust ARIA: command parsed." },
        "actions": actions,
        "retry_after": 0
    }))
    .into_response()
}

pub async fn speak(headers: axum::http::HeaderMap, Json(payload): Json<SpeakPayload>) -> impl IntoResponse {
    if auth_user_from_headers(&headers).is_none() {
        return Json(json!({"error": "Unauthorized"})).into_response();
    }
    Json(json!({"text": format!("Rust ARIA speaks: {}", payload.text)})).into_response()
}

pub async fn inner_voice(headers: axum::http::HeaderMap, Json(payload): Json<SpeakPayload>) -> impl IntoResponse {
    if auth_user_from_headers(&headers).is_none() {
        return Json(json!({"error": "Unauthorized"})).into_response();
    }
    Json(json!({"text": format!("Rust inner voice: {}", payload.text)})).into_response()
}

