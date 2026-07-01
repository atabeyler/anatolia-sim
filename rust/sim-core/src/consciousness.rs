use serde_json::json;

use crate::state::Individual;

pub fn update_consciousness(ind: &mut Individual) {
    if !ind.mind.is_object() {
        return;
    }
    let potential = ind.phenotype.get("consciousness_potential").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let base_rate = (potential * 0.001).max(0.00015);
    let lang_bonus = ind.language.get("stage").and_then(|v| v.as_f64()).unwrap_or(0.0) / 6.0 * 0.0005;
    let social_bonus = if ind.group_id.is_some() { 0.0002 } else { 0.0 };
    let stress_penalty = ind.psychology.get("stress_level").and_then(|v| v.as_f64()).unwrap_or(0.3) * 0.0003;
    let tom_bonus = ind.psychology.get("theory_of_mind").and_then(|v| v.as_f64()).unwrap_or(0.0) / 3.0 * 0.0003;
    let hp = ind.health.get("hp").and_then(|v| v.as_f64()).unwrap_or(1.0);
    let injury_penalty = if hp < 0.3 { (0.3 - hp) * 0.002 } else { 0.0 };
    let current = ind.mind.get("consciousness").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let ceiling = (potential * 1.2).min(1.0);
    let next = (current + base_rate + lang_bonus + social_bonus + tom_bonus - stress_penalty - injury_penalty).clamp(0.0, ceiling);
    if let Some(obj) = ind.mind.as_object_mut() {
        obj.insert("consciousness".to_string(), json!(next));
    }
}

pub fn update_inner_thought(_ind: &mut Individual, _sim_day: i32) {}
