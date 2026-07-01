use serde_json::{json, Value};

pub const PATHOGEN_TYPES: &[(&str, &str, f64, i32, i32, i32, i32, Option<&[&str]>)] = &[
    ("wound_infection", "contact", 0.12, 14, 60, 2, 180, None),
    ("intestinal_parasite", "fecal_oral", 0.05, 30, 365 * 3, 5, 365, None),
    ("respiratory_common", "airborne", 0.02, 14, 180, 4, 365, None),
    ("fungal_skin", "contact", 0.01, 30, 180, 4, 500, None),
    ("fever_tick", "vector", 0.08, 10, 365 * 2, 3, 730, Some(&["grassland", "temperate_forest"])),
    ("malaria_like", "vector", 0.10, 14, 365, 3, 730, Some(&["tropical_rainforest", "tropical_savanna", "coastal"])),
    ("pneumonia_like", "airborne", 0.15, 21, 365 * 2, 8, 1000, None),
    ("cholera_like", "water", 0.30, 7, 365 * 5, 20, 1500, None),
    ("plague_like", "airborne", 0.40, 10, 365 * 10, 30, 2000, None),
];

pub fn process_microbiome_tick(population: &mut [crate::state::Individual], world_state: &Value, sim_day: i32) -> Vec<Value> {
    let mut events = Vec::new();
    let alive_count = population.iter().filter(|i| !i.is_dead).count();
    for ind in population.iter_mut().filter(|i| !i.is_dead) {
        dedupe_infections(ind);
    }
    if sim_day >= 180 && alive_count >= 8 {
        for (pathogen_id, transmission, base_mortality, duration_days, immunity_duration, density_threshold, min_day, biomes) in PATHOGEN_TYPES {
            if alive_count < *density_threshold as usize || sim_day < *min_day {
                continue;
            }
            if let Some(biomes) = biomes {
                if !biomes.contains(&world_state.get("biome").and_then(Value::as_str).unwrap_or("")) {
                    continue;
                }
            }
            let mut new_cases = 0;
            for individual in population.iter_mut().filter(|i| !i.is_dead) {
                if has_pathogen(individual, pathogen_id) || immune_until(individual, pathogen_id) > sim_day {
                    continue;
                }
                if rand::random::<f64>() < exposure_probability(individual, transmission, alive_count, world_state) {
                    let infections = individual
                        .extra
                        .entry("infections".to_string())
                        .or_insert_with(|| json!([]));
                    if let Some(arr) = infections.as_array_mut() {
                        arr.push(json!({ "pathogen_id": pathogen_id, "days_remaining": duration_days, "infected_day": sim_day }));
                    }
                    new_cases += 1;
                }
            }
            if new_cases > 0 {
                events.push(json!({
                    "type": "epidemic_outbreak",
                    "pathogen_id": pathogen_id,
                    "initial_cases": new_cases,
                    "day": sim_day,
                    "importance": if *base_mortality > 0.2 { "high" } else { "medium" }
                }));
            }
            let _ = immunity_duration;
        }
    }
    events
}

fn has_pathogen(individual: &crate::state::Individual, pathogen_id: &str) -> bool {
    individual
        .extra
        .get("infections")
        .and_then(Value::as_array)
        .map(|arr| arr.iter().any(|inf| inf.get("pathogen_id").and_then(Value::as_str) == Some(pathogen_id)))
        .unwrap_or(false)
}

fn immune_until(individual: &crate::state::Individual, pathogen_id: &str) -> i32 {
    individual
        .extra
        .get("immunities")
        .and_then(|v| v.get(pathogen_id))
        .and_then(Value::as_i64)
        .unwrap_or(0) as i32
}

fn exposure_probability(individual: &crate::state::Individual, transmission: &str, alive_count: usize, world_state: &Value) -> f64 {
    let population_scale = (alive_count as f64 / 25.0).clamp(0.2, 1.0);
    let base = 0.00008 * population_scale;
    match transmission {
        "water" => base * (1.0 + (1.0 - individual.health.get("hydration").and_then(Value::as_f64).unwrap_or(0.8)).max(0.0) * 2.0),
        "fecal_oral" => base * if individual.group_id.is_some() { 1.5 } else { 0.6 },
        "airborne" => base * if individual.group_id.is_some() { 2.0 } else { 0.4 },
        "vector" => base * if world_state.get("season").and_then(Value::as_str) == Some("summer") { 2.0 } else { 1.0 },
        "contact" => base * (1.0 + (0.5 - individual.health.get("hp").and_then(Value::as_f64).unwrap_or(0.5)).max(0.0) * 3.0),
        _ => base,
    }
}

fn dedupe_infections(individual: &mut crate::state::Individual) {
    if let Some(infections) = individual.extra.get_mut("infections").and_then(Value::as_array_mut) {
        let mut by_path = std::collections::HashMap::new();
        for infection in infections.iter().filter_map(Value::as_object) {
            if let Some(pathogen_id) = infection.get("pathogen_id").and_then(Value::as_str) {
                let remaining = infection.get("days_remaining").and_then(Value::as_i64).unwrap_or(0);
                match by_path.get(pathogen_id).cloned() {
                    Some(prev) if prev >= remaining => {}
                    _ => {
                        by_path.insert(pathogen_id.to_string(), remaining);
                    }
                }
            }
        }
        *infections = by_path
            .into_iter()
            .map(|(pathogen_id, days_remaining)| json!({ "pathogen_id": pathogen_id, "days_remaining": days_remaining }))
            .collect();
    }
}

pub fn spread_infection(_infected: &crate::state::Individual, _susceptible: &mut crate::state::Individual, _pathogen_id: &str, _sim_day: i32, _alive_count: usize) -> bool {
    false
}

pub fn update_gut_microbiome(individual: &mut crate::state::Individual, world_state: &Value) {
    let diversity = individual
        .extra
        .get("microbiome")
        .and_then(|v| v.get("diversity"))
        .and_then(Value::as_f64)
        .unwrap_or(0.5);
    let food = world_state.get("food_abundance").and_then(Value::as_f64).unwrap_or(0.5);
    let immune_boost = individual.phenotype.get("immune_strength").and_then(Value::as_f64).unwrap_or(0.5) * 0.15;
    let new_diversity = (diversity * 0.95 + (food * 0.5 + immune_boost).min(1.0) * 0.05).min(1.0);
    individual
        .extra
        .insert("microbiome".to_string(), json!({ "diversity": new_diversity, "composition": {} }));
    individual
        .health
        .as_object_mut()
        .map(|health| health.insert("microbiome_immunity".to_string(), json!((new_diversity * 0.3).min(0.3))));
}

pub fn compute_health_stats(population: &[crate::state::Individual]) -> Value {
    let living: Vec<_> = population.iter().filter(|i| !i.is_dead).collect();
    if living.is_empty() {
        return json!({ "sick_count": 0, "sick_rate": 0.0, "pathogen_diversity": 0 });
    }
    let sick: Vec<_> = living
        .iter()
        .filter(|i| i.extra.get("infections").and_then(Value::as_array).map(|a| !a.is_empty()).unwrap_or(false))
        .collect();
    let mut pathogens = std::collections::HashSet::new();
    for individual in &sick {
        if let Some(arr) = individual.extra.get("infections").and_then(Value::as_array) {
            for infection in arr {
                if let Some(pid) = infection.get("pathogen_id").and_then(Value::as_str) {
                    pathogens.insert(pid.to_string());
                }
            }
        }
    }
    json!({
        "sick_count": sick.len(),
        "sick_rate": sick.len() as f64 / living.len() as f64,
        "pathogen_diversity": pathogens.len()
    })
}
