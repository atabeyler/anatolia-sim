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

#[cfg(test)]
mod tests {
    use super::*;

    fn stressed_individual() -> Individual {
        Individual {
            psychology: json!({ "stress_level": 0.9 }),
            health: json!({ "hydration": 0.9 }),
            group_id: Some("g1".to_string()),
            age_days: Some(365 * 30),
            ..Default::default()
        }
    }

    #[test]
    fn irreversible_loci_never_decrease_even_under_relaxing_conditions() {
        // MAOA_REGULATION and IMMUNE_PRIMING are marked irreversible: once methylated,
        // no combination of low stress / good nutrition may lower them again.
        let mut ind = stressed_individual();
        ind.age_days = Some(1); // < 5 years old, high stress -> MAOA_REGULATION bump
        update_epigenome(&mut ind, None, 1);
        let maoa_after_stress = ind.epigenome["MAOA_REGULATION"]["methylation"].as_f64().unwrap();
        assert!(maoa_after_stress > 0.5, "high early-life stress should raise MAOA_REGULATION methylation");

        // Now flip to maximally relaxed conditions and tick many times.
        ind.psychology = json!({ "stress_level": 0.0 });
        ind.extra.insert("satiation".to_string(), json!(1.0));
        ind.health = json!({ "hydration": 1.0 });
        ind.group_id = Some("g1".to_string());
        for day in 2..500 {
            update_epigenome(&mut ind, None, day);
        }
        let maoa_after_relaxation = ind.epigenome["MAOA_REGULATION"]["methylation"].as_f64().unwrap();
        assert!(
            maoa_after_relaxation >= maoa_after_stress - 1e-9,
            "irreversible locus MAOA_REGULATION decreased from {maoa_after_stress} to {maoa_after_relaxation}"
        );
    }

    #[test]
    fn reversible_loci_can_both_rise_and_fall() {
        let mut ind = stressed_individual();
        update_epigenome(&mut ind, None, 1);
        let hpa_high_stress = ind.epigenome["HPA_AXIS"]["methylation"].as_f64().unwrap();

        ind.psychology = json!({ "stress_level": 0.0 });
        for day in 2..50 {
            update_epigenome(&mut ind, None, day);
        }
        let hpa_after_calm = ind.epigenome["HPA_AXIS"]["methylation"].as_f64().unwrap();
        assert!(hpa_after_calm < hpa_high_stress, "reversible HPA_AXIS should relax back down once stress drops");
    }

    #[test]
    fn methylation_is_driven_only_by_the_individuals_own_signals_not_external_injection() {
        // Cardinal rule (non-founder): epigenome may only move in response to the
        // individual's own internal state passed into update_epigenome, never by
        // another system writing the map directly. This test locks the *pathway*:
        // identical internal signals on two distinct individuals must produce
        // identical epigenetic outcomes (no hidden per-individual external inputs).
        let mut a = stressed_individual();
        let mut b = stressed_individual();
        for day in 1..30 {
            update_epigenome(&mut a, None, day);
            update_epigenome(&mut b, None, day);
        }
        assert_eq!(a.epigenome, b.epigenome);
    }

    #[test]
    fn inherit_epigenome_blends_parents_weighted_by_heritability() {
        let mut p1 = Individual::default();
        let mut p2 = Individual::default();
        initialize_epigenome(&mut p1);
        initialize_epigenome(&mut p2);
        p1.epigenome["HPA_AXIS"]["methylation"] = json!(0.9);
        p2.epigenome["HPA_AXIS"]["methylation"] = json!(0.9);
        let mut child = Individual::default();
        inherit_epigenome(&mut child, &mut p1, &mut p2);
        // heritability(HPA_AXIS) = 0.3, so a child of two 0.9 parents should land
        // partway between the population baseline (0.5) and the parental average,
        // never inheriting the full parental value directly.
        let child_hpa = child.epigenome["HPA_AXIS"]["methylation"].as_f64().unwrap();
        assert!(child_hpa > 0.5 && child_hpa < 0.9, "expected partial heritability, got {child_hpa}");
        let expected = 0.5 + (0.9 - 0.5) * 0.3;
        assert!((child_hpa - expected).abs() < 1e-9);
    }
}

pub fn compute_epigenetic_age(individual: &Individual) -> f64 {
    let age_days = individual.age_days.unwrap_or(individual.birth_day.abs()).max(0) as f64;
    let ca = age_days / 365.0;
    let hpa = individual.epigenome.get("HPA_AXIS").and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
    let lep = individual.epigenome.get("LEPTIN_RESIST").and_then(|v| v.get("methylation")).and_then(|v| v.as_f64()).unwrap_or(0.5);
    ca * (0.8 + ((hpa + lep) / 2.0) * 0.4)
}
