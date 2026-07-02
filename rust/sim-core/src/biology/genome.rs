use rand::Rng;
use serde_json::{json, Map, Value};
use std::collections::HashMap;

const LOCI: &[(&str, &str, &str)] = &[
    ("BDNF_01", "neural_plasticity", "codominant"),
    ("COMT_01", "working_memory", "codominant"),
    ("DTNBP1_01", "fluid_intelligence", "codominant"),
    ("NRG1_01", "cognitive_speed", "codominant"),
    ("DISC1_01", "executive_function", "codominant"),
    ("FOXP2_01", "language_capacity", "codominant"),
    ("CNTNAP2_01", "language_learning", "codominant"),
    ("OXTR_01", "social_bonding", "codominant"),
    ("SLC6A4_01", "serotonin_transport", "codominant"),
    ("DRD4_01", "curiosity", "codominant"),
    ("MAOA_01", "aggression", "x_linked"),
    ("NRXN1_01", "self_awareness", "codominant"),
    ("SHANK3_01", "prefrontal_dev", "codominant"),
    ("RELN_01", "theory_of_mind", "codominant"),
    ("HEIGHT_01", "height", "polygenic"),
    ("HEIGHT_02", "height", "polygenic"),
    ("HEIGHT_03", "height", "polygenic"),
    ("STRENGTH_01", "physical_strength", "codominant"),
    ("METABOLISM_01", "metabolism", "codominant"),
    ("IMMUNE_01", "immune_strength", "codominant"),
    ("IMMUNE_02", "immune_breadth", "codominant"),
    ("TERT_01", "telomere_length", "codominant"),
    ("APOE_01", "longevity", "codominant"),
    ("DRD2_01", "motivation", "codominant"),
    ("AVPR1A_01", "pair_bonding", "codominant"),
    ("ACTN3_01", "muscle_fiber_type", "codominant"),
    ("ADRA2B_01", "memory_consolidation", "codominant"),
    ("CACNA1C_01", "novelty_seeking", "codominant"),
    ("FSHR_01", "fertility", "codominant"),
    ("HERC2_01", "eye_color", "dominant"),
    ("MC1R_01", "hair_color", "codominant"),
    ("SLC24A5_01", "skin_pigmentation", "dominant"),
];

fn random_allele() -> f64 {
    rand::thread_rng().gen_range(0.1..0.9)
}

fn locus_value(genome: &Value, locus_id: &str, default: f64) -> (f64, f64) {
    let locus = genome.get(locus_id).unwrap_or(&Value::Null);
    let a1 = locus.get("a1").and_then(|v| v.as_f64()).unwrap_or(default);
    let a2 = locus.get("a2").and_then(|v| v.as_f64()).unwrap_or(default);
    (a1, a2)
}

fn pick_value(genome: &Value, locus_id: &str, default: f64) -> f64 {
    let (a1, a2) = locus_value(genome, locus_id, default);
    (a1 + a2) / 2.0
}

fn apply_mutation(value: f64, stress_multiplier: f64) -> f64 {
    let mutation_prob = (2.0 / LOCI.len() as f64) * stress_multiplier;
    if rand::random::<f64>() < mutation_prob {
        let effect = (rand::random::<f64>() - 0.5) * 0.1;
        (value + effect).clamp(0.0, 1.0)
    } else {
        value
    }
}

pub fn create_genome(overrides: Option<&Map<String, Value>>) -> Value {
    let mut chromosomes = Map::new();
    for (locus_id, trait_name, expression_type) in LOCI {
        let default = 0.5;
        let a1 = overrides
            .and_then(|m| m.get(*locus_id))
            .and_then(|v| v.get("a1"))
            .and_then(|v| v.as_f64())
            .unwrap_or_else(random_allele);
        let a2 = overrides
            .and_then(|m| m.get(*locus_id))
            .and_then(|v| v.get("a2"))
            .and_then(|v| v.as_f64())
            .unwrap_or_else(random_allele);
        chromosomes.insert(
            (*locus_id).to_string(),
            json!({
                "locusId": locus_id,
                "chromosome": null,
                "allele1": { "value": a1, "origin": "paternal" },
                "allele2": { "value": a2, "origin": "maternal" },
                "expressionType": expression_type,
                "trait": trait_name,
            }),
        );
        let _ = default;
    }
    Value::Object(chromosomes)
}

