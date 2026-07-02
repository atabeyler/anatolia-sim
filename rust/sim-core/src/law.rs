use std::collections::HashSet;

use serde_json::{json, Value};

pub const NORM_TYPES: &[(&str, i32, f64, usize, f64, &[&str])] = &[
    ("reciprocity", 1, 0.0, 2, 0.2, &[]),
    ("no_theft", 1, 0.0, 3, 0.3, &[]),
    ("incest_taboo", 1, 0.0, 2, 0.2, &[]),
    ("elder_respect", 2, 0.3, 4, 0.4, &[]),
    ("hospitality", 2, 0.3, 5, 0.4, &[]),
    ("blood_feud", 2, 0.3, 4, 0.4, &[]),
    ("communal_work", 2, 0.35, 5, 0.4, &[]),
    ("leader_arbitration", 3, 0.5, 8, 0.55, &[]),
    ("property_rights", 3, 0.5, 8, 0.55, &[]),
    ("punishment_exile", 3, 0.5, 8, 0.55, &[]),
    ("written_law", 4, 0.65, 15, 0.65, &["writing_system"]),
    ("tax_system", 4, 0.65, 20, 0.65, &["writing_system", "mathematics_basic"]),
    ("contract_law", 4, 0.7, 20, 0.7, &["writing_system"]),
];

pub fn process_law_tick(
    group: &mut Value,
    population: &[crate::state::Individual],
    discovered_techs: &HashSet<String>,
    sim_day: i32,
) -> Vec<Value> {
    let mut events = Vec::new();
    let Some(member_ids) = group.get("member_ids").and_then(Value::as_array).cloned() else {
        return events;
    };
    let members: Vec<_> = population
        .iter()
        .filter(|ind| member_ids.iter().any(|id| id.as_str() == Some(ind.id.as_str())) && !ind.is_dead)
        .collect();
    if members.len() < 2 {
        return events;
    }
    let norms: HashSet<String> = group
        .get("norms")
        .and_then(Value::as_array)
        .map(|arr| arr.iter().filter_map(Value::as_str).map(ToString::to_string).collect())
        .unwrap_or_default();
    let avg_foxp2 = members.iter().map(|m| m.language.get("foxp2_expression").and_then(Value::as_f64).unwrap_or(0.0)).sum::<f64>() / members.len() as f64;
    let avg_iq = members.iter().map(|m| m.phenotype.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.5)).sum::<f64>() / members.len() as f64;
    let leader = members.iter().find(|m| group.get("leader_id").and_then(Value::as_str) == Some(m.id.as_str()));
    let mut updated_norms = norms;
    for (norm_id, stage, iq_min, group_min, foxp2_min, requires_tech) in NORM_TYPES {
        if updated_norms.contains(*norm_id) || members.len() < *group_min || avg_foxp2 < *foxp2_min || avg_iq < *iq_min {
            continue;
        }
        if requires_tech.iter().any(|t| !discovered_techs.contains(*t)) {
            continue;
        }
        let tension = group.get("internal_tension").and_then(Value::as_f64).unwrap_or(0.3);
        let lead_iq = leader.and_then(|m| m.phenotype.get("fluid_intelligence")).and_then(Value::as_f64).unwrap_or(0.4);
        if rand::random::<f64>() < (tension + lead_iq * 0.3) * 0.0005 {
            updated_norms.insert((*norm_id).to_string());
            events.push(json!({
                "type": "norm_emerged",
                "norm_id": norm_id,
                "group_id": group.get("id").cloned().unwrap_or(Value::Null),
                "day": sim_day,
                "importance": if *stage >= 4 { "high" } else if *stage >= 3 { "medium" } else { "low" }
            }));
        }
    }
    group["norms"] = Value::Array(updated_norms.into_iter().map(Value::String).collect());
    events
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::Individual;

    fn group_with_members(n: usize, foxp2: f64, iq: f64) -> (Value, Vec<Individual>) {
        let members: Vec<Individual> = (0..n)
            .map(|i| Individual {
                id: format!("m{i}"),
                phenotype: json!({ "fluid_intelligence": iq }),
                language: json!({ "foxp2_expression": foxp2 }),
                ..Default::default()
            })
            .collect();
        let group = json!({
            "id": "g1",
            "member_ids": members.iter().map(|m| json!(m.id)).collect::<Vec<_>>(),
            "leader_id": Value::Null,
            "norms": [],
            "internal_tension": 0.9,
        });
        (group, members)
    }

    #[test]
    fn a_group_below_the_size_and_language_thresholds_never_gets_any_norm() {
        let (mut group, members) = group_with_members(1, 0.0, 0.0); // below every norm's group_min
        let techs = HashSet::new();
        for day in 0..5000 {
            process_law_tick(&mut group, &members, &techs, day);
        }
        assert!(group["norms"].as_array().unwrap().is_empty());
    }

    #[test]
    fn a_qualifying_group_can_eventually_emerge_a_norm() {
        let (mut group, members) = group_with_members(3, 0.5, 0.5); // meets reciprocity/no_theft/incest_taboo minimums
        let techs = HashSet::new();
        let mut emerged = false;
        for day in 0..200_000 {
            process_law_tick(&mut group, &members, &techs, day);
            if !group["norms"].as_array().unwrap().is_empty() {
                emerged = true;
                break;
            }
        }
        assert!(emerged, "a qualifying group should eventually emerge at least one stage-1 norm");
    }

    #[test]
    fn written_law_never_emerges_without_the_writing_system_prerequisite() {
        let (mut group, members) = group_with_members(30, 0.9, 0.9);
        let techs = HashSet::new(); // writing_system deliberately absent
        for day in 0..50_000 {
            process_law_tick(&mut group, &members, &techs, day);
        }
        let norms: Vec<String> = group["norms"].as_array().unwrap().iter().filter_map(|v| v.as_str().map(String::from)).collect();
        assert!(!norms.contains(&"written_law".to_string()));
    }
}

pub fn compute_social_order(group: &Value) -> f64 {
    let member_count = group.get("member_ids").and_then(Value::as_array).map(|arr| arr.len().max(2)).unwrap_or(2) as f64;
    let norm_count = group.get("norms").and_then(Value::as_array).map(|arr| arr.len()).unwrap_or(0) as f64;
    let tension = group.get("internal_tension").and_then(Value::as_f64).unwrap_or(0.5);
    ((norm_count / member_count.log2()) * 0.08 + (1.0 - tension) * 0.4).min(1.0)
}
