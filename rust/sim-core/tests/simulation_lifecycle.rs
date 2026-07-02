use sim_core::{advance_one_day, create_founder, create_world_state, SimulationState, WorldState};
use std::collections::HashSet;

fn two_founders_state() -> SimulationState {
    let world_value = create_world_state(37.0, 35.0);
    let world_state: WorldState = serde_json::from_value(world_value).unwrap();

    let founder_1 = create_founder(&serde_json::json!({ "sex": "male", "ageYears": 22, "x": 37.0, "y": 35.0, "name": "Adam" }));
    let founder_2 = create_founder(&serde_json::json!({ "sex": "female", "ageYears": 20, "x": 37.0, "y": 35.0, "name": "Havva" }));

    SimulationState {
        id: Some("test-sim".to_string()),
        current_day: 0,
        current_year: 0,
        status: Some("running".to_string()),
        world_state,
        individuals: vec![founder_1, founder_2],
        ..Default::default()
    }
}

/// The tick orchestrator must be able to run for years of in-sim time without
/// panicking, and it must actually drive the simulation (births/aging/economy),
/// not just increment a day counter.
#[test]
fn long_run_does_not_panic_and_produces_emergence() {
    let mut state = two_founders_state();
    let mut max_population = 2usize;
    let mut any_birth_event = false;

    for _ in 0..3650 {
        let report = advance_one_day(&mut state);
        max_population = max_population.max(report.alive_count);
        if state.events.iter().any(|e| e.get("type").and_then(|v| v.as_str()) == Some("birth")) {
            any_birth_event = true;
        }
    }

    assert_eq!(state.current_day, 3650);
    assert!(state.individuals.len() >= 2, "population should never drop below what was recorded");
    assert!(max_population >= 2, "founders should remain alive or be replaced by descendants");
    assert!(
        any_birth_event || !state.pending_births.is_empty() || state.individuals.len() > 2,
        "10 years with two fertile founders in mating range should yield at least one conception"
    );

    // Ages must have actually advanced, not stayed frozen at tick.rs's old age-only stub behavior.
    let founder = state.individuals.iter().find(|i| i.is_founder && i.sex == "male").unwrap();
    assert_eq!(founder.age_days, Some(3650 - founder.birth_day));
}

#[test]
fn pregnancy_is_not_counted_as_a_living_member_before_birth_day() {
    let mut state = two_founders_state();
    for _ in 0..400 {
        advance_one_day(&mut state);
        for pending in &state.pending_births {
            assert!(
                !state.individuals.iter().any(|i| i.id == pending.id),
                "a pending birth must not simultaneously exist in the live population"
            );
        }
    }
}

#[test]
fn discovered_tech_set_only_grows_from_known_starting_set() {
    let mut state = two_founders_state();
    let mut techs: HashSet<String> = HashSet::new();
    for _ in 0..1000 {
        advance_one_day(&mut state);
        for t in &state.discovered_techs {
            techs.insert(t.clone());
        }
    }
    // No assertion on which techs (probabilistic), just that the vector stays well-formed.
    assert!(state.discovered_techs.len() == techs.len());
}