pub fn create_gamete(genome: &Value, stress_multiplier: f64) -> Value {
    let mut gamete = Map::new();
    for (locus_id, _, _) in LOCI {
        let locus = genome.get(*locus_id);
        if let Some(locus) = locus {
            let a1 = locus
                .get("allele1")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_f64())
                .unwrap_or_else(random_allele);
            let a2 = locus
                .get("allele2")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_f64())
                .unwrap_or_else(random_allele);
            let chosen = if rand::random::<f64>() < 0.5 { a2 } else { a1 };
            gamete.insert((*locus_id).to_string(), json!(apply_mutation(chosen, stress_multiplier)));
        }
    }
    Value::Object(gamete)
}

pub fn combine_gametes(gamete1: &Value, gamete2: &Value, child_sex: &str) -> Value {
    let mut genome = Map::new();
    for (locus_id, trait_name, expression_type) in LOCI {
        let a1 = gamete1.get(*locus_id).and_then(|v| v.as_f64()).unwrap_or_else(random_allele);
        let a2 = gamete2.get(*locus_id).and_then(|v| v.as_f64()).unwrap_or_else(random_allele);
        let is_x_linked = *expression_type == "x_linked";
        let is_male = child_sex == "male";
        let allele1 = if is_male && is_x_linked { a2 } else { a1 };
        genome.insert(
            (*locus_id).to_string(),
            json!({
                "locusId": locus_id,
                "chromosome": null,
                "allele1": { "value": allele1, "origin": if is_male && is_x_linked { "maternal" } else { "paternal" } },
                "allele2": if is_male && is_x_linked { json!({ "value": null, "origin": "hemizygous" }) } else { json!({ "value": a2, "origin": "maternal" }) },
                "expressionType": if is_male && is_x_linked { "hemizygous" } else { expression_type },
                "trait": trait_name,
            }),
        );
    }
    Value::Object(genome)
}

pub fn compute_phenotype(genome: &Value) -> Value {
    let g = |locus: &str| pick_value(genome, locus, 0.5);
    let height_base = (g("HEIGHT_01") + g("HEIGHT_02") + g("HEIGHT_03")) / 3.0;
    let language_capacity = (g("FOXP2_01") * 0.75 + g("CNTNAP2_01") * 0.25).min(1.0);
    let fluid_intelligence = (g("BDNF_01") + g("COMT_01") + g("DTNBP1_01") + g("NRG1_01") + g("DISC1_01")) / 5.0;
    let consciousness_potential = (g("NRXN1_01") + g("SHANK3_01") + g("RELN_01") + g("FOXP2_01")) / 4.0;
    let belief_capacity = ((consciousness_potential - 0.1) / 0.9).max(0.0);
    let immune_strength = (g("IMMUNE_01") + g("IMMUNE_02")) / 2.0;
    let max_lifespan = 50.0 + g("TERT_01") * 50.0 + g("APOE_01") * 20.0;

    json!({
        "height_factor": height_base,
        "physical_strength": (g("STRENGTH_01") * 0.5 + g("HEIGHT_01") * 0.25 + g("METABOLISM_01") * 0.25).min(1.0),
        "physical_endurance": g("METABOLISM_01"),
        "endurance": (g("ACTN3_01") * 0.5 + g("METABOLISM_01") * 0.3 + g("STRENGTH_01") * 0.2).min(1.0),
        "fluid_intelligence": fluid_intelligence,
        "working_memory": g("COMT_01"),
        "conscientiousness": g("DISC1_01"),
        "learning_rate": (g("ADRA2B_01") * 0.4 + g("BDNF_01") * 0.35 + g("COMT_01") * 0.25).min(1.0),
        "language_capacity": language_capacity,
        "language_learning": g("CNTNAP2_01"),
        "social_bonding": g("OXTR_01"),
        "social_drive": (g("DRD2_01") * 0.5 + g("OXTR_01") * 0.5).min(1.0),
        "oxytocin_sensitivity": g("OXTR_01"),
        "empathy": (g("OXTR_01") + g("RELN_01")) / 2.0,
        "cooperation": (g("AVPR1A_01") * 0.5 + g("OXTR_01") * 0.35 + (1.0 - g("MAOA_01")) * 0.15).min(1.0),
        "altruism": (g("OXTR_01") * 0.7 + (1.0 - g("MAOA_01")) * 0.3).max(0.0),
        "parental_care": (g("OXTR_01") * 0.6 + g("AVPR1A_01") * 0.4).min(1.0),
        "aggression": g("MAOA_01"),
        "dominance": (g("DRD2_01") * 0.5 + g("MAOA_01") * 0.3 + g("DISC1_01") * 0.2).min(1.0),
        "curiosity": g("DRD4_01"),
        "risk_tolerance": (g("CACNA1C_01") * 0.55 + g("DRD4_01") * 0.35 + (1.0 - g("SLC6A4_01")) * 0.1).min(1.0),
        "innovation": ((g("CACNA1C_01") + fluid_intelligence + g("DRD4_01")) / 3.0).min(1.0),
        "artistic_sense": (consciousness_potential + g("DRD4_01")) / 2.0,
        "serotonin": g("SLC6A4_01"),
        "stress_resilience": g("SLC6A4_01"),
        "health_resilience": (g("SLC6A4_01") * 0.4 + g("STRENGTH_01") * 0.3 + g("TERT_01") * 0.3).min(1.0),
        "anxiety": (1.0 - g("SLC6A4_01")).max(0.0),
        "independence": (g("DRD4_01") + fluid_intelligence) / 2.0,
        "xenophobia": ((1.0 - g("OXTR_01") + g("MAOA_01")) / 2.0).max(0.0),
        "metabolism": g("METABOLISM_01"),
        "immune_strength": immune_strength,
        "max_lifespan": max_lifespan.round() as i64,
        "fertility": g("FSHR_01"),
        "consciousness_potential": consciousness_potential,
        "belief_capacity": belief_capacity,
        "religiosity": (belief_capacity * 0.6 + (1.0 - g("SLC6A4_01")) * 0.4).min(1.0),
        "self_awareness": (g("NRXN1_01") + g("SHANK3_01")) / 2.0,
        "eye_color": if g("HERC2_01") > 0.5 { "brown" } else { "blue" },
        "hair_color": if g("MC1R_01") > 0.6 { "dark" } else if g("MC1R_01") > 0.3 { "medium" } else { "light" },
        "skin_tone": g("SLC24A5_01"),
    })
}

