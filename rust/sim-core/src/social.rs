use serde_json::{json, Value};

use crate::state::Individual;

pub const RELATIONSHIP_TYPES: &[&str] = &["kin", "mate", "ally", "rival", "neutral", "outgroup"];
pub const GROUP_ROLES: &[&str] = &["leader", "elder", "warrior", "gatherer", "healer", "member"];

pub fn compute_social_status(individual: &Individual, group: Option<&Value>) -> f64 {
    let Some(group) = group else {
        return 0.0;
    };
    let p = &individual.phenotype;
    let founded_day = group.get("founded_day").and_then(Value::as_i64).unwrap_or(0) as f64;
    let weight = (founded_day / 1000.0).clamp(0.0, 1.0);
    let dom = p.get("dominance").and_then(Value::as_f64).unwrap_or(0.5);
    let iq = p.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.5);
    let emp = p.get("empathy").and_then(Value::as_f64).unwrap_or(0.5);
    let strn = p.get("physical_strength").and_then(Value::as_f64).unwrap_or(0.5);
    let age = individual.age_days.unwrap_or(0) as f64 / 365.0;
    let rep = individual
        .social
        .get("reputation")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    (dom * 0.3
        + iq * 0.25 * weight
        + emp * 0.2 * weight
        + if age < 40.0 { strn } else { 0.0 } * 0.15 * (1.0 - weight)
        + rep * 0.1)
        .clamp(0.0, 1.0)
}

pub fn process_group_dynamics(population: &mut [Individual], groups: &mut [Value], sim_day: i32) -> Vec<Value> {
    let mut events = Vec::new();
    for group in groups.iter_mut() {
        let Some(member_ids) = group.get("member_ids").and_then(Value::as_array).cloned() else {
            continue;
        };
        let members: Vec<_> = population
            .iter_mut()
            .filter(|ind| member_ids.iter().any(|id| id.as_str() == Some(ind.id.as_str())))
            .collect();
        if members.len() < 2 {
            continue;
        }
        if group.get("leader_id").is_none() && !members.is_empty() {
            let leader_id = members
                .iter()
                .max_by(|a, b| {
                    compute_social_status(a, Some(group))
                        .partial_cmp(&compute_social_status(b, Some(group)))
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .map(|ind| ind.id.clone());
            if let Some(leader_id) = leader_id {
                group["leader_id"] = json!(leader_id);
            }
        }
        if members.len() > 25 {
            events.push(json!({
                "type": "group_split",
                "parent_group_id": group.get("id").cloned().unwrap_or(Value::Null),
                "day": sim_day
            }));
        }
    }
    events
}

pub fn assign_group_roles(members: &mut [Individual], leader_id: Option<&str>) {
    for member in members {
        if member.is_founder {
            member.extra.insert("group_role".to_string(), json!("anchor"));
            continue;
        }
        if leader_id.is_some_and(|leader| leader == member.id) {
            member.extra.insert("group_role".to_string(), json!("leader"));
            continue;
        }
        let age_years = member.age_days.unwrap_or(0) as f64 / 365.0;
        let dominant = member
            .extra
            .get("_behaviorCounts")
            .and_then(Value::as_object)
            .and_then(|counts| counts.iter().max_by_key(|(_, v)| v.as_i64().unwrap_or(0)).map(|(k, _)| k.clone()));
        let role = match dominant.as_deref() {
            Some("hunt") => "warrior",
            Some("socialize") => "healer",
            Some("forage") => "gatherer",
            _ if age_years > 40.0 => "elder",
            _ => "member",
        };
        member.extra.insert("group_role".to_string(), json!(role));
    }
}
