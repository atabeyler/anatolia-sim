use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    auth::auth_user_from_headers,
    db::{load_simulation, row_to_state, save_state, upsert_individuals, AppState},
};

#[derive(Debug, Deserialize)]
pub struct GodPayload {
    #[serde(rename = "type")]
    pub intervention_type: String,
    #[serde(default)]
    pub params: serde_json::Value,
    pub user_note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct QuarantinePayload {
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct TalkPayload {
    pub message: String,
}

fn is_allowed(headers: &axum::http::HeaderMap, sim_user_id: Option<String>) -> bool {
    let Some(user) = auth_user_from_headers(headers) else { return false; };
    if user.role == "admin" {
        return true;
    }
    sim_user_id.map(|id| id == user.id).unwrap_or(false)
}

fn mark_dead(individual: &mut serde_json::Value, day: i64, cause: &str) {
    if let Some(obj) = individual.as_object_mut() {
        obj.insert("is_dead".to_string(), json!(true));
        obj.insert("alive".to_string(), json!(false));
        obj.insert("death_day".to_string(), json!(day));
        obj.insert("death_cause".to_string(), json!(cause));
        let health = obj.entry("health").or_insert_with(|| json!({}));
        if let Some(h) = health.as_object_mut() {
            h.insert("hp".to_string(), json!(0));
        }
    }
}

async fn save_snapshot(sim_id: &str, state: &AppState, sim: &serde_json::Value) -> Result<(), sqlx::Error> {
    let mut sim_state: sim_core::SimulationState = serde_json::from_value(sim.clone()).unwrap_or_default();
    sim_state.id = Some(sim_id.to_string());
    save_state(&state.backend, &sim_state).await?;
    upsert_individuals(&state.backend, &sim_state).await?;
    Ok(())
}

pub async fn intervene(
    Path(sim_id): Path<String>,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<GodPayload>,
) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &sim_id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim_state = row_to_state(&row);
    if !is_allowed(&headers, sim_state.user_id.clone()) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Simulation owner required."}))).into_response();
    }

    let mut sim = serde_json::to_value(&sim_state).unwrap_or_else(|_| json!({}));
    let day = sim.get("current_day").and_then(|v| v.as_i64()).unwrap_or(0);
    let year = sim.get("current_year").and_then(|v| v.as_i64()).unwrap_or(day / 365);
    let mut affected = 0_i64;
    let mut deaths = 0_i64;
    let alive_count = sim
        .get("individuals")
        .and_then(|v| v.as_array())
        .map(|v| v.len())
        .unwrap_or(0);

