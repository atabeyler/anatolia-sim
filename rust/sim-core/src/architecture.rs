use std::collections::HashSet;

use serde_json::{json, Value};

use crate::state::Individual;

pub const STRUCTURE_TYPES: &[(&str, i32, usize, &[&str], i32, f64, Option<&str>)] = &[
    ("cave_dwelling", 0, 8, &[], 0, 1.0, None),
    ("lean_to", 0, 4, &["wood"], 1, 0.2, None),
    ("pit_house", 1, 6, &["stone_tools"], 5, 0.5, None),
    ("post_frame_hut", 1, 6, &["stone_tools"], 4, 0.4, None),
    ("storage_pit", 1, 0, &["stone_tools"], 2, 0.7, Some("storage")),
    ("mud_brick_house", 2, 8, &["pottery", "plant_cultivation"], 15, 0.7, None),
    ("granary", 2, 0, &["plant_cultivation", "pottery"], 10, 0.6, Some("granary")),
    ("defensive_wall", 2, 0, &["stone_tools"], 20, 0.8, Some("defense")),
    ("stone_temple", 3, 50, &["architecture_stone", "metallurgy_copper"], 200, 1.0, Some("ritual")),
    ("stone_house", 3, 10, &["architecture_stone"], 30, 1.0, None),
    ("marketplace", 3, 100, &["wheel", "writing_system"], 50, 0.9, Some("trade")),
    ("city_wall", 3, 0, &["architecture_stone", "metallurgy_copper"], 500, 1.0, Some("defense")),
];

pub fn process_architecture_tick(settlement: &mut Value, population: &[Individual], discovered_techs: &HashSet<String>, world_state: &Value, sim_day: i32) -> Vec<Value> {
    let mut events = Vec::new();
    let Some(group_id) = settlement.get("group_id").and_then(Value::as_str) else {
        return events;
    };
    let members: Vec<_> = population.iter().filter(|i| i.group_id.as_deref() == Some(group_id) && !i.is_dead).collect();
    if settlement.get("structures").and_then(Value::as_array).is_none() {
        settlement["structures"] = json!([]);
    }
    if settlement.get("stockpile").and_then(Value::as_object).is_none() {
        settlement["stockpile"] = json!({});
    }
    let labor = members.iter().filter(|m| m.extra.get("life_stage").and_then(Value::as_str) == Some("ADULT")).count() as f64 * 0.1;
    settlement["labor_pool"] = json!(settlement.get("labor_pool").and_then(Value::as_f64).unwrap_or(0.0) + labor);
    let group_size = members.len();
    let priority = build_priority(settlement, group_size, world_state);
    if let Some(id) = priority {
        if let Some((_, _, _, requires_tech, labor_days, _, _)) = STRUCTURE_TYPES.iter().find(|(sid, ..)| *sid == id) {
            if requires_tech.iter().all(|t| discovered_techs.contains(*t)) {
                let current_labor = settlement.get("labor_pool").and_then(Value::as_f64).unwrap_or(0.0);
                if current_labor >= *labor_days as f64 {
                    settlement["labor_pool"] = json!(current_labor - *labor_days as f64);
                    if let Some(arr) = settlement.get_mut("structures").and_then(Value::as_array_mut) {
                        arr.push(json!({ "id": format!("struct_{}_{}", sim_day, rand::random::<u16>()), "type": id, "built_day": sim_day, "condition": 1.0 }));
                    }
                    events.push(json!({
                        "type": "structure_built",
                        "structure_type": id,
                        "day": sim_day
                    }));
                }
            }
        }
    }
    events
}

fn build_priority(settlement: &Value, group_size: usize, world_state: &Value) -> Option<&'static str> {
    let structures = settlement.get("structures").and_then(Value::as_array).cloned().unwrap_or_default();
    let built: HashSet<&str> = structures.iter().filter_map(|s| s.get("type").and_then(Value::as_str)).collect();
    let cap: usize = structures.iter().filter_map(|s| s.get("type").and_then(Value::as_str)).filter_map(|id| STRUCTURE_TYPES.iter().find(|(sid, ..)| *sid == id).map(|(_, _, cap, _, _, _, _)| *cap)).sum();
    if !built.contains("lean_to") && !built.contains("pit_house") && !built.contains("mud_brick_house") && !built.contains("post_frame_hut") && !built.contains("cave_dwelling") && !built.contains("stone_house") {
        return Some("lean_to");
    }
    if cap < (group_size as f64 * 0.7) as usize {
        return Some("post_frame_hut");
    }
    if group_size >= 6 && !built.contains("storage_pit") {
        return Some("storage_pit");
    }
    if group_size >= 8 && !built.contains("mud_brick_house") {
        return Some("mud_brick_house");
    }
    if group_size >= 10 && !built.contains("granary") {
        return Some("granary");
    }
    if world_state.get("recent_disaster").and_then(Value::as_str) == Some("conflict") && !built.contains("defensive_wall") {
        return Some("defensive_wall");
    }
    if group_size >= 20 && !built.contains("stone_temple") {
        return Some("stone_temple");
    }
    None
}

pub fn compute_settlement_capacity(settlement: &Value) -> usize {
    settlement
        .get("structures")
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .filter_map(|s| s.get("type").and_then(Value::as_str))
                .filter_map(|id| STRUCTURE_TYPES.iter().find(|(sid, ..)| *sid == id).map(|(_, _, cap, _, _, _, _)| *cap))
                .sum()
        })
        .unwrap_or(0)
}

pub fn check_settlement_overcrowding(settlement: &Value, group_size: usize, sim_day: i32) -> Option<Value> {
    let cap = compute_settlement_capacity(settlement);
    if cap > 0 && group_size > (cap as f64 * 1.2) as usize {
        Some(json!({
            "type": "settlement_overcrowded",
            "settlement_id": settlement.get("id").cloned().unwrap_or(Value::Null),
            "day": sim_day,
            "importance": "medium"
        }))
    } else {
        None
    }
}

pub fn compute_settlement_defense(settlement: &Value) -> f64 {
    settlement
        .get("structures")
        .and_then(Value::as_array)
        .map(|arr| arr.iter().filter(|s| {
            s.get("type").and_then(Value::as_str) == Some("defensive_wall")
                || s.get("type").and_then(Value::as_str) == Some("city_wall")
        }).map(|s| s.get("condition").and_then(Value::as_f64).unwrap_or(1.0) * 0.5).sum())
        .unwrap_or(0.0)
}

pub fn create_settlement(group: &Value, world_state: &Value, sim_day: i32) -> Value {
    json!({
        "id": format!("settlement_{}_{}", sim_day, rand::random::<u16>()),
        "name": Value::Null,
        "group_id": group.get("id").cloned().unwrap_or(Value::Null),
        "x": group.get("territory").and_then(|v| v.get("x")).cloned().unwrap_or(Value::Null),
        "y": group.get("territory").and_then(|v| v.get("y")).cloned().unwrap_or(Value::Null),
        "biome": world_state.get("biome").cloned().unwrap_or(Value::Null),
        "structures": [],
        "labor_pool": 0,
        "stockpile": {},
        "founded_day": sim_day
    })
}
