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

#[cfg(test)]
mod tests {
    use super::*;

    fn base_individual(consciousness: f64, potential: f64) -> Individual {
        Individual {
            phenotype: json!({ "consciousness_potential": potential }),
            mind: json!({ "consciousness": consciousness }),
            language: json!({ "stage": 0 }),
            psychology: json!({ "stress_level": 0.0, "theory_of_mind": 0 }),
            health: json!({ "hp": 1.0 }),
            group_id: None,
            ..Default::default()
        }
    }

    #[test]
    fn consciousness_never_exceeds_its_genetic_ceiling() {
        let mut ind = base_individual(0.99, 0.5);
        for _ in 0..100_000 {
            update_consciousness(&mut ind);
        }
        let ceiling = (0.5_f64 * 1.2).min(1.0);
        let c = ind.mind.get("consciousness").and_then(|v| v.as_f64()).unwrap();
        assert!(c <= ceiling + 1e-9, "consciousness {c} exceeded genetic ceiling {ceiling}");
    }

    #[test]
    fn consciousness_only_increases_when_signals_are_favourable() {
        let mut ind = base_individual(0.0, 0.6);
        update_consciousness(&mut ind);
        let after = ind.mind.get("consciousness").and_then(|v| v.as_f64()).unwrap();
        assert!(after > 0.0, "baseline growth rate must be strictly positive per the cardinal formula");
    }

    #[test]
    fn low_but_nonzero_potential_grows_at_the_floor_rate_not_scaled_to_zero() {
        // baseRate = max(potential * 0.001, 0.00015): even a low-potential individual
        // grows at the floor rate rather than an arbitrarily tiny scaled value.
        let mut ind = base_individual(0.0, 0.01);
        update_consciousness(&mut ind);
        let after = ind.mind.get("consciousness").and_then(|v| v.as_f64()).unwrap();
        assert!(after >= 0.00015 - 1e-9);
    }

    #[test]
    fn zero_genetic_potential_gives_a_zero_ceiling() {
        // ceiling = min(1, potential * 1.2); a true zero-potential individual can
        // never express any consciousness, by construction of the cardinal formula.
        let mut ind = base_individual(0.0, 0.0);
        update_consciousness(&mut ind);
        assert_eq!(ind.mind.get("consciousness").and_then(|v| v.as_f64()), Some(0.0));
    }

    #[test]
    fn no_other_engine_function_mutates_mind_consciousness() {
        // Cardinal rule: update_consciousness is the sole writer of mind.consciousness.
        // Run a full slate of per-tick engine calls on the same individual and confirm
        // the field is untouched unless update_consciousness itself is invoked.
        let mut ind = base_individual(0.5, 0.5);
        let before = ind.mind.get("consciousness").cloned();

        crate::epigenetics::update_epigenome(&mut ind, None, 10);
        crate::psychology::update_mental_state(&mut ind, &[], &json!({}), 10);
        crate::language::update_foxp2_expression(&mut ind, 3);
        crate::language::update_language_stage(&mut ind, 3, 0);

        let after = ind.mind.get("consciousness").cloned();
        assert_eq!(before, after, "a non-consciousness engine mutated mind.consciousness");
    }
}
