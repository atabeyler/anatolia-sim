use serde_json::Value;

use crate::state::Individual;

use super::individual::get_age;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DeathCause {
    Infection,
    Trauma,
    Starvation,
    Dehydration,
    BirthComplications,
    GeneticDisease,
    OldAge,
    Predator,
    Conflict,
    Drowning,
}

pub fn compute_daily_death_risk(individual: &Individual, current_day: i32, environment: Option<&Value>) -> f64 {
    let age = get_age(individual, current_day);
    let health = &individual.health;
    let phenotype = &individual.phenotype;

    let mut base_risk = if age < 1.0 {
        0.00022
    } else if age < 5.0 {
        0.00010
    } else if age < 15.0 {
        0.000027
    } else if age < 45.0 {
        0.000027
    } else if age < 60.0 {
        0.000069
    } else if age < 75.0 {
        0.00023
    } else {
        0.00061
    };

    let alive_count = environment
        .and_then(|env| env.get("alive_count"))
        .and_then(|v| v.as_f64())
        .unwrap_or(100.0);
    if alive_count < 25.0 {
        base_risk *= (alive_count / 25.0).max(0.25);
    }

    if age >= phenotype.get("max_lifespan").and_then(|v| v.as_f64()).unwrap_or(90.0) {
        base_risk += 0.03;
    }
    if health.get("hp").and_then(|v| v.as_f64()).unwrap_or(1.0) < 0.2 {
        base_risk *= if individual.is_founder { 1.8 } else { 3.0 };
    }
    if health.get("calories").and_then(|v| v.as_f64()).unwrap_or(1.0) < 0.1 {
        base_risk *= if individual.is_founder { 2.5 } else { 5.0 };
    }
    if health.get("hydration").and_then(|v| v.as_f64()).unwrap_or(1.0) < 0.1 {
        base_risk *= if individual.is_founder { 5.0 } else { 10.0 };
    }

    let immune_strength = phenotype.get("immune_strength").and_then(|v| v.as_f64()).unwrap_or(0.5);
    base_risk *= 1.0 - immune_strength * 0.3;

    let resilience = (phenotype.get("stress_resilience").and_then(|v| v.as_f64()).unwrap_or(0.5)
        + phenotype.get("health_resilience").and_then(|v| v.as_f64()).unwrap_or(0.5))
        / 2.0;
    base_risk *= 1.0 - (resilience - 0.5) * 0.25;

    if individual._water_fear() > 0.0 {
        base_risk += 0.05 * (1.0 - individual._water_experience().min(0.9) * 0.9);
    }

    if environment.is_some() {
        base_risk += 0.0002;
    }

    if individual.inbreeding_coeff.unwrap_or(0.0) > 0.50 {
        base_risk *= 1.25;
    }

    if individual.is_founder {
        base_risk *= 0.5;
    }

    base_risk.min(0.99)
}

pub fn roll_death(individual: &Individual, current_day: i32, environment: Option<&Value>) -> Option<DeathCause> {
    if rand::random::<f64>() < compute_daily_death_risk(individual, current_day, environment) {
        Some(determine_cause(individual, current_day, environment))
    } else {
        None
    }
}

fn determine_cause(individual: &Individual, current_day: i32, environment: Option<&Value>) -> DeathCause {
    let age = get_age(individual, current_day);
    let health = &individual.health;
    let phenotype = &individual.phenotype;

    if individual._in_water() {
        return DeathCause::Drowning;
    }
    if health.get("hydration").and_then(|v| v.as_f64()).unwrap_or(1.0) < 0.1 {
        return DeathCause::Dehydration;
    }
    if health.get("calories").and_then(|v| v.as_f64()).unwrap_or(1.0) < 0.05 {
        return DeathCause::Starvation;
    }
    if age >= phenotype.get("max_lifespan").and_then(|v| v.as_f64()).unwrap_or(90.0) - 5.0 {
        return DeathCause::OldAge;
    }
    if environment.is_some() {
        return DeathCause::Predator;
    }
    DeathCause::Trauma
}

trait IndividualExt {
    fn _water_fear(&self) -> f64;
    fn _water_experience(&self) -> f64;
    fn _in_water(&self) -> bool;
}

impl IndividualExt for Individual {
    fn _water_fear(&self) -> f64 {
        self.extra.get("_waterFear").and_then(|v| v.as_f64()).unwrap_or(0.0)
    }
    fn _water_experience(&self) -> f64 {
        self.extra.get("_waterExperience").and_then(|v| v.as_f64()).unwrap_or(0.0)
    }
    fn _in_water(&self) -> bool {
        self.extra.get("_inWater").and_then(|v| v.as_bool()).unwrap_or(false)
    }
}
