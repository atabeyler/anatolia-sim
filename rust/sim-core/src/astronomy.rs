use std::collections::HashSet;

use serde_json::{json, Value};

pub const ASTRONOMY_KNOWLEDGE: &[(&str, &[&str], f64, f64, &[&str])] = &[
    ("lunar_tracking", &["lunar_cycle"], 0.3, 0.4, &[]),
    ("seasonal_calendar", &["solstice", "equinox"], 0.45, 0.5, &["calendar"]),
    ("star_map", &["star_rising", "lunar_cycle"], 0.55, 0.55, &[]),
    ("eclipse_prediction", &["eclipse_solar", "eclipse_lunar", "lunar_tracking"], 0.65, 0.65, &["mathematics_basic"]),
    ("planetary_model", &["planet_motion", "star_map"], 0.7, 0.7, &["mathematics_basic", "writing_system"]),
];

pub fn process_astronomy_tick(
    population: &[crate::state::Individual],
    observations: &mut HashSet<String>,
    astronomy_knowledge: &mut HashSet<String>,
    discovered_techs: &HashSet<String>,
    sim_day: i32,
) -> Vec<Value> {
    let mut events = Vec::new();
    let celestial: [(&str, f64, f64, bool); 8] = [
        ("lunar_cycle", 29.5, 0.9, false),
        ("solstice", 182.5, 0.7, false),
        ("equinox", 182.5, 0.6, false),
        ("star_rising", 365.0, 0.5, false),
        ("eclipse_solar", 177.5, 0.99, false),
        ("eclipse_lunar", 177.5, 0.9, false),
        ("planet_motion", 687.0, 0.4, false),
        ("comet", 3650.0, 0.99, true),
    ];
    for (event_id, period, observability, rare) in celestial {
        if rare {
            if rand::random::<f64>() > 0.001 {
                continue;
            }
            observations.insert(event_id.to_string());
            events.push(json!({ "type": "celestial_observation", "event_id": event_id, "day": sim_day, "importance": "high" }));
            continue;
        }
        if sim_day > 0 && sim_day % period.round() as i32 == 0 && rand::random::<f64>() < observability {
            observations.insert(event_id.to_string());
            events.push(json!({ "type": "celestial_observation", "event_id": event_id, "day": sim_day, "importance": if event_id.contains("eclipse") { "high" } else { "low" } }));
        }
    }
    for individual in population.iter().filter(|i| !i.is_dead) {
        let foxp2 = individual.language.get("foxp2_expression").and_then(Value::as_f64).unwrap_or(0.0);
        let iq = individual.phenotype.get("fluid_intelligence").and_then(Value::as_f64).unwrap_or(0.5);
        let curiosity = individual.phenotype.get("curiosity").and_then(Value::as_f64).unwrap_or(0.5);
        if curiosity <= 0.5 {
            continue;
        }
        for (kid, requires_obs, iq_min, foxp2_min, requires_tech) in ASTRONOMY_KNOWLEDGE {
            if astronomy_knowledge.contains(*kid)
                || iq < *iq_min
                || foxp2 < *foxp2_min
                || requires_obs.iter().any(|obs| !observations.contains(*obs))
                || requires_tech.iter().any(|t| !discovered_techs.contains(*t))
            {
                continue;
            }
            if rand::random::<f64>() < curiosity * iq * 0.0001 {
                astronomy_knowledge.insert((*kid).to_string());
                events.push(json!({ "type": "astronomy_discovery", "knowledge_id": kid, "discoverer_id": individual.id, "day": sim_day, "importance": if *iq_min > 0.6 { "high" } else { "medium" } }));
            }
        }
    }
    events
}

pub fn get_astronomy_bonus(astronomy_knowledge: &HashSet<String>) -> Value {
    let mut b = serde_json::Map::new();
    if astronomy_knowledge.contains("lunar_tracking") {
        b.insert("navigation".to_string(), json!(0.10));
    }
    if astronomy_knowledge.contains("seasonal_calendar") {
        b.insert("farming_efficiency".to_string(), json!(0.15));
    }
    if astronomy_knowledge.contains("star_map") {
        b.insert("navigation".to_string(), json!(0.20));
        b.insert("seafaring".to_string(), json!(0.20));
    }
    if astronomy_knowledge.contains("eclipse_prediction") {
        b.insert("farming_efficiency".to_string(), json!(0.05));
    }
    if astronomy_knowledge.contains("planetary_model") {
        b.insert("navigation".to_string(), json!(0.10));
        b.insert("innovation_rate".to_string(), json!(0.10));
    }
    Value::Object(b)
}
