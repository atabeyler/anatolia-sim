use serde_json::{json, Map, Value};
use uuid::Uuid;

use crate::state::Individual;

use super::genome::{combine_gametes, compute_phenotype, create_gamete, create_genome};

pub fn get_age(individual: &Individual, current_day: i32) -> f64 {
    (current_day - individual.birth_day) as f64 / 365.0
}

pub fn get_life_stage(individual: &Individual, current_day: i32) -> &'static str {
    let age = get_age(individual, current_day);
    if age < 2.0 {
        "infant"
    } else if age < 12.0 {
        "child"
    } else if age < 18.0 {
        "adolescent"
    } else if age < 45.0 {
        "adult"
    } else {
        "elder"
    }
}

pub fn is_fertile(individual: &Individual, current_day: i32) -> bool {
    let age = get_age(individual, current_day);
    match individual.sex.as_str() {
        "female" => (15.0..=50.0).contains(&age),
        "male" => (15.0..=65.0).contains(&age),
        _ => false,
    }
}

pub fn create_founder(params: &Value) -> Individual {
    let sex = params.get("sex").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let age_years = params.get("ageYears").and_then(|v| v.as_i64()).unwrap_or(20) as i32;
    let x = params.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let y = params.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let mut genome_overrides = Map::new();
    if let Some(obj) = params.get("genome").and_then(|v| v.as_object()) {
        genome_overrides.extend(obj.iter().map(|(k, v)| (k.clone(), v.clone())));
    }
    let genome = create_genome(Some(&genome_overrides));
    let mut phenotype = compute_phenotype(&genome);
    if let Some(name) = params.get("name").and_then(|v| v.as_str()) {
        if let Some(obj) = phenotype.as_object_mut() {
            obj.insert("name".to_string(), Value::String(name.trim().to_string()));
        }
    }
    let appearance = params.get("appearance").and_then(|v| v.as_object()).cloned().unwrap_or_default();

    Individual {
        id: Uuid::new_v4().to_string(),
        simulation_id: None,
        birth_day: -age_years * 365,
        death_day: None,
        alive: true,
        is_dead: false,
        is_founder: true,
        sex,
        x,
        y,
        age_days: None,
        generation: Some(0),
        group_id: None,
        home_x: Some(x),
        home_y: Some(y),
        parent_1_id: None,
        parent_2_id: None,
        known_techs: vec!["swimming".to_string()],
        genome,
        phenotype,
        epigenome: Value::Object(Map::new()),
        health: json!({
            "hp": 1.0,
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
                "age": age_years * 365,
                "_waterFear": 0.35,
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
            "wellbeing": 0.7,
            "stress_level": 0.1,
            "theory_of_mind": 0
        }),
        inventory: json!({}),
        inbreeding_coeff: Some(0.0),
        extra: appearance
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect(),
    }
}

pub fn create_child(parent1: &Individual, parent2: &Individual, birth_day: i32, simulation_id: &str) -> Individual {
    let sex = if rand::random::<f64>() < 0.5 { "male" } else { "female" }.to_string();
    let p1_stress = parent1
        .epigenome
        .get("BDNF_PROMOTER")
        .and_then(|v| v.get("methylation"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.5);
    let p2_stress = parent2
        .epigenome
        .get("BDNF_PROMOTER")
        .and_then(|v| v.get("methylation"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.5);
    let stress_mult = 1.0 + p1_stress.max(p2_stress) * 0.5;
    let genome = combine_gametes(
        &create_gamete(&parent1.genome, stress_mult),
        &create_gamete(&parent2.genome, stress_mult),
        &sex,
    );
    let mut phenotype = compute_phenotype(&genome);
    if let Some(obj) = phenotype.as_object_mut() {
        obj.insert("name".to_string(), Value::Null);
    }

    let child = Individual {
        id: Uuid::new_v4().to_string(),
        simulation_id: Some(simulation_id.to_string()),
        birth_day,
        death_day: None,
        alive: true,
        is_dead: false,
        is_founder: false,
        sex,
        x: parent1.x,
        y: parent1.y,
        age_days: None,
        generation: Some(parent1.generation.unwrap_or(0).max(parent2.generation.unwrap_or(0)) + 1),
        group_id: None,
        home_x: Some(parent1.x),
        home_y: Some(parent1.y),
        parent_1_id: Some(parent1.id.clone()),
        parent_2_id: Some(parent2.id.clone()),
        known_techs: vec![],
        genome,
        phenotype,
        epigenome: Value::Object(Map::new()),
        health: json!({
            "hp": 0.4,
            "max_hp": 1.0,
            "calories": 0.8,
            "hydration": 1.0,
            "disease": null,
            "disease_resistance": parent1.phenotype.get("immune_strength").and_then(|v| v.as_f64()).unwrap_or(0.85),
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
                "age": 0,
                "_waterFear": ((parent1.extra.get("_waterFear").and_then(|v| v.as_f64()).unwrap_or(0.0)
                    + parent2.extra.get("_waterFear").and_then(|v| v.as_f64()).unwrap_or(0.0)) / 2.0) * 0.45,
                "_fears": {},
                "_waterExperience": 0.0,
                "known_techs": [],
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
            "foxp2_expression": 0.1
        }),
        memory: json!({ "social": [], "events": [], "knowledge": [] }),
        psychology: json!({
            "mental_state": "calm",
            "wellbeing": 0.7,
            "stress_level": 0.1,
            "theory_of_mind": 0
        }),
        inventory: json!({}),
        inbreeding_coeff: Some(0.0),
        extra: Map::new(),
    };

    child
}
