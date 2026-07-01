use serde_json::{json, Value};

use crate::state::Individual;

const LOCI: &[(&str, bool, f64)] = &[
    ("HPA_AXIS", true, 0.3),
    ("BDNF_PROMOTER", true, 0.2),
    ("MAOA_REGULATION", false, 0.4),
    ("LEPTIN_RESIST", true, 0.5),
    ("INSULIN_SENS", true, 0.35),
    ("OXTR_METHYL", true, 0.45),
    ("AVP_REGULATION", true, 0.3),
    ("IMMUNE_PRIMING", false, 0.6),
];

pub fn initialize_epigenome(individual: &mut Individual) {
    let mut map = serde_json::Map::new();
    for (id, _, _) in LOCI {
        map.insert((*id).to_string(), json!({ "methylation": 0.5, "last_modified": Value::Null }));
    }
    individual.epigenome = Value::Object(map);
}

pub fn inherit_epigenome(child: &mut Individual, p1: &mut Individual, p2: &mut Individual) {
    if !p1.epigenome.is_object() {
        initialize_epigenome(p1);
    }
    if !p2.epigenome.is_object() {
        initialize_epigenome(p2);
    }
    let mut map = serde_json::Map::new();
    for (id, _, h) in LOCI {
        let m1 = p1.epigenome.get(*id).and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
        let m2 = p2.epigenome.get(*id).and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
        let methylation = (0.5 + (((m1 + m2) / 2.0) - 0.5) * h).clamp(0.0, 1.0);
        map.insert((*id).to_string(), json!({ "methylation": methylation, "last_modified": 0 }));
    }
    child.epigenome = Value::Object(map);
}

pub fn update_epigenome(individual: &mut Individual, _env: Option<&Value>, sim_day: i32) {
    if !individual.epigenome.is_object() {
        initialize_epigenome(individual);
    }
    let stress = individual.psychology.get("stress_level").and_then(|v| v.as_f64()).unwrap_or(0.3);
    let nutrition = individual.extra.get("satiation").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let social = if individual.group_id.is_some() { 0.6 } else { 0.2 };
    mod_locus(individual, "HPA_AXIS", if stress > 0.7 { 0.02 } else { -0.005 }, sim_day);
    mod_locus(individual, "LEPTIN_RESIST", if nutrition < 0.3 { 0.01 } else { -0.005 }, sim_day);
    mod_locus(individual, "OXTR_METHYL", if social < 0.3 { 0.01 } else { -0.01 }, sim_day);
    if (individual.age_days.unwrap_or(0) as f64) / 365.0 < 5.0 && stress > 0.6 {
        mod_locus(individual, "MAOA_REGULATION", 0.03, sim_day);
    }
    if individual.extra.get("infections").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false) {
        mod_locus(individual, "IMMUNE_PRIMING", 0.02, sim_day);
    }
    if nutrition < 0.2 {
        mod_locus(individual, "BDNF_PROMOTER", 0.015, sim_day);
    } else if nutrition > 0.7 {
        mod_locus(individual, "BDNF_PROMOTER", -0.003, sim_day);
    }
    mod_locus(individual, "INSULIN_SENS", if nutrition < 0.3 { 0.01 } else { -0.005 }, sim_day);
    let hydration = individual.health.get("hydration").and_then(|v| v.as_f64()).unwrap_or(0.8);
    let isolated = individual.group_id.is_none();
    mod_locus(individual, "AVP_REGULATION", if hydration < 0.3 || isolated { 0.01 } else { -0.005 }, sim_day);
    apply_fx(individual);
}

fn mod_locus(individual: &mut Individual, id: &str, delta: f64, sim_day: i32) {
    let Some((_, reversible, _)) = LOCI.iter().find(|(k, _, _)| *k == id) else { return };
    if !individual.epigenome.is_object() {
        initialize_epigenome(individual);
    }
    let Some(obj) = individual.epigenome.as_object_mut() else { return };
    let locus = obj.entry(id.to_string()).or_insert_with(|| json!({ "methylation": 0.5, "last_modified": null }));
    let Some(meth) = locus.get("methylation").and_then(|v| v.as_f64()) else { return };
    if !*reversible && delta < 0.0 {
        return;
    }
    *locus = json!({
        "methylation": (meth + delta).clamp(0.0, 1.0),
        "last_modified": sim_day
    });
}

fn apply_fx(ind: &mut Individual) {
    let get = |k: &str| ind.epigenome.get(k).and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
    let p = ind.phenotype.as_object_mut();
    if let Some(p) = p {
        let stress_reactivity = p.get("stress_reactivity").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.99 + get("HPA_AXIS") * 0.01;
        p.insert("stress_reactivity".to_string(), json!(stress_reactivity));
        let aggression = p.get("aggression").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.999 + get("MAOA_REGULATION") * 0.001;
        p.insert("aggression".to_string(), json!(aggression.clamp(0.0, 1.0)));
        let ox = p.get("oxytocin_sensitivity").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.99 + (1.0 - get("OXTR_METHYL")) * 0.01;
        p.insert("oxytocin_sensitivity".to_string(), json!(ox));
        let lr = p.get("learning_rate").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.99 + (1.0 - get("BDNF_PROMOTER")) * 0.01;
        p.insert("learning_rate".to_string(), json!(lr));
        let immune = p.get("immune_strength").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.99 + get("IMMUNE_PRIMING") * 0.01;
        p.insert("immune_strength".to_string(), json!(immune));
    }
}

pub fn compute_epigenetic_age(individual: &Individual) -> f64 {
    let age_days = individual.age_days.unwrap_or(individual.birth_day.abs()).max(0) as f64;
    let ca = age_days / 365.0;
    let hpa = individual.epigenome.get("HPA_AXIS").and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
    let lep = individual.epigenome.get("LEPTIN_RESIST").and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
    ca * (0.8 + ((hpa + lep) / 2.0) * 0.4)
}
