use std::collections::HashSet;

use serde_json::{json, Value};

pub const ART_FORMS: &[(&str, &str, f64, f64, &[&str], f64, Option<f64>)] = &[
    ("cave_painting", "visual", 0.35, 0.3, &[], 0.3, None),
    ("sculpture", "visual", 0.45, 0.4, &["stone_tools"], 0.4, None),
    ("pottery_decoration", "visual", 0.5, 0.4, &["pottery"], 0.3, None),
    ("textile_pattern", "visual", 0.5, 0.45, &["weaving"], 0.35, None),
    ("architecture_art", "visual", 0.6, 0.5, &["architecture_stone"], 0.5, None),
    ("rhythmic_percussion", "music", 0.25, 0.2, &[], 0.2, None),
    ("vocal_melody", "music", 0.3, 0.25, &[], 0.2, None),
    ("flute_bone", "music", 0.4, 0.35, &["stone_tools"], 0.3, None),
    ("string_instrument", "music", 0.5, 0.4, &["hunting_spear"], 0.4, None),
    ("oral_story", "narrative", 0.4, 0.3, &[], 0.25, Some(0.45)),
    ("epic_poem", "narrative", 0.55, 0.5, &[], 0.4, Some(0.6)),
    ("written_story", "narrative", 0.65, 0.5, &["writing_system"], 0.5, Some(0.65)),
];

pub fn process_art_tick(
    population: &[crate::state::Individual],
    discovered_arts: &mut HashSet<String>,
    discovered_techs: &HashSet<String>,
    world_state: &Value,
    sim_day: i32,
) -> Vec<Value> {
    let mut events = Vec::new();
    let surplus = world_state.get("food_abundance").and_then(Value::as_f64).unwrap_or(0.5);
    for individual in population.iter().filter(|i| !i.is_dead) {
        let p = &individual.phenotype;
        let artistic = p.get("artistic_sense").and_then(Value::as_f64).unwrap_or(0.3);
        let foxp2 = individual.language.get("foxp2_expression").and_then(Value::as_f64).unwrap_or(0.0);
        let action = individual.extra.get("_currentAction").and_then(Value::as_str).unwrap_or("");
        for (art_id, medium, iq_min, artistic_min, requires_tech, surplus_min, foxp2_min) in ART_FORMS {
            if discovered_arts.contains(*art_id)
                || p.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.5) < *iq_min
                || artistic < *artistic_min
                || surplus < *surplus_min
                || requires_tech.iter().any(|t| !discovered_techs.contains(*t))
                || foxp2_min.is_some_and(|min| foxp2 < min)
                || action != match *medium { "visual" => "craft", "music" => "socialize", _ => "socialize" }
            {
                continue;
            }
            if rand::random::<f64>() < artistic * p.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.5) * surplus / 5000.0 {
                discovered_arts.insert((*art_id).to_string());
                events.push(json!({
                    "type": "art_created",
                    "art_id": art_id,
                    "medium": medium,
                    "creator_id": individual.id,
                    "day": sim_day,
                    "importance": if *iq_min > 0.5 { "high" } else { "medium" }
                }));
            }
        }
    }
    events
}

pub fn apply_art_effects(individual: &mut crate::state::Individual, group: Option<&mut Value>, discovered_arts: &HashSet<String>) {
    if discovered_arts.is_empty() {
        return;
    }
    let current = individual
        .extra
        .get("psychology")
        .and_then(|v| v.get("wellbeing"))
        .and_then(Value::as_f64)
        .unwrap_or(0.5);
    individual
        .extra
        .insert("psychology".to_string(), json!({ "wellbeing": (current + discovered_arts.len() as f64 * 0.00005).min(1.0) }));
    if discovered_arts.len() > 3 {
        if let Some(group) = group {
            let tension = group.get("internal_tension").and_then(Value::as_f64).unwrap_or(0.5);
            if let Some(obj) = group.as_object_mut() {
                obj.insert("internal_tension".to_string(), json!((tension - 0.01).max(0.0)));
            }
        }
    }
}