    let params = payload.params.clone();
    match payload.intervention_type.as_str() {
        "instant_death" => {
            if let Some(inds) = sim.get_mut("individuals").and_then(|v| v.as_array_mut()) {
                if let Some(id) = params.get("individual_id").and_then(|v| v.as_str()) {
                    if let Some(ind) = inds.iter_mut().find(|i| i.get("id").and_then(|v| v.as_str()) == Some(id)) {
                        mark_dead(ind, day, "god_intervention");
                        affected = 1;
                        deaths = 1;
                    }
                }
            }
        }
        "genetic_boost" => {
            if let Some(inds) = sim.get_mut("individuals").and_then(|v| v.as_array_mut()) {
                if let Some(id) = params.get("individual_id").and_then(|v| v.as_str()) {
                    if let Some(ind) = inds.iter_mut().find(|i| i.get("id").and_then(|v| v.as_str()) == Some(id)) {
                        if ind.get("is_founder").and_then(|v| v.as_bool()).unwrap_or(false) {
                            let trait_name = params.get("trait").and_then(|v| v.as_str()).unwrap_or("fluid_intelligence");
                            let amount = params.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.1);
                            let phenotype = ind.as_object_mut().unwrap();
                            let ph = phenotype.entry("phenotype").or_insert_with(|| json!({}));
                            if let Some(obj) = ph.as_object_mut() {
                                let current = obj.get(trait_name).and_then(|v| v.as_f64()).unwrap_or(0.5);
                                obj.insert(trait_name.to_string(), json!((current + amount).min(1.0)));
                                affected = 1;
                            }
                        }
                    }
                }
            }
        }
        "resource_boost" => {
            if let Some(world) = sim.get_mut("world_state").and_then(|v| v.as_object_mut()) {
                let food = params.get("food").and_then(|v| v.as_f64()).unwrap_or(0.2);
                let water = params.get("water").and_then(|v| v.as_f64()).unwrap_or(0.2);
                world.insert("food_abundance".to_string(), json!((world.get("food_abundance").and_then(|v| v.as_f64()).unwrap_or(0.5) + food * 0.1).min(1.0)));
                world.insert("water_abundance".to_string(), json!((world.get("water_abundance").and_then(|v| v.as_f64()).unwrap_or(0.7) + water * 0.1).min(1.0)));
                affected = alive_count as i64;
            }
        }
        "drought" => {
            if let Some(world) = sim.get_mut("world_state").and_then(|v| v.as_object_mut()) {
                world.insert("food_abundance".to_string(), json!(0.1));
                world.insert("water_abundance".to_string(), json!(0.05));
                affected = alive_count as i64;
            }
        }
        "weather_override" => {
            if let Some(world) = sim.get_mut("world_state").and_then(|v| v.as_object_mut()) {
                world.insert("current_weather".to_string(), json!(params.get("weather").and_then(|v| v.as_str()).unwrap_or("clear")));
                world.insert("weather_intensity".to_string(), json!(params.get("intensity").and_then(|v| v.as_f64()).unwrap_or(0.5)));
                affected = alive_count as i64;
            }
        }
        "quarantine" => {
            let enabled = payload.params.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
            if let Some(sim_obj) = sim.as_object_mut() {
                let extra = sim_obj.entry("extra").or_insert_with(|| json!({}));
                if let Some(extra) = extra.as_object_mut() {
                    extra.insert("quarantine_enabled".to_string(), json!(enabled));
                    affected = alive_count as i64;
                }
            }
        }
        "talk" => {
            affected = 1;
        }
        _ => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Unknown intervention type: {}", payload.intervention_type)}))).into_response();
        }
    }

    if let Some(sim_obj) = sim.as_object_mut() {
        let extra = sim_obj.entry("extra").or_insert_with(|| json!({}));
        if let Some(extra) = extra.as_object_mut() {
            extra.insert("intervened".to_string(), json!(true));
        }
    }

    match save_snapshot(&sim_id, &state, &sim).await {
        Ok(()) => {
            if let crate::db::DbBackend::Sqlite(pool) = &state.backend {
                let _ = sqlx::query(
                    "INSERT INTO god_interventions (id, simulation_id, sim_day, sim_year, type, params, affected_individuals, deaths, user_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(Uuid::new_v4().to_string())
                .bind(&sim_id)
                .bind(day)
                .bind(year)
                .bind(&payload.intervention_type)
                .bind(payload.params.to_string())
                .bind(affected)
                .bind(deaths)
                .bind(payload.user_note)
                .execute(pool)
                .await;
            }
            Json(json!({
                "message": "Intervention applied.",
                "affected_individuals": affected,
                "deaths": deaths,
            }))
            .into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn quarantine(
    Path(sim_id): Path<String>,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<QuarantinePayload>,
) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &sim_id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim_state = row_to_state(&row);
    if !is_allowed(&headers, sim_state.user_id.clone()) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Simulation owner required."}))).into_response();
    }
    let mut sim = serde_json::to_value(&sim_state).unwrap_or_else(|_| json!({}));
    if let Some(sim_obj) = sim.as_object_mut() {
        let extra = sim_obj.entry("extra").or_insert_with(|| json!({}));
        if let Some(extra) = extra.as_object_mut() {
            extra.insert("quarantine_enabled".to_string(), json!(payload.enabled.unwrap_or(true)));
        }
    }
    match save_snapshot(&sim_id, &state, &sim).await {
        Ok(()) => Json(json!({"message": "Quarantine updated."})).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

pub async fn talk(
    Path((sim_id, individual_id)): Path<(String, String)>,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<TalkPayload>,
) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &sim_id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim_state = row_to_state(&row);
    if !is_allowed(&headers, sim_state.user_id.clone()) {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Simulation owner required."}))).into_response();
    }
    let sim = serde_json::to_value(&sim_state).unwrap_or_else(|_| json!({}));
    let response = format!(
        "Rust divine response to {}: {}",
        individual_id,
        payload.message.trim()
    );
    Json(json!({
        "response": response,
        "language": sim.get("language").cloned().unwrap_or_else(|| json!("English")),
    }))
    .into_response()
}
