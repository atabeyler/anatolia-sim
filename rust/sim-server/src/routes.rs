use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use serde_json::Value;
use uuid::Uuid;

use sim_core::WorldState;
use crate::db::{
    insert_checkpoint,
    delete_simulation,
    list_checkpoints,
    list_simulations,
    load_simulation,
    load_checkpoint,
    row_to_state,
    save_state,
    system_counts,
    update_simulation_fields,
    upsert_individuals,
    AppState,
};
use sim_core::{advance_one_day, Individual, SimulationState};

pub fn simulation_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_all).post(create_simulation))
        .route("/:id", get(get_simulation))
        .route("/:id/start", post(start_simulation))
        .route("/:id/pause", post(pause_simulation))
        .route("/:id/complete", post(complete_simulation))
        .route("/:id/speed", post(set_speed))
        .route("/:id/tick", post(tick_simulation))
        .route("/:id/population", get(get_population))
        .route("/:id/population/:individualId", get(get_individual))
        .route("/:id/events", get(get_events))
        .route("/:id/events/summary", get(get_events_summary))
        .route("/:id/checkpoints", get(get_checkpoints))
        .route("/:id/checkpoint", post(create_checkpoint))
        .route("/:id/restore/:checkpointId", post(restore_checkpoint))
        .route("/:id/report", get(get_report))
        .route("/:id/metrics", get(get_metrics))
        .route("/:id/diagnostics", get(get_diagnostics))
        .route("/:id/fast-forward", post(fast_forward))
        .route("/:id/fast-forward/cancel", post(cancel_fast_forward))
        .route("/:id/terminate", post(terminate_simulation))
        .route("/:id", axum::routing::delete(delete_simulation_route))
}

pub async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "runtime": "rust",
        "core": "tokio+axum+rayon+sqlx"
    }))
}

pub async fn system_status(State(state): State<AppState>) -> impl IntoResponse {
    match system_counts(&state.backend).await {
        Ok((active_sims, total_population)) => Json(json!({
            "status": "online",
            "genome_loci": 32,
            "epi_loci": 8,
            "lang_stages": 7,
            "active_sims": active_sims,
            "total_population": total_population,
        }))
        .into_response(),
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, Json(json!({
            "status": "degraded",
            "genome_loci": 32,
            "epi_loci": 8,
            "lang_stages": 7,
            "active_sims": 0,
            "total_population": 0,
        }))).into_response(),
    }
}

