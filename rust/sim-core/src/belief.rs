use std::collections::HashSet;

use serde_json::{json, Value};

use crate::state::Individual;

pub const BELIEF_ARCHETYPES: &[(&str, i32, f64, f64, &[&str])] = &[
    ("animism", 1, 0.0, 0.3, &[]),
    ("ancestor_cult", 2, 0.3, 0.4, &[]),
    ("shamanism", 2, 0.4, 0.5, &[]),
    ("polytheism", 3, 0.5, 0.6, &["pottery"]),
    ("monotheism", 4, 0.6, 0.65, &["writing_system", "mathematics_basic"]),
    ("philosophical", 4, 0.7, 0.7, &["writing_system", "mathematics_basic"]),
];

pub fn try_form_belief(individual: &mut Individual, existing_beliefs: &mut HashSet<String>, discovered_techs: &HashSet<String>, world_state: &Value, sim_day: i32) -> Option<Value> {
    let p = &individual.phenotype;
    let religiosity = p.get("religiosity").and_then(Value::as_f64).unwrap_or_else(|| {
        (p.get("anxiety").and_then(Value::as_f64).unwrap_or(0.5) + p.get("curiosity").and_then(Value::as_f64).unwrap_or(0.5)) / 2.0
    });
    let env_gain = 1.0
        + if world_state.get("recent_disaster").is_some() { 5.0 } else { 0.0 }
        + (1.0 - world_state.get("food_abundance").and_then(Value::as_f64).unwrap_or(0.5)).max(0.0) * 3.0;
    let reflection = individual.extra.get("_beliefReflection").and_then(Value::as_f64).unwrap_or(0.0) + env_gain;
    let threshold = 100.0 / (religiosity * p.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.5)).max(0.1);
    individual.extra.insert("_beliefReflection".to_string(), json!(reflection));
    if reflection < threshold {
        return None;
    }
    let mut eligible: Vec<_> = BELIEF_ARCHETYPES.iter().filter(|(name, _, iq_min, foxp2_min, requires_tech)| {
        !existing_beliefs.contains(*name)
            && p.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.0) >= *iq_min
            && individual.language.get("foxp2_expression").and_then(Value::as_f64).unwrap_or(0.0) >= *foxp2_min
            && !requires_tech.iter().any(|t| !discovered_techs.contains(*t))
    }).collect();
    if eligible.is_empty() {
        return None;
    }
    eligible.sort_by(|a, b| a.1.cmp(&b.1));
    let (belief_id, stage, _, _, _) = eligible[0];
    existing_beliefs.insert((*belief_id).to_string());
    let mut beliefs = individual.beliefs.as_array().cloned().unwrap_or_default();
    if !beliefs.iter().any(|v| v.as_str() == Some(belief_id)) {
        beliefs.push(Value::String((*belief_id).to_string()));
    }
    individual.beliefs = Value::Array(beliefs);
    individual.extra.insert("_beliefReflection".to_string(), json!(0));
    Some(json!({
        "type": "belief_formed",
        "belief_id": belief_id,
        "founder_id": individual.id,
        "day": sim_day,
        "importance": if *stage >= 3 { "high" } else { "medium" }
    }))
}

pub fn update_belief_spread(population: &mut [Individual], existing_beliefs: &HashSet<String>, groups: &[Value], sim_day: i32) -> Vec<Value> {
    if existing_beliefs.is_empty() {
        return Vec::new();
    }
    let mut events = Vec::new();
    for individual in population.iter_mut() {
        let mut beliefs = individual.beliefs.as_array().cloned().unwrap_or_default();
        for belief in existing_beliefs {
            if beliefs.iter().any(|v| v.as_str() == Some(belief)) {
                continue;
            }
            let exposure = individual.extra.entry("_beliefExposure".to_string()).or_insert_with(|| json!({}));
            let current = exposure.get(belief).and_then(Value::as_i64).unwrap_or(0) + 1;
            if let Some(obj) = exposure.as_object_mut() {
                obj.insert(belief.clone(), json!(current));
            }
            if current < 80 {
                continue;
            }
            beliefs.push(Value::String(belief.clone()));
            individual.beliefs = Value::Array(beliefs.clone());
            let group = groups.iter().find(|g| g.get("id").and_then(Value::as_str) == individual.group_id.as_deref());
            events.push(json!({
                "type": "belief_spread",
                "belief_id": belief,
                "individual_id": individual.id,
                "group_id": group.and_then(|g| g.get("id")).cloned().unwrap_or(Value::Null),
                "day": sim_day,
                "importance": "low"
            }));
        }
    }
    events
}

pub fn check_ritual_emergence(group: &Value, population: &[Individual], existing_beliefs: &HashSet<String>, sim_day: i32) -> Option<Value> {
    let Some(member_ids) = group.get("member_ids").and_then(Value::as_array) else {
        return None;
    };
    let members: Vec<_> = population.iter().filter(|i| member_ids.iter().any(|id| id.as_str() == Some(i.id.as_str()))).collect();
    if members.len() < 3 {
        return None;
    }
    for belief in existing_beliefs {
        let count = members.iter().filter(|m| m.beliefs.as_array().map(|arr| arr.iter().any(|v| v.as_str() == Some(belief))).unwrap_or(false)).count();
        if count as f64 / members.len() as f64 > 0.6 {
            return Some(json!({
                "type": "ritual_emerged",
                "group_id": group.get("id").cloned().unwrap_or(Value::Null),
                "belief": belief,
                "day": sim_day,
                "importance": "medium"
            }));
        }
    }
    None
}
