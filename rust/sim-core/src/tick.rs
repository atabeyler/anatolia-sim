use crate::{SimulationState, TickReport};
use rayon::prelude::*;

pub fn advance_one_day(state: &mut SimulationState) -> TickReport {
    state.current_day += 1;
    state.current_year = state.current_day / 365;

    let current_day = state.current_day;
    let updated_age_count: usize = state
        .individuals
        .par_iter_mut()
        .map(|individual| {
            if !individual.alive || individual.is_dead {
                return 0;
            }
            individual.age_days = Some(current_day - individual.birth_day);
            1
        })
        .sum();

    let alive_count = state.alive_count();
    state.world_state.alive_count = Some(alive_count);
    state.world_state.current_day = Some(state.current_day);
    state.world_state.current_year = Some(state.current_year);

    TickReport {
        current_day: state.current_day,
        alive_count,
        updated_age_count,
    }
}
