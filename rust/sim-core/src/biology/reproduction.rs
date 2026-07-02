use crate::spatial::SpatialGrid;
use crate::state::Individual;
use rand::Rng;

use super::individual::{create_child, get_age, is_fertile};

const PREGNANCY_MIN: i32 = 266;
const MATING_RADIUS: f64 = 2.0;

pub fn check_reproduction(
    population: &[Individual],
    current_day: i32,
    simulation_id: &str,
    community_lang_stage: i32,
) -> Vec<Individual> {
    let mut newborns = Vec::new();
    let fertile_males: Vec<&Individual> = population
        .iter()
        .filter(|i| i.alive && i.sex == "male" && is_fertile(i, current_day))
        .collect();
    let male_positions: Vec<(f64, f64)> = fertile_males.iter().map(|m| (m.x, m.y)).collect();
    let male_grid = SpatialGrid::build(&male_positions, MATING_RADIUS);

    for female in population.iter().filter(|i| i.alive && i.sex == "female" && is_fertile(i, current_day)) {
        if female.health.get("pregnancy").is_some_and(|v| !v.is_null()) {
            continue;
        }
        let nearby_males: Vec<&Individual> = male_grid
            .candidates_within(female.x, female.y, MATING_RADIUS)
            .into_iter()
            .filter_map(|idx| fertile_males.get(idx).copied())
            .filter(|male| distance(male, female) < MATING_RADIUS)
            .collect();
        if nearby_males.is_empty() {
            continue;
        }
        let male = nearby_males[rand::thread_rng().gen_range(0..nearby_males.len())];
        let p = conception_probability(female, male, current_day);
        if rand::random::<f64>() < p {
            let mut child = create_child(female, male, current_day + PREGNANCY_MIN, simulation_id);
            if let Some(obj) = child.health.as_object_mut() {
                obj.insert("pregnancy".to_string(), serde_json::Value::Null);
            }
            newborns.push(child);
        }
    }

    let _ = community_lang_stage;
    newborns
}

fn conception_probability(female: &Individual, male: &Individual, current_day: i32) -> f64 {
    let age = get_age(female, current_day);
    let mut age_factor = 1.0;
    if age > 40.0 {
        age_factor = 0.2;
    } else if age > 35.0 {
        age_factor = 0.6;
    } else if age < 18.0 {
        age_factor = 0.3;
    } else if age < 20.0 {
        age_factor = 0.7;
    }
    let urge_factor = 0.6 + female.extra.get("mating_urge").and_then(|v| v.as_f64()).unwrap_or(0.5) * 0.4;
    let fertility = female.phenotype.get("fertility").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let inbreed_penalty = female.inbreeding_coeff.unwrap_or(0.0).max(male.inbreeding_coeff.unwrap_or(0.0));
    let mhc_bonus = 0.0;
    ((fertility * age_factor + mhc_bonus - inbreed_penalty * 0.5) * 0.09 * urge_factor).max(0.0)
}

fn distance(a: &Individual, b: &Individual) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt()
}
