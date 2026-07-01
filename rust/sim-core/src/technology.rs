use std::collections::HashSet;

use crate::state::Individual;

use serde_json::json;

pub const TECH_TREE: &[(&str, i32, &[&str], f64, f64, &str, Option<i32>)] = &[
    ("fire_making", 0, &[], 0.8, 0.3, "any", None),
    ("stone_tools", 0, &[], 0.6, 0.25, "any", None),
    ("foraging", 0, &[], 0.3, 0.2, "any", None),
    ("hunting_spear", 1, &["stone_tools"], 1.2, 0.35, "fauna_present", None),
    ("shelter_basic", 1, &[], 0.9, 0.3, "cold_or_rain", None),
    ("water_container", 1, &["stone_tools"], 1.0, 0.3, "water_need", None),
    ("animal_trap", 1, &["stone_tools"], 1.3, 0.4, "fauna_present", None),
    ("clothing_basic", 1, &[], 1.1, 0.3, "cold", None),
    ("swimming", 1, &[], 1.0, 0.25, "water_nearby", None),
    ("fishing", 2, &["stone_tools"], 1.4, 0.4, "water_nearby", None),
    ("plant_cultivation", 2, &["foraging"], 2.0, 0.5, "seasonal_plants", None),
    ("animal_herding", 2, &["animal_trap"], 2.5, 0.55, "herdable_animals", None),
    ("food_preservation", 2, &["fire_making"], 1.8, 0.45, "any", None),
    ("bow_arrow", 2, &["hunting_spear"], 2.2, 0.5, "any", None),
    ("pottery", 3, &["plant_cultivation", "fire_making"], 3.0, 0.55, "clay_nearby", None),
    ("weaving", 3, &["clothing_basic"], 2.8, 0.5, "plant_fibers", None),
    ("metallurgy_copper", 3, &["fire_making", "stone_tools"], 4.0, 0.6, "copper_ore", None),
    ("writing_system", 3, &["pottery"], 5.0, 0.7, "trade_need", Some(5)),
    ("calendar", 3, &["plant_cultivation"], 3.5, 0.6, "any", Some(4)),
    ("mathematics_basic", 3, &["writing_system"], 4.5, 0.65, "any", None),
    ("architecture_stone", 4, &["metallurgy_copper"], 5.5, 0.65, "stone_available", None),
    ("wheel", 4, &["metallurgy_copper"], 5.0, 0.65, "any", None),
    ("irrigation", 4, &["plant_cultivation", "wheel"], 5.5, 0.65, "river_nearby", None),
    ("sailing", 4, &["fishing", "wheel"], 5.5, 0.65, "coastal_or_river", None),
    ("metallurgy_iron", 4, &["metallurgy_copper"], 6.0, 0.7, "iron_ore", None),
];

pub fn learn_tech_from_observation(individual: &mut Individual, nearby: &[Individual], discovered_techs: &mut HashSet<String>) {
    if individual.known_techs.is_empty() {
        individual.known_techs.push("swimming".to_string());
    }
    for other in nearby {
        if other.id == individual.id {
            continue;
        }
        for tech_id in &other.known_techs {
            if individual.known_techs.contains(tech_id) {
                continue;
            }
            let Some((_, _, requires, difficulty, iq_min, _, _)) = TECH_TREE.iter().find(|(id, ..)| *id == tech_id.as_str()) else { continue };
            if individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.0) < *iq_min {
                continue;
            }
            if !requires.iter().all(|r| individual.known_techs.contains(&r.to_string())) {
                continue;
            }
            let rate = (individual.phenotype.get("curiosity").and_then(|v| v.as_f64()).unwrap_or(0.5)
                * individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.5)
                * (0.5 + individual.phenotype.get("learning_rate").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.5))
                / (difficulty * 2000.0);
            if rand::random::<f64>() < rate {
                individual.known_techs.push(tech_id.clone());
                discovered_techs.insert(tech_id.clone());
            }
        }
    }
}

pub fn known_techs_json(individual: &Individual) -> serde_json::Value {
    json!(individual.known_techs)
}
