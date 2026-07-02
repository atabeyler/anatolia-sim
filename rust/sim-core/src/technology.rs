use std::collections::HashSet;

use crate::state::Individual;

use serde_json::json;

pub const TECH_TREE: &[(&str, i32, &[&str], f64, f64, &str, Option<i32>)] = &[
    ("fire_making", 0, &[], 0.8, 0.3, "any", None),
    ("stone_tools", 0, &[], 0.6, 0.25, "any", None),
    ("foraging", 0, &[], 0.3, 0.2, "any", None),
    ("hunting_spear", 1, &["stone_tools"], 1.2, 0.35, "fauna_present", None),
    ("shelter_basic", 1, &[], 0.9, 0.3, "cold_or_rain", None),
    ("water_container", 1, &["stone_tools"], 1.0, 0.3, "water_need", None),
    ("animal_trap", 1, &["stone_tools"], 1.3, 0.4, "fauna_present", None),
    ("clothing_basic", 1, &[], 1.1, 0.3, "cold", None),
    ("swimming", 1, &[], 1.0, 0.25, "water_nearby", None),
    ("fishing", 2, &["stone_tools"], 1.4, 0.4, "water_nearby", None),
    ("plant_cultivation", 2, &["foraging"], 2.0, 0.5, "seasonal_plants", None),
    ("animal_herding", 2, &["animal_trap"], 2.5, 0.55, "herdable_animals", None),
    ("food_preservation", 2, &["fire_making"], 1.8, 0.45, "any", None),
    ("bow_arrow", 2, &["hunting_spear"], 2.2, 0.5, "any", None),
    ("pottery", 3, &["plant_cultivation", "fire_making"], 3.0, 0.55, "clay_nearby", None),
    ("weaving", 3, &["clothing_basic"], 2.8, 0.5, "plant_fibers", None),
    ("metallurgy_copper", 3, &["fire_making", "stone_tools"], 4.0, 0.6, "copper_ore", None),
    ("writing_system", 3, &["pottery"], 5.0, 0.7, "trade_need", Some(5)),
    ("calendar", 3, &["plant_cultivation"], 3.5, 0.6, "any", Some(4)),
    ("mathematics_basic", 3, &["writing_system"], 4.5, 0.65, "any", None),
    ("architecture_stone", 4, &["metallurgy_copper"], 5.5, 0.65, "stone_available", None),
    ("wheel", 4, &["metallurgy_copper"], 5.0, 0.65, "any", None),
    ("irrigation", 4, &["plant_cultivation", "wheel"], 5.5, 0.65, "river_nearby", None),
    ("sailing", 4, &["fishing", "wheel"], 5.5, 0.65, "coastal_or_river", None),
    ("metallurgy_iron", 4, &["metallurgy_copper"], 6.0, 0.7, "iron_ore", None),
];

pub fn learn_tech_from_observation(individual: &mut Individual, nearby: &[Individual], discovered_techs: &mut HashSet<String>) {
    if individual.known_techs.is_empty() {
        individual.known_techs.push("swimming".to_string());
    }
    for other in nearby {
        if other.id == individual.id {
            continue;
        }
        for tech_id in &other.known_techs {
            if individual.known_techs.contains(tech_id) {
                continue;
            }
            let Some((_, _, requires, difficulty, iq_min, _, _)) = TECH_TREE.iter().find(|(id, ..)| *id == tech_id.as_str()) else { continue };
            if individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.0) < *iq_min {
                continue;
            }
            if !requires.iter().all(|r| individual.known_techs.contains(&r.to_string())) {
                continue;
            }
            let rate = (individual.phenotype.get("curiosity").and_then(|v| v.as_f64()).unwrap_or(0.5)
                * individual.phenotype.get("fluid_intelligence").and_then(|v| v.as_f64()).unwrap_or(0.5)
                * (0.5 + individual.phenotype.get("learning_rate").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.5))
                / (difficulty * 2000.0);
            if rand::random::<f64>() < rate {
                individual.known_techs.push(tech_id.clone());
                discovered_techs.insert(tech_id.clone());
            }
        }
    }
}

pub fn known_techs_json(individual: &Individual) -> serde_json::Value {
    json!(individual.known_techs)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn capable_individual(id: &str, techs: &[&str]) -> Individual {
        Individual {
            id: id.to_string(),
            known_techs: techs.iter().map(|s| s.to_string()).collect(),
            phenotype: json!({ "fluid_intelligence": 0.9, "curiosity": 0.9, "learning_rate": 0.9 }),
            ..Default::default()
        }
    }

    #[test]
    fn an_individual_never_learns_a_tech_that_no_nearby_peer_knows() {
        // Cardinal rule: tech can only be learned by observing a nearby peer who
        // personally knows it. With no nearby individuals at all, nothing may appear.
        let mut learner = capable_individual("solo", &[]);
        let mut discovered = HashSet::new();
        for _ in 0..1000 {
            learn_tech_from_observation(&mut learner, &[], &mut discovered);
        }
        assert!(learner.known_techs.iter().all(|t| t == "swimming"));
        assert!(discovered.is_empty());
    }

    #[test]
    fn learning_a_tech_requires_its_prerequisites_to_already_be_known() {
        // hunting_spear requires stone_tools; observing someone who has hunting_spear
        // but not stone_tools should never transmit it.
        let teacher = capable_individual("teacher", &["hunting_spear"]);
        let mut learner = capable_individual("learner", &[]);
        let mut discovered = HashSet::new();
        for _ in 0..2000 {
            learn_tech_from_observation(&mut learner, std::slice::from_ref(&teacher), &mut discovered);
        }
        assert!(!learner.known_techs.contains(&"hunting_spear".to_string()));
    }

    #[test]
    fn a_known_tech_can_eventually_be_learned_from_a_nearby_peer_who_knows_it() {
        let teacher = capable_individual("teacher", &["stone_tools"]);
        let mut learner = capable_individual("learner", &[]);
        let mut discovered = HashSet::new();
        let mut learned = false;
        for _ in 0..5000 {
            learn_tech_from_observation(&mut learner, std::slice::from_ref(&teacher), &mut discovered);
            if learner.known_techs.contains(&"stone_tools".to_string()) {
                learned = true;
                break;
            }
        }
        assert!(learned, "a capable learner near a knowledgeable peer should eventually pick up stone_tools");
        assert!(discovered.contains("stone_tools"));
    }

    #[test]
    fn own_known_techs_are_never_relearned_or_duplicated() {
        let teacher = capable_individual("teacher", &["stone_tools"]);
        let mut learner = capable_individual("learner", &["stone_tools"]);
        let mut discovered = HashSet::new();
        for _ in 0..200 {
            learn_tech_from_observation(&mut learner, std::slice::from_ref(&teacher), &mut discovered);
        }
        assert_eq!(learner.known_techs.iter().filter(|t| *t == "stone_tools").count(), 1);
    }
}
