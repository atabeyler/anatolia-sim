use serde_json::{json, Value};

use crate::state::Individual;

pub fn initialize_psychology(individual: &mut Individual) {
    let oxt = individual.phenotype.get("oxytocin_sensitivity").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let anxiety = individual.phenotype.get("anxiety").and_then(|v| v.as_f64()).unwrap_or(0.3);
    let attachment = if oxt > 0.65 {
        "secure"
    } else if oxt > 0.45 && anxiety > 0.5 {
        "anxious"
    } else if oxt < 0.35 {
        "avoidant"
    } else {
        "secure"
    };
    individual.psychology = json!({
        "mental_state": "content",
        "wellbeing": 0.6,
        "attachment_style": attachment,
        "stress_level": 0.2,
        "trauma_events": [],
        "relationships": {},
        "theory_of_mind": 0,
        "self_awareness": individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.0) > 0.6,
        "life_satisfaction": 0.6
    });
}

pub fn update_mental_state(individual: &mut Individual, events: &[Value], world_state: &Value, sim_day: i32) {
    if !individual.psychology.is_object() {
        initialize_psychology(individual);
    }
    let Some(ps) = individual.psychology.as_object_mut() else { return };
    let p = &individual.phenotype;
    let mut stress = ps.get("stress_level").and_then(|v| v.as_f64()).unwrap_or(0.2) * 0.95;
    let mut wellbeing = ps.get("wellbeing").and_then(|v| v.as_f64()).unwrap_or(0.6) * 0.98 + (1.0 - stress) * 0.02;
    let satiation = individual.extra.get("satiation").and_then(|v| v.as_f64()).unwrap_or(0.5);
    if satiation < 0.3 {
        stress = (stress + 0.1).min(1.0);
        wellbeing = (wellbeing - 0.05).max(0.0);
    } else if satiation > 0.8 {
        wellbeing = (wellbeing + 0.02).min(1.0);
    }
    if individual.group_id.is_none() {
        let social_drive = p.get("social_drive").and_then(|v| v.as_f64()).unwrap_or(0.5);
        stress = (stress + social_drive * 0.05).min(1.0);
    }
    if world_state.get("recent_disaster").is_some() {
        stress = (stress + 0.3).min(1.0);
        let mut trauma = ps.get("trauma_events").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        trauma.push(json!({ "type": world_state.get("recent_disaster").cloned().unwrap_or(Value::Null), "day": sim_day }));
        ps.insert("trauma_events".to_string(), Value::Array(trauma));
    }
    for ev in events {
        if ev.get("individual_id").and_then(|v| v.as_str()) != Some(individual.id.as_str()) {
            continue;
        }
        match ev.get("type").and_then(|v| v.as_str()) {
            Some("birth") => wellbeing = (wellbeing + 0.1).min(1.0),
            Some("mate_bond") => wellbeing = (wellbeing + 0.15).min(1.0),
            Some("death_of_kin") => {
                stress = (stress + 0.4).min(1.0);
                ps.insert("mental_state".to_string(), json!("grieving"));
                let mut trauma = ps.get("trauma_events").and_then(|v| v.as_array()).cloned().unwrap_or_default();
                trauma.push(json!({ "type": "kin_death", "day": sim_day }));
                ps.insert("trauma_events".to_string(), Value::Array(trauma));
            }
            Some("exile") => {
                stress = (stress + 0.5).min(1.0);
                ps.insert("mental_state".to_string(), json!("depressed"));
            }
            Some("discovery") => wellbeing = (wellbeing + 0.2).min(1.0),
            _ => {}
        }
    }
    let effective_anxiety = (p.get("anxiety").and_then(|v| v.as_f64()).unwrap_or(0.3) + ps.get("trauma_anxiety").and_then(|v| v.as_f64()).unwrap_or(0.0)).min(1.0);
    let mut mental_state = if stress > 0.8 && effective_anxiety > 0.6 {
        "anxious"
    } else if stress > 0.7 {
        "anxious"
    } else if wellbeing < 0.2 {
        "depressed"
    } else if wellbeing > 0.8 && stress < 0.2 {
        "excited"
    } else if wellbeing > 0.6 && stress < 0.3 {
        "content"
    } else {
        "calm"
    };
    if ps.get("mental_state").and_then(|v| v.as_str()) == Some("grieving") && stress > 0.4 {
        mental_state = "grieving";
    }
    let trauma_events_len = ps.get("trauma_events").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
    let trauma_anxiety = (ps.get("trauma_anxiety").and_then(|v| v.as_f64()).unwrap_or(0.0) - 0.0005).max(0.0)
        + if trauma_events_len > 3 { 0.01 } else { 0.0 };
    ps.insert("stress_level".to_string(), json!(stress));
    ps.insert("wellbeing".to_string(), json!(wellbeing));
    ps.insert("mental_state".to_string(), json!(mental_state));
    ps.insert("trauma_anxiety".to_string(), json!(trauma_anxiety.min(0.7)));
    if wellbeing < 0.3 && individual.health.is_object() {
        let hp = individual.health.get("hp").and_then(|v| v.as_f64()).unwrap_or(0.5);
        if let Some(obj) = individual.health.as_object_mut() {
            obj.insert("hp".to_string(), json!((hp - 0.003).max(0.0)));
        }
    }
    if individual.group_id.is_some() {
        let obs = individual.extra.get("_socialObservations").and_then(|v| v.as_i64()).unwrap_or(0) + 1;
        individual.extra.insert("_socialObservations".to_string(), json!(obs));
    }
    let tom = ps.get("theory_of_mind").and_then(|v| v.as_i64()).unwrap_or(0);
    let qi = p.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let emp = p.get("empathy").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let ls = individual.language.get("stage").and_then(|v| v.as_i64()).unwrap_or(0);
    let c = individual.mind.get("consciousness").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let obs = individual.extra.get("_socialObservations").and_then(|v| v.as_i64()).unwrap_or(0) as f64;
    let tom_factor = (qi * emp).max(0.3);
    let new_tom = if tom < 1 && ls >= 1 && qi > 0.3 && obs >= 150.0 / tom_factor { 1 }
        else if tom < 2 && ls >= 2 && c > 0.02 && qi > 0.4 && obs >= 450.0 / tom_factor { 2 }
        else if tom < 3 && ls >= 3 && c > 0.1 && qi > 0.55 && obs >= 1125.0 / tom_factor { 3 }
        else { tom };
    ps.insert("theory_of_mind".to_string(), json!(new_tom));
    ps.insert("life_satisfaction".to_string(), json!((wellbeing + (1.0 - stress)) / 2.0));
}

