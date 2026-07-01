use serde_json::{json, Value};
use std::collections::HashSet;

use crate::state::Individual;

pub const RESOURCE_TYPES: &[&str] = &[
    "food", "water", "stone", "wood", "clay", "flint", "hide", "bone", "copper_ore", "iron_ore", "salt", "obsidian",
];

pub const GOODS_TYPES: &[&str] = &[
    "stone_tool", "spear", "bow", "pottery", "clothing", "rope", "dried_food", "copper_tool", "iron_tool", "woven_cloth", "ceramic_vessel",
];

pub fn initialize_inventory() -> Value {
    json!({ "food": 30, "water": 15, "stone": 2, "wood": 3 })
}

pub fn gather_resources(individual: &Individual, world_state: &Value, discovered_techs: &HashSet<String>) -> Value {
    let p = &individual.phenotype;
    let e = ((p.get("conscientiousness").and_then(|v| v.as_f64()).unwrap_or(0.5) + p.get("physical_strength").and_then(|v| v.as_f64()).unwrap_or(0.5)) / 2.0).max(0.3);
    let fb = world_state.get("food_abundance").and_then(|v| v.as_f64()).unwrap_or(0.5) * e;
    let mut map = serde_json::Map::new();
    map.insert("food".to_string(), json!(fb * 2.0));
    if discovered_techs.contains("foraging") {
        map.insert("food".to_string(), json!(map.get("food").and_then(|v| v.as_f64()).unwrap_or(0.0) + fb * 2.0));
    }
    if discovered_techs.contains("hunting_spear") || discovered_techs.contains("bow_arrow") {
        map.insert("food".to_string(), json!(map.get("food").and_then(|v| v.as_f64()).unwrap_or(0.0) + world_state.get("fauna").and_then(|v| v.get("prey_density")).and_then(|v| v.as_f64()).unwrap_or(0.3) * 2.0 * e));
    }
    if discovered_techs.contains("fishing") && world_state.get("water_abundance").and_then(|v| v.as_f64()).unwrap_or(0.0) > 0.3 {
        map.insert("food".to_string(), json!(map.get("food").and_then(|v| v.as_f64()).unwrap_or(0.0) + 1.2 * e));
    }
    if discovered_techs.contains("plant_cultivation") {
        map.insert("food".to_string(), json!(map.get("food").and_then(|v| v.as_f64()).unwrap_or(0.0) + 2.5 * e));
    }
    if discovered_techs.contains("animal_herding") {
        map.insert("food".to_string(), json!(map.get("food").and_then(|v| v.as_f64()).unwrap_or(0.0) + 2.0 * e));
    }
    map.insert("water".to_string(), json!(world_state.get("water_abundance").and_then(|v| v.as_f64()).unwrap_or(0.5) * 1.5));
    map.insert("wood".to_string(), json!(world_state.get("flora").and_then(|v| v.get("density")).and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.3));
    Value::Object(map)
}

pub fn consume_resources(individual: &mut Individual) -> Value {
    let inv = individual.inventory.as_object_mut();
    let fnorm = 0.4 + ((individual.phenotype.get("physical_strength").and_then(|v| v.as_f64()).unwrap_or(0.5)) * 0.1).min(0.1);
    let wnorm = 0.25;
    let food = inv.as_ref().and_then(|m| m.get("food")).and_then(|v| v.as_f64()).unwrap_or(0.0).min(fnorm);
    let water = inv.as_ref().and_then(|m| m.get("water")).and_then(|v| v.as_f64()).unwrap_or(0.0).min(wnorm);
    if let Some(obj) = inv {
        obj.insert("food".to_string(), json!((obj.get("food").and_then(|v| v.as_f64()).unwrap_or(0.0) - fnorm).max(0.0)));
        obj.insert("water".to_string(), json!((obj.get("water").and_then(|v| v.as_f64()).unwrap_or(0.0) - wnorm).max(0.0)));
    }
    json!({ "satiation": (food / fnorm + water / wnorm) / 2.0, "inv": individual.inventory })
}

pub fn produce_goods(individual: &mut Individual, discovered_techs: &HashSet<String>) -> Value {
    let mut produced = serde_json::Map::new();
    let cs = (individual.phenotype.get("conscientiousness").and_then(|v| v.as_f64()).unwrap_or(0.5) + individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.5)) / 2.0;
    let inv = individual.inventory.as_object_mut().unwrap_or_else(|| panic!("inventory must be object"));
    if discovered_techs.contains("stone_tools") && inv.get("stone").and_then(|v| v.as_f64()).unwrap_or(0.0) >= 1.0 && rand::random::<f64>() < cs * 0.1 {
        produced.insert("stone_tool".to_string(), json!(1));
    }
    if discovered_techs.contains("pottery") && inv.get("clay").and_then(|v| v.as_f64()).unwrap_or(0.0) >= 2.0 && rand::random::<f64>() < cs * 0.08 {
        produced.insert("ceramic_vessel".to_string(), json!(1));
    }
    if discovered_techs.contains("weaving") && inv.get("wood").and_then(|v| v.as_f64()).unwrap_or(0.0) >= 1.0 && rand::random::<f64>() < cs * 0.07 {
        produced.insert("woven_cloth".to_string(), json!(1));
    }
    Value::Object(produced)
}

pub fn attempt_trade(ind_a: &mut Individual, ind_b: &mut Individual, sim_day: i32) -> Option<Value> {
    if !ind_a.inventory.is_object() || !ind_b.inventory.is_object() { return None; }
    let tw = ((ind_a.phenotype.get("altruism").and_then(|v| v.as_f64()).unwrap_or(0.5) + ind_b.phenotype.get("altruism").and_then(|v| v.as_f64()).unwrap_or(0.5)) / 2.0).max(0.0);
    if rand::random::<f64>() > tw * 0.4 { return None; }
    Some(json!({ "type": "trade", "individual_a": ind_a.id, "individual_b": ind_b.id, "day": sim_day }))
}

pub fn compute_economic_stats(population: &[Individual]) -> Value {
    let inv: Vec<f64> = population.iter()
        .filter_map(|i| i.inventory.as_object())
        .map(|m| m.values().filter_map(|v| v.as_f64()).sum())
        .collect();
    if inv.is_empty() {
        return json!({ "mean_wealth": 0.0, "gini": 0.0 });
    }
    let mean = inv.iter().sum::<f64>() / inv.len() as f64;
    let mut sorted = inv.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = sorted.len() as f64;
    let mut gn = 0.0;
    for (i, val) in sorted.iter().enumerate() {
        gn += (2.0 * (i as f64 + 1.0) - n - 1.0) * *val;
    }
    json!({ "mean_wealth": mean, "gini": if mean > 0.0 { (gn / (n * n * mean)).max(0.0) } else { 0.0 } })
}
