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

/// Shared by `assign_group_roles` (contiguous member slices, e.g. tests) and the
/// tick orchestrator (which assigns roles across a scattered population by group
/// membership rather than a contiguous slice).
pub fn compute_role_for(member: &Individual, leader_id: Option<&str>) -> &'static str {
    if member.is_founder {
        return "anchor";
    }
    if leader_id.is_some_and(|leader| leader == member.id) {
        return "leader";
    }
    let age_years = member.age_days.unwrap_or(0) as f64 / 365.0;
    let dominant = member
        .extra
        .get("_behaviorCounts")
        .and_then(Value::as_object)
        .and_then(|counts| counts.iter().max_by_key(|(_, v)| v.as_i64().unwrap_or(0)).map(|(k, _)| k.clone()));
    match dominant.as_deref() {
        Some("hunt") => "warrior",
        Some("socialize") => "healer",
        Some("forage") => "gatherer",
        _ if age_years > 40.0 => "elder",
        _ => "member",
    }
}

pub fn assign_group_roles(members: &mut [Individual], leader_id: Option<&str>) {
    for member in members {
        let role = compute_role_for(member, leader_id);
        member.extra.insert("group_role".to_string(), json!(role));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn member_with_behavior(dominant_action: &str) -> Individual {
        let mut m = Individual { age_days: Some(365 * 25), ..Default::default() };
        m.extra.insert("_behaviorCounts".to_string(), json!({ dominant_action: 50, "socialize": 1 }));
        m
    }

    #[test]
    fn role_emerges_from_behavior_counts_not_from_dominance_or_other_phenotype() {
        // Cardinal rule: roles emerge from `_behaviorCounts`, never assigned from
        // phenotype. Two members with identical (high) dominance but different
        // behavior histories must get different roles.
        let mut hunter = member_with_behavior("hunt");
        let mut gatherer = member_with_behavior("forage");
        hunter.phenotype = json!({ "dominance": 0.95 });
        gatherer.phenotype = json!({ "dominance": 0.95 }); // same dominance, different behavior

        assert_eq!(compute_role_for(&hunter, None), "warrior");
        assert_eq!(compute_role_for(&gatherer, None), "gatherer");
    }

    #[test]
    fn high_dominance_phenotype_alone_never_grants_the_leader_role() {
        // Only an explicit leader_id (itself derived from compute_social_status,
        // which is a behavioral/social computation, not a raw phenotype lookup)
        // may grant "leader" -- never dominance by itself.
        let mut ambitious = member_with_behavior("hunt");
        ambitious.phenotype = json!({ "dominance": 1.0 });
        assert_ne!(compute_role_for(&ambitious, None), "leader");
        assert_eq!(compute_role_for(&ambitious, Some("someone-else")), "warrior");
    }

    #[test]
    fn only_the_designated_leader_id_receives_the_leader_role() {
        let mut member = member_with_behavior("hunt");
        member.id = "chief".to_string();
        assert_eq!(compute_role_for(&member, Some("chief")), "leader");
    }

    #[test]
    fn founders_are_always_anchors_regardless_of_behavior_or_leadership() {
        let mut founder = member_with_behavior("hunt");
        founder.is_founder = true;
        founder.id = "founder-1".to_string();
        assert_eq!(compute_role_for(&founder, Some("founder-1")), "anchor");
    }

    #[test]
    fn assign_group_roles_applies_the_same_rule_across_a_contiguous_slice() {
        let mut members = vec![member_with_behavior("hunt"), member_with_behavior("forage")];
        assign_group_roles(&mut members, None);
        assert_eq!(members[0].extra.get("group_role").and_then(Value::as_str), Some("warrior"));
        assert_eq!(members[1].extra.get("group_role").and_then(Value::as_str), Some("gatherer"));
    }
}