pub fn process_bonding(ind_a: &mut Individual, ind_b: &mut Individual, interaction_type: &str) {
    if !ind_a.psychology.is_object() {
        initialize_psychology(ind_a);
    }
    if !ind_b.psychology.is_object() {
        initialize_psychology(ind_b);
    }
    let bs = ((ind_a.phenotype.get("oxytocin_sensitivity").and_then(|v| v.as_f64()).unwrap_or(0.5)
        + ind_b.phenotype.get("oxytocin_sensitivity").and_then(|v| v.as_f64()).unwrap_or(0.5)) / 2.0).max(0.0);
    let d = match interaction_type {
        "mating" => 0.3,
        "cooperation" => 0.1,
        "play" => 0.08,
        "conflict" => -0.2,
        _ => 0.02,
    };
    let rel_a = ind_a
        .psychology
        .get("relationships")
        .and_then(|v| v.as_object())
        .and_then(|m| m.get(&ind_b.id))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let rel_b = ind_b
        .psychology
        .get("relationships")
        .and_then(|v| v.as_object())
        .and_then(|m| m.get(&ind_a.id))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    if let Some(obj) = ind_a.psychology.as_object_mut() {
        let mut rels = obj.get("relationships").and_then(|v| v.as_object()).cloned().unwrap_or_default();
        rels.insert(ind_b.id.clone(), json!((rel_a + d * bs).clamp(-1.0, 1.0)));
        obj.insert("relationships".to_string(), Value::Object(rels));
    }
    if let Some(obj) = ind_b.psychology.as_object_mut() {
        let mut rels = obj.get("relationships").and_then(|v| v.as_object()).cloned().unwrap_or_default();
        rels.insert(ind_a.id.clone(), json!((rel_b + d * bs).clamp(-1.0, 1.0)));
        obj.insert("relationships".to_string(), Value::Object(rels));
    }
}

pub fn compute_population_psych_stats(population: &[Individual], gini: f64) -> Value {
    let living: Vec<&Individual> = population.iter().filter(|i| !i.is_dead && i.psychology.is_object()).collect();
    if living.is_empty() {
        return json!({ "mean_wellbeing": 0.0, "mean_stress": 0.0, "happiness_index": 0.0 });
    }
    let mw = living.iter().map(|i| i.psychology.get("wellbeing").and_then(|v| v.as_f64()).unwrap_or(0.0)).sum::<f64>() / living.len() as f64;
    let ms = living.iter().map(|i| i.psychology.get("stress_level").and_then(|v| v.as_f64()).unwrap_or(0.0)).sum::<f64>() / living.len() as f64;
    let gini_penalty = (gini - 0.30).max(0.0) * 0.5;
    json!({
        "mean_wellbeing": mw,
        "mean_stress": ms,
        "happiness_index": ((mw + (1.0 - ms)) / 2.0 - gini_penalty).clamp(0.0, 1.0)
    })
}
