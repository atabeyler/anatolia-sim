use serde_json::{json, Value};

use crate::state::Individual;

pub const LANGUAGE_STAGES: &[(&str, f64, usize, i32)] = &[
    ("pre-linguistic", 0.0, 1, 0),
    ("gestural", 0.0, 3, 0),
    ("emotional-sounds", 0.4, 5, 1),
    ("proto-words", 0.55, 8, 4),
    ("syntax", 0.65, 15, 8),
    ("abstract", 0.72, 25, 15),
    ("writing", 0.80, 40, 25),
];

pub fn update_language_stage(individual: &mut Individual, group_size: usize, generation_count: i32) -> Value {
    if !individual.phenotype.is_object() || !individual.language.is_object() {
        return json!({ "upgraded": false });
    }
    let foxp2 = individual.language.get("foxp2_expression").and_then(|v| v.as_f64()).unwrap_or(
        individual.phenotype.get("language_capacity").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.1,
    );
    let current_stage = individual.language.get("stage").and_then(|v| v.as_i64()).unwrap_or(0) as usize;
    for (idx, (name, foxp2_min, group_min, gen_min)) in LANGUAGE_STAGES.iter().enumerate().rev() {
        if foxp2 >= *foxp2_min && group_size >= *group_min && generation_count >= *gen_min {
            if idx > current_stage {
                let next_stage = current_stage + 1;
                let next_name = LANGUAGE_STAGES[next_stage].0;
                if let Some(obj) = individual.language.as_object_mut() {
                    obj.insert("stage".to_string(), json!(next_stage as i32));
                    obj.insert("stage_name".to_string(), json!(next_name));
                    if next_stage >= 4 {
                        obj.insert("grammar".to_string(), json!(true));
                    }
                    if next_stage >= 6 {
                        obj.insert("writing".to_string(), json!(true));
                    }
                }
                return json!({ "upgraded": true, "prevStage": current_stage, "newStage": next_stage, "stageName": next_name });
            }
            let _ = name;
            break;
        }
    }
    json!({ "upgraded": false })
}

pub fn update_foxp2_expression(individual: &mut Individual, group_member_count: usize) {
    if !individual.phenotype.is_object() || !individual.language.is_object() {
        return;
    }
    let cap = individual.phenotype.get("language_capacity").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let current = individual.language.get("foxp2_expression").and_then(|v| v.as_f64()).unwrap_or(cap * 0.1);
    let social_gain = group_member_count.min(10) as f64 * 0.000015;
    let stage = individual.language.get("stage").and_then(|v| v.as_i64()).unwrap_or(0);
    let staging_gain = if stage > 0 { 0.000005 } else { 0.0 };
    if let Some(obj) = individual.language.as_object_mut() {
        obj.insert("foxp2_expression".to_string(), json!((current + social_gain + staging_gain).min(cap)));
    }
}

pub fn try_acquire_word_from_environment(individual: &mut Individual, concept: &str, group_id: &str) -> bool {
    let stage = individual.language.get("stage").and_then(|v| v.as_i64()).unwrap_or(0);
    if stage < 2 {
        return false;
    }
    if individual.language.get("vocabulary").and_then(|v| v.get(concept)).is_some() {
        return false;
    }
    let foxp2 = individual.language.get("foxp2_expression").and_then(|v| v.as_f64()).unwrap_or(0.0);
    if foxp2 < 0.35 {
        return false;
    }
    let iq = individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.5);
    if rand::random::<f64>() > foxp2 * iq * 0.15 {
        return false;
    }
    let word = generate_proto_word(concept, group_id);
    if !individual.language.is_object() {
        return false;
    }
    let vocab = individual
        .language
        .as_object_mut()
        .and_then(|obj| obj.get_mut("vocabulary"))
        .and_then(|v| v.as_object_mut());
    if let Some(vocab) = vocab {
        vocab.insert(concept.to_string(), json!(word.clone()));
    }
    true
}

pub fn learn_from_teacher(learner: &mut Individual, teacher: &Individual) {
    let Some(tvocab) = teacher.language.get("vocabulary").and_then(|v| v.as_object()) else { return };
    if tvocab.is_empty() || !learner.language.is_object() {
        return;
    }
    let foxp2 = learner.language.get("foxp2_expression").and_then(|v| v.as_f64()).unwrap_or(0.0);
    if foxp2 < 0.25 {
        return;
    }
    let max_learn = (learner.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.5) * 3.0).floor() as usize;
    let vocab = learner.language.as_object_mut().and_then(|obj| obj.get_mut("vocabulary")).and_then(|v| v.as_object_mut());
    if let Some(vocab) = vocab {
        for (idx, (word, value)) in tvocab.iter().enumerate() {
            if idx >= max_learn {
                break;
            }
            vocab.entry(word.clone()).or_insert_with(|| value.clone());
        }
    }
}

pub fn generate_proto_word(concept: &str, group_id: &str) -> String {
    let seed = hash_str(&(concept.to_string() + group_id));
    let c = b"bdfghjklmnprstvwz";
    let v = b"aeiou";
    let len = 1 + (seed % 3) as usize;
    let mut word = String::new();
    for i in 0..len {
        word.push(c[((seed * (i as u32 + 1) * 7) as usize) % c.len()] as char);
        word.push(v[((seed * (i as u32 + 1) * 13) as usize) % v.len()] as char);
    }
    word
}

fn hash_str(str_: &str) -> u32 {
    let mut h: i32 = 0;
    for ch in str_.chars() {
        h = ((h << 5) - h) + ch as i32;
    }
    h.unsigned_abs()
}

pub const CORE_CONCEPTS: &[&str] = &[
    "danger","food","water","fire","here","there","me","you","us","them","good","bad",
    "hunt","eat","sleep","die","born","run","sun","moon","rain","dark","light","god",
    "spirit","sky","earth","time",
];

pub fn get_language_summary(population: &[Individual]) -> Value {
    let mut map = serde_json::Map::new();
    for ind in population {
        if !ind.alive {
            continue;
        }
        let stage = ind.language.get("stage_name").and_then(|v| v.as_str()).unwrap_or("pre-linguistic");
        *map.entry(stage.to_string()).or_insert_with(|| json!(0)) = json!(map.get(stage).and_then(|v| v.as_i64()).unwrap_or(0) + 1);
    }
    Value::Object(map)
}