async fn list_all(State(state): State<AppState>) -> impl IntoResponse {
    match list_simulations(&state.backend).await {
        Ok(rows) => {
            let sims: Vec<SimulationState> = rows.iter().map(row_to_state).collect();
            Json(json!(sims)).into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn get_simulation(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => Json(json!(row_to_state(&row))).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn get_population(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let sim = row_to_state(&row);
    let rows: Vec<Value> = sim
        .individuals
        .iter()
        .map(|ind| serialize_individual(ind, sim.current_day))
        .collect();
    Json(rows).into_response()
}

async fn get_individual(
    State(state): State<AppState>,
    Path((id, individual_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let sim = row_to_state(&row);
    match sim.individuals.iter().find(|ind| ind.id == individual_id) {
        Some(ind) => Json(serialize_individual(ind, sim.current_day)).into_response(),
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "Individual not found"}))).into_response(),
    }
}

async fn get_events(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    Json(sim.events).into_response()
}

async fn get_events_summary(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    let mut counts = std::collections::BTreeMap::<String, i64>::new();
    for event in &sim.events {
        let event_type = event.get("event_type").and_then(|v| v.as_str()).unwrap_or("unknown");
        *counts.entry(event_type.to_string()).or_insert(0) += 1;
    }
    let deaths = sim
        .individuals
        .iter()
        .filter(|ind| ind.is_dead || !ind.alive)
        .count() as i64;
    Json(json!({
        "total": sim.events.len(),
        "countsByType": counts,
        "engineDeaths": deaths,
    }))
    .into_response()
}

async fn get_checkpoints(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match list_checkpoints(&state.backend, &id).await {
        Ok(rows) => {
            let payload: Vec<Value> = rows
                .into_iter()
                .map(|row| json!({
                    "id": row.id,
                    "simulation_id": row.simulation_id,
                    "sim_day": row.sim_day,
                    "sim_year": row.sim_year,
                    "population_count": row.population_count,
                    "stats": row.stats,
                    "created_at": row.created_at,
                }))
                .collect();
            Json(payload).into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn create_simulation(
    State(state): State<AppState>,
    Json(payload): Json<CreateSimulationRequest>,
) -> impl IntoResponse {
    let simulation_id = Uuid::new_v4().to_string();
    let mut sim = SimulationState {
        id: Some(simulation_id.clone()),
        name: Some(payload.name.clone().unwrap_or_else(|| "Untitled Simulation".to_string())),
        user_id: payload.user_id.clone(),
        start_latitude: Some(payload.latitude),
        start_longitude: Some(payload.longitude),
        current_day: 0,
        current_year: 0,
        status: Some("paused".to_string()),
        speed_multiplier: Some(1),
        world_state: serde_json::from_value::<WorldState>(create_world_state(payload.latitude, payload.longitude)).unwrap_or_default(),
        individuals: vec![],
        founder_1: Some(payload.founder_1_params.clone()),
        founder_2: Some(payload.founder_2_params.clone()),
        discovered_techs: vec![],
        discovered_beliefs: vec![],
        discovered_arts: vec![],
        astronomy_knowledge: vec![],
        celestial_observations: vec![],
        groups: vec![],
        settlements: vec![],
        pending_births: vec![],
        events: vec![],
        extra: Default::default(),
    };

    let founder_1 = create_founder(
        &payload.founder_1_params,
        "male",
        payload.latitude,
        payload.longitude,
        22,
        true,
        &simulation_id,
        None,
        None,
    );
    let founder_2 = create_founder(
        &payload.founder_2_params,
        "female",
        payload.latitude,
        payload.longitude + 0.1,
        20,
        true,
        &simulation_id,
        None,
        None,
    );
    sim.individuals = vec![founder_1, founder_2];

    match save_state(&state.backend, &sim).await {
        Ok(_) => {
            let _ = upsert_individuals(&state.backend, &sim).await;
            (StatusCode::CREATED, Json(json!(sim))).into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn create_checkpoint(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let sim = row_to_state(&row);
    let checkpoint_id = Uuid::new_v4().to_string();
    let population_snapshot = serde_json::to_value(&sim).unwrap_or_else(|_| json!({}));
    let tech_state = json!(sim.discovered_techs);
    let belief_state = json!(sim.discovered_beliefs);
    let art_state = json!(sim.discovered_arts);
    let groups = sim.extra.get("groups").cloned().unwrap_or_else(|| json!([]));
    let stats = derive_stats(&sim);

    match insert_checkpoint(
        &state.backend,
        &checkpoint_id,
        &id,
        sim.current_day,
        sim.current_year,
        sim.alive_count() as i64,
        population_snapshot,
        serde_json::to_value(&sim.world_state).unwrap_or_else(|_| json!({})),
        tech_state,
        belief_state,
        art_state,
        groups,
        stats,
    )
    .await
    {
        Ok(()) => Json(json!({
            "id": checkpoint_id,
            "simulation_id": id,
            "sim_day": sim.current_day,
            "sim_year": sim.current_year,
            "population_count": sim.alive_count(),
        }))
        .into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn restore_checkpoint(
    State(state): State<AppState>,
    Path((id, checkpoint_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let checkpoint = match load_checkpoint(&state.backend, &checkpoint_id, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "checkpoint not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let mut sim: SimulationState = serde_json::from_value(checkpoint.population_snapshot.clone()).unwrap_or_default();
    sim.id = Some(id.clone());
    sim.current_day = checkpoint.sim_day as i32;
    sim.current_year = checkpoint.sim_year as i32;
    sim.status = Some("paused".to_string());

    match save_state(&state.backend, &sim).await {
        Ok(()) => {
            let _ = upsert_individuals(&state.backend, &sim).await;
            Json(json!({
                "message": "Checkpoint restored",
                "sim_day": checkpoint.sim_day,
                "sim_year": checkpoint.sim_year
            }))
            .into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn get_report(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    let checkpoints = list_checkpoints(&state.backend, &id).await.unwrap_or_default();
    let current_stats = derive_stats(&sim);
    let individuals: Vec<Value> = sim
        .individuals
        .iter()
        .map(|ind| {
            let age = age_years(ind, sim.current_day);
            let age_at_death = ind.death_day.map(|d| ((d - ind.birth_day).max(0) as f64) / 365.0);
            let ph = &ind.phenotype;
            json!({
                "id": ind.id,
                "name": ph.get("name").and_then(|v| v.as_str()).unwrap_or("Unnamed"),
                "sex": ind.sex,
                "is_founder": ind.is_founder,
                "birth_year": ind.birth_day / 365,
                "death_year": ind.death_day.map(|d| d / 365),
                "age_at_death": age_at_death,
                "death_cause": ind.extra.get("death_cause").cloned().unwrap_or(Value::Null),
                "is_dead": ind.is_dead || !ind.alive,
                "intelligence": ph.get("fluid_intelligence").and_then(|v| v.as_f64()).map(|v| (v * 100.0).round() / 100.0),
                "age_years": (age * 10.0).round() / 10.0,
            })
        })
        .collect();
    let population_history: Vec<Value> = checkpoints
        .iter()
        .map(|cp| {
            json!({
                "year": cp.sim_year,
                "day": cp.sim_day,
                "population": cp.population_count,
                "avg_age": cp.stats.get("avg_age").cloned(),
                "happiness_index": cp.stats.get("happiness_index").cloned(),
                "gini": cp.stats.get("gini").cloned(),
                "food_abundance": cp.stats.get("food_abundance").cloned(),
                "water_abundance": cp.stats.get("water_abundance").cloned(),
                "technologies": cp.tech_state,
                "beliefs": cp.belief_state,
                "centroid_x": cp.stats.get("centroid_x").cloned(),
                "centroid_y": cp.stats.get("centroid_y").cloned(),
                "season": cp.stats.get("season").cloned(),
                "weather": cp.stats.get("weather").cloned(),
                "deaths_total": cp.stats.get("deaths").cloned(),
                "births_total": cp.stats.get("births").cloned(),
                "sick_rate": cp.stats.get("sick_rate").cloned(),
                "word_count": cp.stats.get("word_count").cloned(),
                "max_language_stage": cp.stats.get("max_language_stage").cloned(),
                "avg_consciousness": cp.stats.get("avg_consciousness").cloned(),
                "qol_index": cp.stats.get("qol_index").cloned(),
            })
        })
        .collect();

    let tech_timeline: Vec<Value> = sim
        .discovered_techs
        .iter()
        .map(|tech| json!({ "name": tech, "year": sim.current_year, "day": sim.current_day }))
        .collect();
    let belief_timeline: Vec<Value> = sim
        .discovered_beliefs
        .iter()
        .map(|belief| json!({ "name": belief, "year": sim.current_year, "day": sim.current_day }))
        .collect();
    let art_timeline: Vec<Value> = sim
        .discovered_arts
        .iter()
        .map(|art| json!({ "name": art, "year": sim.current_year, "day": sim.current_day, "type": "art" }))
        .collect();
    let notable_events: Vec<Value> = sim
        .events
        .iter()
        .filter(|event| event.get("importance").and_then(|v| v.as_i64()).unwrap_or(1) >= 3)
        .cloned()
        .collect();
    let death_total = individuals.iter().filter(|i| i.get("is_dead").and_then(|v| v.as_bool()).unwrap_or(false)).count() as i64;
    let summary = json!({
        "civilization_name": sim.name,
        "total_years": sim.current_year,
        "total_days": sim.current_day,
        "start_coordinates": { "latitude": sim.start_latitude, "longitude": sim.start_longitude },
        "biome": sim.world_state.biome,
        "total_individuals_ever": individuals.len(),
        "peak_population": population_history.iter().map(|c| c.get("population").and_then(|v| v.as_i64()).unwrap_or(0)).max().unwrap_or(0),
        "peak_population_year": population_history.iter().max_by_key(|c| c.get("population").and_then(|v| v.as_i64()).unwrap_or(0)).and_then(|c| c.get("year")).cloned(),
        "current_population": current_stats.get("population").cloned(),
        "technologies_discovered": tech_timeline.len(),
        "technology_list": sim.discovered_techs.clone(),
        "beliefs_formed": belief_timeline.len(),
        "belief_list": sim.discovered_beliefs.clone(),
        "art_forms": art_timeline.len(),
        "language_stage": current_stats.get("max_language_stage").cloned(),
        "language_stage_name": "unknown",
        "vocabulary_size": current_stats.get("word_count").cloned(),
        "total_deaths": death_total,
        "avg_age_at_death_years": null,
        "infant_mortality_rate": null,
        "child_mortality_rate": null,
        "leading_cause_of_death": null,
        "migration_events": 0,
        "total_migration_distance_km": 0,
        "epidemic_count": notable_events.iter().filter(|e| e.get("event_type").and_then(|v| v.as_str()) == Some("epidemic")).count(),
        "disaster_count": notable_events.iter().filter(|e| e.get("event_type").and_then(|v| v.as_str()) == Some("disaster")).count(),
        "final_happiness_index": current_stats.get("happiness_index").cloned(),
        "final_gini": current_stats.get("gini").cloned(),
        "final_qol_index": current_stats.get("qol_index").cloned(),
        "report_generated_at": format!("{:?}", std::time::SystemTime::now()),
    });

    Json(json!({
        "simulation": {
            "id": sim.id,
            "name": sim.name,
            "status": sim.status,
            "start_latitude": sim.start_latitude,
            "start_longitude": sim.start_longitude,
            "biome": sim.world_state.biome,
            "current_year": sim.current_year,
            "current_day": sim.current_day,
            "created_at": null,
            "intervened": sim.extra.get("intervened").and_then(|v| v.as_bool()).unwrap_or(false),
        },
        "summary": summary,
        "current_stats": current_stats,
        "population_history": population_history,
        "technology_timeline": tech_timeline,
        "belief_timeline": belief_timeline,
        "art_timeline": art_timeline,
        "migration_history": [],
        "death_statistics": {
            "total": death_total,
            "avg_age_at_death": null,
            "by_cause": {},
            "by_age_group": {},
        },
        "individuals": individuals,
        "notable_events": notable_events,
        "all_events": sim.events.clone(),
        "generated_at": format!("{:?}", std::time::SystemTime::now()),
    }))
    .into_response()
}

async fn get_metrics(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    Json(json!({
        "current_day": sim.current_day,
        "current_year": sim.current_year,
        "population": sim.alive_count(),
        "speed_multiplier": sim.speed_multiplier.unwrap_or(1),
        "status": sim.status,
    }))
    .into_response()
}

async fn get_diagnostics(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };
    let sim = row_to_state(&row);
    let checkpoints = list_checkpoints(&state.backend, &id).await.unwrap_or_default();
    let latest_checkpoint = checkpoints.first();
    Json(json!({
        "status": "ok",
        "runtime": "rust",
        "population": sim.alive_count(),
        "current_day": sim.current_day,
        "current_year": sim.current_year,
        "checkpoint_count": checkpoints.len(),
        "event_count": sim.events.len(),
        "latest_checkpoint_world_state": latest_checkpoint.map(|cp| cp.world_state.clone()),
        "latest_checkpoint_art_state": latest_checkpoint.map(|cp| cp.art_state.clone()),
        "latest_checkpoint_groups": latest_checkpoint.map(|cp| cp.groups.clone()),
    }))
    .into_response()
}

async fn tick_simulation(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let mut sim = row_to_state(&row);
    let report = advance_one_day(&mut sim);
    let save_res = save_state(&state.backend, &sim).await;
    if let Err(err) = save_res {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response();
    }
    let _ = upsert_individuals(&state.backend, &sim).await;

    (StatusCode::OK, Json(json!({
        "report": report,
        "state": sim
    })))
        .into_response()
}

async fn start_simulation(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match update_simulation_fields(&state.backend, &id, Some("running"), None).await {
        Ok(Some(_)) => {
            state.runtime.start(state.backend.clone(), id.clone()).await;
            Json(json!({"message": "Simulation started"})).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn pause_simulation(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match update_simulation_fields(&state.backend, &id, Some("paused"), None).await {
        Ok(Some(_)) => {
            state.runtime.pause(&id).await;
            Json(json!({"message": "Simulation paused"})).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn complete_simulation(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match update_simulation_fields(&state.backend, &id, Some("completed"), None).await {
        Ok(Some(_)) => {
            state.runtime.pause(&id).await;
            Json(json!({"message": "Simulation completed"})).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct SpeedRequest {
    speed_multiplier: i32,
}

async fn set_speed(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<SpeedRequest>,
) -> impl IntoResponse {
    if !(1..=1000).contains(&payload.speed_multiplier) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Speed must be an integer between 1 and 1000"}))).into_response();
    }
    match update_simulation_fields(&state.backend, &id, None, Some(payload.speed_multiplier)).await {
        Ok(Some(sim)) => Json(json!({"speed_multiplier": sim.speed_multiplier.unwrap_or(1)})).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn fast_forward(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<FastForwardRequest>,
) -> impl IntoResponse {
    let target_year = payload.target_year;
    if target_year < 1 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "target_year must be a positive integer"}))).into_response();
    }

    let row = match load_simulation(&state.backend, &id).await {
        Ok(Some(row)) => row,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    };

    let sim = row_to_state(&row);
    let current_year = sim.current_day / 365;
    if target_year <= current_year {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Already past year {} (current: {})", target_year, current_year)}))).into_response();
    }

    let target_day = target_year * 365;
    state.runtime.fast_forward(&id, target_day).await;
    Json(json!({
        "message": format!("Fast-forwarding to year {} (day {})", target_year, target_day),
        "current_year": current_year,
        "target_year": target_year
    }))
    .into_response()
}

async fn cancel_fast_forward(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    state.runtime.cancel_fast_forward(&id).await;
    Json(json!({"message": "Fast-forward cancelled"})).into_response()
}

async fn terminate_simulation(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match delete_simulation(&state.backend, &id).await {
        Ok(true) => {
            state.runtime.terminate(&id).await;
            Json(json!({"message": "Simulation terminated"})).into_response()
        }
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

async fn delete_simulation_route(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match delete_simulation(&state.backend, &id).await {
        Ok(true) => {
            state.runtime.terminate(&id).await;
            Json(json!({"message": "Simulation deleted"})).into_response()
        }
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"error": "simulation not found"}))).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": err.to_string()}))).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct CreateSimulationRequest {
    pub user_id: Option<String>,
    pub name: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    #[serde(default)]
    pub founder_1_params: Value,
    #[serde(default)]
    pub founder_2_params: Value,
}

#[derive(Debug, Deserialize)]
struct FastForwardRequest {
    target_year: i32,
}

fn allele(value: Option<f64>) -> Value {
    let v = value.unwrap_or(0.5).clamp(0.05, 0.95);
    json!({ "a1": v, "a2": v })
}

fn derive_stats(sim: &SimulationState) -> Value {
    let alive_count = sim.alive_count();
    let total = sim.individuals.len();
    let avg_age = if total > 0 {
        let sum: f64 = sim
            .individuals
            .iter()
            .map(|ind| age_years(ind, sim.current_day))
            .sum();
        Some((sum / total as f64 * 10.0).round() / 10.0)
    } else {
        None
    };
    let max_language_stage = sim
        .individuals
        .iter()
        .filter_map(|ind| ind.language.get("stage").and_then(|v| v.as_i64()))
        .max()
        .unwrap_or(0);

    json!({
        "day": sim.current_day,
        "year": sim.current_year,
        "population": alive_count,
        "total_population": total,
        "avg_age": avg_age,
        "max_language_stage": max_language_stage,
        "word_count": sim.events.len(),
        "happiness_index": sim.extra.get("happiness_index").cloned().unwrap_or_else(|| json!(0.5)),
        "gini": sim.extra.get("gini").cloned().unwrap_or_else(|| json!(0.0)),
        "qol_index": sim.extra.get("qol_index").cloned().unwrap_or_else(|| json!(0.5)),
        "season": sim.world_state.season,
        "weather": sim.world_state.extra.get("current_weather").cloned().unwrap_or_else(|| json!("clear")),
    })
}

fn age_years(ind: &Individual, current_day: i32) -> f64 {
    let age_day = if ind.is_dead {
        ind.death_day.unwrap_or(current_day)
    } else {
        current_day
    };
    ((age_day - ind.birth_day).max(0) as f64) / 365.0
}

fn life_stage(age_years: f64) -> &'static str {
    if age_years < 2.0 {
        "infant"
    } else if age_years < 12.0 {
        "child"
    } else if age_years < 18.0 {
        "adolescent"
    } else if age_years < 45.0 {
        "adult"
    } else {
        "elder"
    }
}

fn serialize_individual(ind: &Individual, current_day: i32) -> Value {
    let age = age_years(ind, current_day);
    let name = ind
        .phenotype
        .get("name")
        .and_then(|v| v.as_str())
        .or_else(|| ind.extra.get("name").and_then(|v| v.as_str()))
        .map(|s| s.to_string());
    json!({
        "id": ind.id,
        "name": name,
        "sex": ind.sex,
        "birth_day": ind.birth_day,
        "death_day": ind.death_day,
        "alive": ind.alive && !ind.is_dead,
        "age_years": (age * 10.0).round() / 10.0,
        "x": ind.x,
        "y": ind.y,
        "parent_1_id": ind.parent_1_id,
        "parent_2_id": ind.parent_2_id,
        "death_cause": ind.extra.get("death_cause").cloned().unwrap_or(Value::Null),
        "genome": ind.genome,
        "phenotype": ind.phenotype,
        "epigenome": ind.epigenome,
        "health": ind.health,
        "mind": ind.mind,
        "psychology": ind.psychology,
        "social": ind.social,
        "skills": ind.skills,
        "beliefs": ind.beliefs,
        "language": ind.language,
        "memory": ind.memory,
        "inventory": ind.inventory,
        "inbreeding_coeff": ind.inbreeding_coeff.unwrap_or(0.0),
        "is_founder": ind.is_founder,
        "life_stage": life_stage(age),
    })
}

fn create_world_state(latitude: f64, longitude: f64) -> Value {
    let biome_key = get_biome(latitude, longitude);
    let (temp_min, temp_max, food_base, water_base, predator_risk) = match biome_key {
        "tropical_rainforest" => (22.0, 30.0, 0.90, 0.95, 0.40),
        "tropical_savanna" => (20.0, 32.0, 0.70, 0.50, 0.50),
        "desert" => (5.0, 45.0, 0.20, 0.10, 0.20),
        "mediterranean" => (8.0, 30.0, 0.75, 0.65, 0.20),
        "temperate_forest" => (-5.0, 25.0, 0.70, 0.75, 0.25),
        "grassland" => (-10.0, 30.0, 0.60, 0.40, 0.35),
        "boreal_forest" => (-30.0, 20.0, 0.50, 0.70, 0.30),
        "tundra" => (-40.0, 10.0, 0.20, 0.60, 0.20),
        "mountain" => (-20.0, 15.0, 0.40, 0.80, 0.30),
        "coastal" => (5.0, 25.0, 0.85, 0.90, 0.15),
        _ => (8.0, 30.0, 0.75, 0.65, 0.20),
    };

    let phonology_seed = ((latitude * 100.0).round() as i64 * 31 + (longitude * 100.0).round() as i64 * 17 + 1277).rem_euclid(10_000);
    json!({
        "latitude": latitude,
        "longitude": longitude,
        "biome": biome_key,
        "temperature": (temp_min + temp_max) / 2.0,
        "food_abundance": food_base,
        "water_abundance": water_base,
        "predator_risk": predator_risk,
        "disease_pressure": 0.1,
        "season": "spring",
        "day_of_year": 0,
        "year": 0,
        "natural_disaster": null,
        "flora": { "density": food_base * 0.8 },
        "fauna": { "prey_density": food_base * 0.6, "predator_density": predator_risk },
        "human_impact": 0,
        "phonology_seed": phonology_seed,
        "current_weather": "clear",
        "weather_intensity": 0.5,
        "weather_days_remaining": 5,
        "weather_move_mult": 1.0,
        "weather_hp_delta": 0.0,
        "weather_cold_risk": false,
        "weather_heat_risk": false,
        "_weather_water_delta": 0.0,
        "_weather_food_delta": 0.0
    })
}

fn get_biome(latitude: f64, longitude: f64) -> &'static str {
    let abs_lat = latitude.abs();
    let lon_mod = longitude.rem_euclid(90.0).abs();
    let coastal = lon_mod < 20.0 || lon_mod > 70.0;
    let continental = (35.0..=55.0).contains(&lon_mod);

    if abs_lat < 10.0 { return if coastal { "coastal" } else { "tropical_rainforest" }; }
    if abs_lat < 20.0 { return if continental { "tropical_savanna" } else { "tropical_rainforest" }; }
    if abs_lat < 30.0 { return if coastal { "coastal" } else if continental { "desert" } else { "tropical_savanna" }; }
    if abs_lat < 45.0 { return if coastal { "mediterranean" } else if continental { "grassland" } else { "temperate_forest" }; }
    if abs_lat < 60.0 { return if coastal { "temperate_forest" } else if continental { "grassland" } else { "boreal_forest" }; }
    if abs_lat < 70.0 { return "boreal_forest"; }
    "tundra"
}

fn compute_simple_phenotype(genome: &Value) -> Value {
    let avg = |keys: &[&str], fallback: f64| -> f64 {
        let mut total = 0.0;
        let mut count = 0.0;
        for key in keys {
            if let Some(v) = genome.get(*key) {
                let a1 = v.get("a1").and_then(|x| x.as_f64()).unwrap_or(fallback);
                let a2 = v.get("a2").and_then(|x| x.as_f64()).unwrap_or(fallback);
                total += (a1 + a2) / 2.0;
                count += 1.0;
            }
        }
        if count > 0.0 { total / count } else { fallback }
    };

    json!({
        "fluid_intelligence": avg(&["BDNF_01","COMT_01","DTNBP1_01","NRG1_01","DISC1_01"], 0.70),
        "working_memory": avg(&["BDNF_01","COMT_01"], 0.68),
        "conscientiousness": avg(&["DISC1_01","COMT_01"], 0.65),
        "learning_rate": avg(&["ADRA2B_01","BDNF_01","COMT_01"], 0.70),
        "neural_plasticity": avg(&["BDNF_01"], 0.72),
        "language_capacity": avg(&["FOXP2_01","CNTNAP2_01"], 0.78),
        "language_learning": avg(&["FOXP2_01"], 0.76),
        "social_bonding": avg(&["OXTR_01"], 0.82),
        "social_drive": avg(&["AVPR1A_01"], 0.78),
        "oxytocin_sensitivity": avg(&["OXTR_01"], 0.82),
        "empathy": avg(&["OXTR_01","RELN_01"], 0.80),
        "cooperation": avg(&["AVPR1A_01","OXTR_01"], 0.80),
        "altruism": avg(&["OXTR_01"], 0.75),
        "parental_care": avg(&["OXTR_01","AVPR1A_01"], 0.80),
        "aggression": avg(&["MAOA_01"], 0.25),
        "dominance": avg(&["DRD2_01","MAOA_01","DISC1_01"], 0.35),
        "curiosity": avg(&["DRD4_01"], 0.60),
        "risk_tolerance": avg(&["CACNA1C_01","DRD4_01"], 0.42),
        "innovation": avg(&["CACNA1C_01","NRG1_01","BDNF_01"], 0.60),
        "artistic_sense": avg(&["NRG1_01","DRD4_01"], 0.55),
        "independence": avg(&["DRD4_01"], 0.45),
        "xenophobia": 0.2,
        "serotonin": 0.6,
        "stress_resilience": avg(&["SLC6A4_01"], 0.62),
        "health_resilience": avg(&["IMMUNE_01","IMMUNE_02"], 0.85),
        "anxiety": 0.3,
        "physical_strength": avg(&["STRENGTH_01"], 0.72),
        "physical_endurance": avg(&["ACTN3_01","METABOLISM_01","STRENGTH_01"], 0.68),
        "endurance": avg(&["ACTN3_01","METABOLISM_01","STRENGTH_01"], 0.68),
        "metabolism": avg(&["METABOLISM_01"], 0.58),
        "immune_strength": avg(&["IMMUNE_01","IMMUNE_02"], 0.84),
        "height_factor": avg(&["HEIGHT_01","HEIGHT_02","HEIGHT_03"], 0.6),
        "muscle_fiber_type": 0.55,
        "memory_consolidation": avg(&["BDNF_01","COMT_01"], 0.65),
        "novelty_seeking": avg(&["DRD4_01"], 0.55),
        "consciousness_potential": avg(&["NRXN1_01","SHANK3_01","RELN_01"], 0.78),
        "belief_capacity": avg(&["NRXN1_01","SHANK3_01"], 0.6),
        "self_awareness": avg(&["NRXN1_01","SHANK3_01"], 0.68),
        "religiosity": 0.35,
        "fertility": avg(&["FSHR_01"], 0.70),
        "max_lifespan": avg(&["TERT_01","APOE_01"], 0.80) * 100.0,
        "eye_color": "brown",
        "hair_color": "dark",
        "skin_tone": "olive"
    })
}

fn create_founder(
    params: &Value,
    sex: &str,
    x: f64,
    y: f64,
    age_years: i32,
    is_founder: bool,
    simulation_id: &str,
    parent_1_id: Option<String>,
    parent_2_id: Option<String>,
) -> Individual {
    let mut genome = params.get("genome").cloned().unwrap_or_else(|| json!({}));

    if let Some(obj) = genome.as_object_mut() {
        for (key, value) in [
            ("OXTR_01", 0.82), ("AVPR1A_01", 0.78), ("IMMUNE_01", 0.88), ("IMMUNE_02", 0.85),
            ("TERT_01", 0.85), ("APOE_01", 0.80), ("FOXP2_01", 0.90), ("CNTNAP2_01", 0.82),
            ("BDNF_01", 0.80), ("COMT_01", 0.78), ("DTNBP1_01", 0.80), ("NRXN1_01", 0.82),
            ("SHANK3_01", 0.80), ("RELN_01", 0.80), ("DRD4_01", 0.75), ("DRD2_01", 0.75),
            ("STRENGTH_01", 0.78), ("ACTN3_01", 0.76), ("FSHR_01", 0.70),
        ] {
            obj.insert(key.to_string(), allele(Some(value)));
        }
    }

    if let Some(custom) = params.get("genome").and_then(|v| v.as_object()) {
        if let Some(obj) = genome.as_object_mut() {
            for (k, v) in custom {
                obj.insert(k.clone(), v.clone());
            }
        }
    }

    let mut phenotype = compute_simple_phenotype(&genome);
    if let Some(name) = params.get("name").and_then(|v| v.as_str()) {
        if let Some(obj) = phenotype.as_object_mut() {
            obj.insert("name".to_string(), Value::String(name.trim().to_string()));
        }
    }

    let appearance = params.get("appearance").cloned().unwrap_or_else(|| json!({}));
    let id = Uuid::new_v4().to_string();
    let mut individual = Individual {
        id,
        simulation_id: Some(simulation_id.to_string()),
        birth_day: -age_years * 365,
        death_day: None,
        alive: true,
        is_dead: false,
        is_founder,
        sex: sex.to_string(),
        x,
        y,
        age_days: None,
        generation: Some(0),
        group_id: None,
        home_x: Some(x),
        home_y: Some(y),
        parent_1_id,
        parent_2_id,
        known_techs: vec!["swimming".to_string()],
        genome,
        phenotype,
        epigenome: json!({}),
        health: json!({
            "hp": if is_founder { 1.0 } else { 0.4 },
            "max_hp": 1.0,
            "calories": 1.0,
            "hydration": 1.0,
            "disease": null,
            "disease_resistance": 0.85,
            "injuries": [],
            "pregnancy": null,
            "pregnancy_day": null
        }),
        mind: json!({
            "fluid_intelligence": 0.72,
            "working_memory": 0.70,
            "consciousness": 0.0,
            "death_awareness": false,
            "belief_capacity": 0.60,
            "emotional_state": 0.5,
            "stress": 0.0,
            "_volatile": {
                "satiation": 1.0,
                "mating_urge": 0.0,
                "age": (age_years * 365) as i32,
                "_waterFear": if is_founder { 0.35 } else { 0.0 },
                "_fears": {},
                "_waterExperience": 0.0,
                "known_techs": ["swimming"],
                "_experience": {},
                "generation": 0
            }
        }),
        social: json!({
            "group_id": null,
            "relationships": {},
            "reputation": 0.5,
            "status": 0,
            "has_mate": false,
            "mate_id": null,
            "children_ids": []
        }),
        skills: json!([]),
        beliefs: json!([]),
        language: json!({
            "stage": 0,
            "stage_name": "pre-linguistic",
            "vocabulary": {},
            "grammar": false,
            "writing": false,
            "foxp2_expression": 0.7
        }),
        memory: json!({ "social": [], "events": [], "knowledge": [] }),
        psychology: json!({
            "mental_state": "calm",
            "wellbeing": 0.6,
            "stress_level": 0.0,
            "trauma_events": [],
            "theory_of_mind": 0,
            "attachment_style": "secure"
        }),
        inventory: json!({}),
        inbreeding_coeff: Some(0.0),
        extra: Default::default(),
    };

    if let Some(obj) = appearance.as_object() {
        if let Some(p) = individual.phenotype.as_object_mut() {
            for (key, value) in obj {
                p.insert(key.clone(), value.clone());
            }
        }
    }

    individual
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::{to_bytes, Body}, http::Request, Router};
    use serde_json::{json, Value};
    use sqlx::sqlite::SqlitePoolOptions;
    use tower::ServiceExt;

    async fn test_state() -> AppState {
        let db_path = std::env::temp_dir().join(format!("anatolia-sim-test-{}.db", uuid::Uuid::new_v4()));
        let db_path = db_path.to_string_lossy().replace('\\', "/");
        let sqlite_url = format!("sqlite:///{}?mode=rwc", db_path);
        let pool = SqlitePoolOptions::new()
            .max_connections(4)
            .connect(&sqlite_url)
            .await
            .expect("sqlite pool");
        let backend = crate::db::DbBackend::Sqlite(pool);
        crate::db::migrate(&backend).await.expect("migrate");
        AppState {
            backend,
            runtime: std::sync::Arc::new(crate::runtime::RuntimeManager::new()),
        }
    }

    fn test_app(state: AppState) -> Router {
        Router::new()
            .route("/api/health", axum::routing::get(health))
            .route("/api/system/status", axum::routing::get(system_status))
            .nest("/api/simulations", simulation_routes())
            .with_state(state)
    }

    async fn body_json(response: axum::response::Response) -> Value {
        let bytes = to_bytes(response.into_body(), usize::MAX).await.expect("body bytes");
        serde_json::from_slice(&bytes).expect("json body")
    }

    #[tokio::test]
    async fn health_reports_rust_runtime() {
        let app = test_app(test_state().await);
        let response = app
            .oneshot(Request::builder().uri("/api/health").body(Body::empty()).unwrap())
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let body = body_json(response).await;
        assert_eq!(body["runtime"], "rust");
        assert_eq!(body["status"], "ok");
    }

    #[tokio::test]
    async fn create_tick_and_metrics_work() {
        let app = test_app(test_state().await);
        let create_payload = json!({
            "name": "Integration Sim",
            "latitude": 41.0,
            "longitude": 29.0,
            "founder_1_params": {},
            "founder_2_params": {}
        });

        let create_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/simulations")
                    .header("content-type", "application/json")
                    .body(Body::from(create_payload.to_string()))
                    .unwrap(),
            )
            .await
            .expect("create response");
        assert_eq!(create_response.status(), StatusCode::CREATED);
        let created = body_json(create_response).await;
        let sim_id = created["id"].as_str().expect("simulation id").to_string();
        assert_eq!(created["current_day"], 0);
        assert_eq!(created["individuals"].as_array().map(|a| a.len()), Some(2));

        let tick_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/tick"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("tick response");
        assert_eq!(tick_response.status(), StatusCode::OK);
        let ticked = body_json(tick_response).await;
        assert_eq!(ticked["report"]["current_day"], 1);

        let metrics_response = app
            .oneshot(
                Request::builder()
                    .uri(format!("/api/simulations/{sim_id}/metrics"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("metrics response");
        assert_eq!(metrics_response.status(), StatusCode::OK);
        let metrics = body_json(metrics_response).await;
        assert_eq!(metrics["current_day"], 1);
    }

    async fn create_simulation(app: &Router) -> String {
        let payload = json!({
            "name": "Lifecycle Sim",
            "latitude": 41.0,
            "longitude": 29.0,
            "founder_1_params": {},
            "founder_2_params": {}
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/simulations")
                    .header("content-type", "application/json")
                    .body(Body::from(payload.to_string()))
                    .unwrap(),
            )
            .await
            .expect("create response");
        assert_eq!(response.status(), StatusCode::CREATED);
        let body = body_json(response).await;
        body["id"].as_str().expect("simulation id").to_string()
    }

    #[tokio::test]
    async fn lifecycle_endpoints_update_state_and_delete() {
        let app = test_app(test_state().await);
        let sim_id = create_simulation(&app).await;

        let start_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/start"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("start response");
        assert_eq!(start_response.status(), StatusCode::OK);

        let running = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/simulations/{sim_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("get running sim");
        let running_body = body_json(running).await;
        assert_eq!(running_body["status"], "running");

        let pause_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/pause"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("pause response");
        assert_eq!(pause_response.status(), StatusCode::OK);

        let paused = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/simulations/{sim_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("get paused sim");
        let paused_body = body_json(paused).await;
        assert_eq!(paused_body["status"], "paused");

        let terminate_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/terminate"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("terminate response");
        assert_eq!(terminate_response.status(), StatusCode::OK);

        let missing = app
            .oneshot(
                Request::builder()
                    .uri(format!("/api/simulations/{sim_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("get deleted sim");
        assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn checkpoint_restore_roundtrip_works() {
        let app = test_app(test_state().await);
        let sim_id = create_simulation(&app).await;

        async fn tick_once(app: Router, sim_id: String) {
            let response = app
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri(format!("/api/simulations/{sim_id}/tick"))
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .expect("tick response");
            assert_eq!(response.status(), StatusCode::OK);
        }

        tick_once(app.clone(), sim_id.clone()).await;

        let checkpoint_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/checkpoint"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("checkpoint response");
        assert_eq!(checkpoint_response.status(), StatusCode::OK);
        let checkpoint_body = body_json(checkpoint_response).await;
        let checkpoint_id = checkpoint_body["id"].as_str().expect("checkpoint id").to_string();
        assert_eq!(checkpoint_body["sim_day"], 1);

        tick_once(app.clone(), sim_id.clone()).await;

        let before_restore = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/simulations/{sim_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("get before restore");
        let before_restore_body = body_json(before_restore).await;
        assert_eq!(before_restore_body["current_day"], 2);

        let restore_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/restore/{checkpoint_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("restore response");
        assert_eq!(restore_response.status(), StatusCode::OK);

        let restored = app
            .oneshot(
                Request::builder()
                    .uri(format!("/api/simulations/{sim_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("get restored sim");
        let restored_body = body_json(restored).await;
        assert_eq!(restored_body["current_day"], 1);
        assert_eq!(restored_body["status"], "paused");
    }

    #[tokio::test]
    async fn fast_forward_and_cancel_work() {
        let app = test_app(test_state().await);
        let sim_id = create_simulation(&app).await;

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/fast-forward"))
                    .header("content-type", "application/json")
                    .body(Body::from(json!({ "target_year": 3 }).to_string()))
                    .unwrap(),
            )
            .await
            .expect("fast forward response");
        assert_eq!(response.status(), StatusCode::OK);
        let body = body_json(response).await;
        assert_eq!(body["target_year"], 3);

        let cancel = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/simulations/{sim_id}/fast-forward/cancel"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("cancel response");
        assert_eq!(cancel.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn health_endpoint_handles_concurrent_requests() {
        let app = test_app(test_state().await);
        let mut tasks = tokio::task::JoinSet::new();
        for _ in 0..12 {
            let clone = app.clone();
            tasks.spawn(async move {
                let response = clone
                    .oneshot(Request::builder().uri("/api/health").body(Body::empty()).unwrap())
                    .await
                    .expect("health response");
                assert_eq!(response.status(), StatusCode::OK);
                let body = body_json(response).await;
                assert_eq!(body["runtime"], "rust");
            });
        }

        while let Some(result) = tasks.join_next().await {
            result.expect("task should not panic");
        }
    }
}