pub fn compute_inbreeding_coefficient(individual: &crate::state::Individual, population: &HashMap<String, crate::state::Individual>) -> f64 {
    let Some(p1) = individual.parent_1_id.as_ref() else { return 0.0 };
    let Some(p2) = individual.parent_2_id.as_ref() else { return 0.0 };
    let Some(parent1) = population.get(p1) else { return 0.0 };
    let Some(parent2) = population.get(p2) else { return 0.0 };

    let probs1 = ancestor_probs(parent1, population, 10);
    let probs2 = ancestor_probs(parent2, population, 10);
    let mut f = 0.0;
    for (anc_id, p1) in probs1 {
        if let Some(p2) = probs2.get(&anc_id) {
            let fa = population.get(&anc_id).and_then(|i| i.inbreeding_coeff).unwrap_or(0.0);
            f += 0.5 * p1 * p2 * (1.0 + fa);
        }
    }
    f.min(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::Individual;

    #[test]
    fn gamete_allele_without_mutation_is_always_one_of_the_two_parental_alleles() {
        let genome = create_genome(None);
        // stress_multiplier = 0.0 makes apply_mutation's probability exactly 0.
        for _ in 0..200 {
            let gamete = create_gamete(&genome, 0.0);
            for (locus_id, ..) in LOCI {
                let a1 = genome[*locus_id]["allele1"]["value"].as_f64().unwrap();
                let a2 = genome[*locus_id]["allele2"]["value"].as_f64().unwrap();
                let chosen = gamete[*locus_id].as_f64().unwrap();
                assert!(
                    (chosen - a1).abs() < 1e-9 || (chosen - a2).abs() < 1e-9,
                    "gamete allele for {locus_id} must come from a parental allele, got {chosen} vs ({a1}, {a2})"
                );
            }
        }
    }

    #[test]
    fn child_genome_is_built_only_from_the_two_gametes_no_third_source() {
        let g1 = create_gamete(&create_genome(None), 0.0);
        let g2 = create_gamete(&create_genome(None), 0.0);
        let child = combine_gametes(&g1, &g2, "female");
        for (locus_id, ..) in LOCI {
            assert_eq!(child[*locus_id]["allele1"]["value"], g1[*locus_id]);
            assert_eq!(child[*locus_id]["allele2"]["value"], g2[*locus_id]);
        }
    }

    #[test]
    fn x_linked_locus_gives_males_a_single_hemizygous_maternal_allele() {
        let g1 = create_gamete(&create_genome(None), 0.0); // paternal gamete
        let g2 = create_gamete(&create_genome(None), 0.0); // maternal gamete
        let son = combine_gametes(&g1, &g2, "male");
        // MAOA_01 is x_linked: a son must get it only from the maternal gamete (g2),
        // never the paternal one (g1), and allele2 must be absent (hemizygous).
        assert_eq!(son["MAOA_01"]["allele1"]["value"], g2["MAOA_01"]);
        assert_eq!(son["MAOA_01"]["expressionType"], "hemizygous");
        assert!(son["MAOA_01"]["allele2"]["value"].is_null());

        let daughter = combine_gametes(&g1, &g2, "female");
        assert_eq!(daughter["MAOA_01"]["allele1"]["value"], g1["MAOA_01"]);
        assert_eq!(daughter["MAOA_01"]["allele2"]["value"], g2["MAOA_01"]);
    }

    #[test]
    fn mutation_probability_zero_never_perturbs_the_value() {
        for _ in 0..500 {
            assert_eq!(apply_mutation(0.42, 0.0), 0.42);
        }
    }

    #[test]
    fn compute_phenotype_is_a_pure_function_of_the_genome() {
        let genome = create_genome(None);
        let p1 = compute_phenotype(&genome);
        let p2 = compute_phenotype(&genome);
        assert_eq!(p1, p2, "identical genome must always yield identical phenotype");
    }

    fn make_individual(id: &str, parent_1: Option<&str>, parent_2: Option<&str>, inbreeding: f64) -> Individual {
        Individual {
            id: id.to_string(),
            parent_1_id: parent_1.map(str::to_string),
            parent_2_id: parent_2.map(str::to_string),
            inbreeding_coeff: Some(inbreeding),
            ..Default::default()
        }
    }

    #[test]
    fn full_sibling_mating_yields_expected_inbreeding_coefficient() {
        // Unrelated founders -> two full siblings -> siblings mate -> their child.
        let mut population = HashMap::new();
        population.insert("dad".to_string(), make_individual("dad", None, None, 0.0));
        population.insert("mom".to_string(), make_individual("mom", None, None, 0.0));
        population.insert("sib1".to_string(), make_individual("sib1", Some("dad"), Some("mom"), 0.0));
        population.insert("sib2".to_string(), make_individual("sib2", Some("dad"), Some("mom"), 0.0));
        let child = make_individual("child", Some("sib1"), Some("sib2"), 0.0);

        let f = compute_inbreeding_coefficient(&child, &population);
        // Full-sibling mating classically gives F = 0.25.
        assert!((f - 0.25).abs() < 1e-6, "expected F ~= 0.25 for full-sibling mating, got {f}");
    }

    #[test]
    fn unrelated_parents_yield_zero_inbreeding_coefficient() {
        let mut population = HashMap::new();
        population.insert("a".to_string(), make_individual("a", None, None, 0.0));
        population.insert("b".to_string(), make_individual("b", None, None, 0.0));
        let child = make_individual("child", Some("a"), Some("b"), 0.0);
        assert_eq!(compute_inbreeding_coefficient(&child, &population), 0.0);
    }
}

fn ancestor_probs(start_ind: &crate::state::Individual, population: &HashMap<String, crate::state::Individual>, max_depth: usize) -> HashMap<String, f64> {
    let mut probs = HashMap::new();
    let mut stack = vec![(start_ind, 0usize)];
    let mut visited = std::collections::HashSet::new();
    while let Some((ind, depth)) = stack.pop() {
        if depth >= max_depth {
            continue;
        }
        for pid in [&ind.parent_1_id, &ind.parent_2_id] {
            let Some(pid) = pid else { continue };
            let Some(parent) = population.get(pid) else { continue };
            *probs.entry(pid.clone()).or_insert(0.0) += 0.5f64.powi((depth + 1) as i32);
            let key = format!("{pid}:{}", depth + 1);
            if visited.insert(key) {
                stack.push((parent, depth + 1));
            }
        }
    }
    probs
}
