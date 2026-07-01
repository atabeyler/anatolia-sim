use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    db::{load_simulation, row_to_state, AppState},
};

#[derive(Debug, Deserialize)]
pub struct AnalysisPayload {
    pub message: Option<String>,
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HypothesisPayload {
    pub hypothesis: String,
    pub lang: Option<String>,
    pub events: Option<Vec<serde_json::Value>>,
}

fn lang_name(lang: Option<String>) -> &'static str {
    match lang.as_deref() {
        Some("tr") => "Turkish",
        Some("de") => "German",
        Some("fr") => "French",
        Some("ar") => "Arabic",
        _ => "English",
    }
}

fn simulation_summary(sim: &serde_json::Value) -> String {
    let current_day = sim.get("current_day").and_then(|v| v.as_i64()).unwrap_or(0);
    let population = sim.get("individuals").and_then(|v| v.as_array()).map(|v| v.len()).unwrap_or(0);
    let events = sim.get("events").and_then(|v| v.as_array()).map(|v| v.len()).unwrap_or(0);
    let techs = sim.get("discovered_techs").and_then(|v| v.as_array()).map(|v| v.len()).unwrap_or(0);
    format!("day={current_day}, population={population}, events={events}, techs={techs}")
}

pub async fn analyze(Path(sim_id): Path<String>, State(state): State<AppState>, Json(payload): Json<AnalysisPayload>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &sim_id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    let summary = serde_json::to_value(&sim).unwrap_or_else(|_| json!({}));
    let lang = lang_name(payload.lang);
    let message = payload.message.unwrap_or_else(|| "Analyze the current simulation state.".to_string());
    Json(json!({
        "response": format!(
            "[Rust analysis/{lang}] {} | {}",
            message.trim(),
            simulation_summary(&summary)
        ),
        "language": lang,
    }))
    .into_response()
}

pub async fn hypothesis(Path(sim_id): Path<String>, State(state): State<AppState>, Json(payload): Json<HypothesisPayload>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &sim_id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    let day = sim.current_day as i64;
    let population = sim.individuals.len() as i64;
    let events = payload.events.as_ref().map(|v| v.len() as i64).unwrap_or(0);
    let lang = lang_name(payload.lang);
    let confidence = if population > 100 {
        0.72
    } else if population > 20 {
        0.58
    } else {
        0.44
    };
    let verdict = if population > 50 && events > 10 {
        "supported"
    } else if population == 0 {
        "refuted"
    } else {
        "inconclusive"
    };
    Json(json!({
        "verdict": verdict,
        "confidence": confidence,
        "n_evidence": events.max(1),
        "language": lang,
        "reasoning": format!("Rust backend heuristic for '{}' at day {} with population {}.", payload.hypothesis, day, population),
        "ci_lower": ((confidence - 0.12_f64).max(0.0_f64)),
        "ci_upper": ((confidence + 0.12_f64).min(1.0_f64)),
    }))
    .into_response()
}
