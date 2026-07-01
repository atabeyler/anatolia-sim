use serde_json::Value;

use crate::state::Individual;

pub const ACTIONS: &[&str] = &[
    "forage",
    "drink",
    "flee",
    "seek_warmth",
    "rest",
    "hunt",
    "craft",
    "socialize",
    "mate",
    "explore",
];

pub fn select_action(individual: &Individual, world_state: &Value) -> String {
    let health = &individual.health;
    let calories = health.get("calories").and_then(Value::as_f64).unwrap_or(0.7);
    let hydration = health.get("hydration").and_then(Value::as_f64).unwrap_or(0.7);
    let hp = health.get("hp").and_then(Value::as_f64).unwrap_or(1.0);
    let ph = &individual.phenotype;
    let curiosity = ph.get("curiosity").and_then(Value::as_f64).unwrap_or(0.5);
    let strength = ph.get("physical_strength").and_then(Value::as_f64).unwrap_or(0.5);
    let risk_tolerance = ph.get("risk_tolerance").and_then(Value::as_f64).unwrap_or(0.5);
    let stress = individual.psychology.get("stress_level").and_then(Value::as_f64).unwrap_or(0.3);
    let mating = individual.extra.get("mating_urge").and_then(Value::as_f64).unwrap_or(0.0);
    let pred_fear = individual.extra.get("_fears").and_then(|v| v.get("predator")).and_then(Value::as_f64).unwrap_or(0.0);
    let dis_fear = individual.extra.get("_fears").and_then(|v| v.get("disaster")).and_then(Value::as_f64).unwrap_or(0.0);
    let temp = world_state.get("temperature").and_then(Value::as_f64).unwrap_or(20.0);
    let fauna = world_state.get("fauna").and_then(|v| v.get("prey_density")).and_then(Value::as_f64).unwrap_or(0.0);
    let age_years = individual.age_days.unwrap_or(0) as f64 / 365.0;
    let is_adult = age_years >= 13.0;

    let mut best = ("explore", -1.0);
    let scores = [
        ("flee", pred_fear.max(dis_fear) * (2.0 - risk_tolerance * 0.6)),
        ("rest", if hp < 0.25 { (1.0 - hp) * 1.8 } else { 0.0 }),
        ("drink", if hydration < 0.4 { (0.4 - hydration) * 3.5 } else { 0.0 }),
        ("forage", if calories < 0.4 { (0.4 - calories) * 3.0 } else { 0.0 }),
        ("seek_warmth", if temp < 8.0 { (8.0 - temp) / 10.0 } else { 0.0 }),
        ("mate", if is_adult && mating > 0.65 && calories > 0.4 && hydration > 0.35 { (mating - 0.65) * 2.0 } else { 0.0 }),
        ("hunt", if (calories + hydration + hp) / 3.0 > 0.55 && stress < 0.7 && fauna > 0.2 && strength > 0.3 && calories < 0.8 {
            fauna * strength * (0.8 + risk_tolerance * 0.4)
        } else { 0.0 }),
        ("craft", if (calories + hydration + hp) / 3.0 > 0.55 && stress < 0.7 { curiosity * ((calories + hydration + hp) / 3.0) * 0.6 } else { 0.0 }),
        ("socialize", if (calories + hydration + hp) / 3.0 > 0.55 && stress < 0.7 { ((calories + hydration + hp) / 3.0) * 0.25 } else { 0.0 }),
        ("explore", if (calories + hydration + hp) / 3.0 > 0.55 && stress < 0.7 { curiosity * 0.2 + risk_tolerance * 0.1 } else { 0.0 }),
    ];
    for (action, score) in scores {
        let noisy = score + (rand::random::<f64>() * 0.04);
        if noisy > best.1 {
            best = (action, noisy);
        }
    }
    best.0.to_string()
}
