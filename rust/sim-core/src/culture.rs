use std::collections::HashSet;

use serde_json::{json, Value};

pub const CULTURAL_MEMES: &[(&str, i32, f64, usize, f64, &[&str])] = &[
    ("shared_greeting", 1, 0.2, 2, 0.05, &[]),
    ("mourning_ritual", 1, 0.3, 3, 0.03, &[]),
    ("food_sharing_norm", 1, 0.2, 2, 0.06, &[]),
    ("reciprocity_norm", 2, 0.4, 4, 0.04, &[]),
    ("gender_roles", 2, 0.4, 5, 0.04, &[]),
    ("age_hierarchy", 2, 0.4, 4, 0.05, &[]),
    ("gift_exchange", 2, 0.5, 5, 0.03, &[]),
    ("body_decoration", 3, 0.5, 3, 0.04, &[]),
    ("storytelling", 3, 0.55, 4, 0.05, &[]),
    ("music_drumming", 3, 0.5, 3, 0.06, &[]),
    ("dance_ritual", 3, 0.5, 4, 0.05, &[]),
    ("naming_ceremony", 3, 0.55, 3, 0.03, &[]),
    ("marriage_ceremony", 4, 0.6, 5, 0.03, &[]),
    ("seasonal_festival", 4, 0.6, 6, 0.03, &[]),
    ("taboo_system", 4, 0.6, 5, 0.02, &[]),
    ("trade_ceremony", 4, 0.65, 6, 0.02, &[]),
    ("written_myth", 5, 0.7, 10, 0.02, &["writing_system"]),
    ("legal_code", 5, 0.7, 10, 0.01, &["writing_system"]),
];

pub fn process_culture_tick(
    population: &[crate::state::Individual],
    groups: &mut [Value],
    discovered_techs: &HashSet<String>,
    sim_day: i32,
) -> Vec<Value> {
    let mut events = Vec::new();
    for group in groups.iter_mut() {
        let culture = group
            .get_mut("culture")
            .and_then(Value::as_array_mut)
            .cloned()
            .unwrap_or_default();
        let member_ids = group.get("member_ids").and_then(Value::as_array).cloned().unwrap_or_default();
        let members: Vec<_> = population
            .iter()
            .filter(|ind| member_ids.iter().any(|id| id.as_str() == Some(ind.id.as_str())))
            .collect();
        if members.len() < 2 {
            continue;
        }
        let avg_foxp2 = members.iter().map(|m| m.language.get("foxp2_expression").and_then(Value::as_f64).unwrap_or(0.0)).sum::<f64>() / members.len() as f64;
        let avg_art = members.iter().map(|m| m.phenotype.get("artistic_sense").and_then(Value::as_f64).unwrap_or(0.3)).sum::<f64>() / members.len() as f64;
        let mut culture_set: HashSet<String> = culture.iter().filter_map(Value::as_str).map(ToString::to_string).collect();
        let mut pressure_map = group.get("_culturePressure").cloned().unwrap_or_else(|| json!({}));
        for (meme_id, stage, foxp2_min, group_min, spread_rate, requires_tech) in CULTURAL_MEMES {
            if culture_set.contains(*meme_id) || avg_foxp2 < *foxp2_min || members.len() < *group_min {
                continue;
            }
            if requires_tech.iter().any(|t| !discovered_techs.contains(*t)) {
                continue;
            }
            let threshold = 100.0 / (avg_art * *spread_rate).max(0.001);
            let current = pressure_map.get(*meme_id).and_then(Value::as_f64).unwrap_or(0.0) + 1.0;
            pressure_map[*meme_id] = json!(current);
            if current >= threshold {
                culture_set.insert((*meme_id).to_string());
                pressure_map[*meme_id] = json!(0);
                events.push(json!({
                    "type": "cultural_meme_emerged",
                    "meme_id": meme_id,
                    "group_id": group.get("id").cloned().unwrap_or(Value::Null),
                    "day": sim_day,
                    "importance": if *stage >= 4 { "high" } else { "low" }
                }));
            }
        }
        group["culture"] = Value::Array(culture_set.into_iter().map(Value::String).collect());
        group["_culturePressure"] = pressure_map;
    }
    events
}

pub fn compute_cultural_prestige(group: &Value) -> f64 {
    group
        .get("culture")
        .and_then(Value::as_array)
        .map(|arr| (arr.len() as f64 * 0.05).min(1.0))
        .unwrap_or(0.0)
}
