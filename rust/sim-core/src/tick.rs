use std::collections::{HashMap, HashSet};

use rayon::prelude::*;
use serde_json::{json, Value};

use crate::{
    agent, architecture, art, astronomy, belief, biology, consciousness, culture, economy,
    environment, epigenetics, language, law, microbiome, psychology, social, spatial::SpatialGrid,
    technology, SimulationState, TickReport,
};

const GROUP_RADIUS: f64 = 3.0;
const NEARBY_RADIUS: f64 = 2.0;
const MATE_SEARCH_RADIUS: f64 = 4.0;
const MAX_EVENTS: usize = 200;
const DAILY_STEP: f64 = 0.015;

fn as_string_set(items: &[String]) -> HashSet<String> {
    items.iter().cloned().collect()
}

fn from_string_set(set: HashSet<String>) -> Vec<String> {
    let mut v: Vec<String> = set.into_iter().collect();
    v.sort();
    v
}

fn distance(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    ((ax - bx).powi(2) + (ay - by).powi(2)).sqrt()
}

/// Union-find over currently ungrouped, living individuals so nearby people cluster
/// into bands. Real settlements/groups then persist via `group_id` once formed.
fn form_groups(state: &mut SimulationState, current_day: i32) {
    let ungrouped_idx: Vec<usize> = state
        .individuals
        .iter()
        .enumerate()
        .filter(|(_, ind)| ind.alive && !ind.is_dead && ind.group_id.is_none())
        .map(|(i, _)| i)
        .collect();

    let group_centroids: Vec<(String, f64, f64)> = state
        .groups
        .iter()
        .filter_map(|g| {
            let id = g.get("id")?.as_str()?.to_string();
            let x = g.get("territory")?.get("x")?.as_f64()?;
            let y = g.get("territory")?.get("y")?.as_f64()?;
            Some((id, x, y))
        })
        .collect();

    let mut still_ungrouped = Vec::new();
    for idx in ungrouped_idx {
        let (ix, iy) = (state.individuals[idx].x, state.individuals[idx].y);
        let joined = group_centroids
            .iter()
            .find(|(_, gx, gy)| distance(ix, iy, *gx, *gy) < GROUP_RADIUS)
            .map(|(id, ..)| id.clone());
        if let Some(gid) = joined {
            state.individuals[idx].group_id = Some(gid.clone());
            state.individuals[idx].social = merge_field(&state.individuals[idx].social, "group_id", json!(gid.clone()));
            if let Some(group) = state.groups.iter_mut().find(|g| g.get("id").and_then(Value::as_str) == Some(gid.as_str())) {
                push_member(group, &state.individuals[idx].id);
            }
        } else {
            still_ungrouped.push(idx);
        }
    }

    // Cluster the rest via union-find, using a spatial grid so only nearby
    // pairs are ever distance-checked instead of every pair in the population.
    let n = still_ungrouped.len();
    let mut parent: Vec<usize> = (0..n).collect();
    fn find(parent: &mut [usize], i: usize) -> usize {
        if parent[i] != i {
            parent[i] = find(parent, parent[i]);
        }
        parent[i]
    }
    let local_positions: Vec<(f64, f64)> = still_ungrouped.iter().map(|&i| (state.individuals[i].x, state.individuals[i].y)).collect();
    let local_grid = SpatialGrid::build(&local_positions, GROUP_RADIUS);
    for a in 0..n {
        let (ax, ay) = local_positions[a];
        for b in local_grid.candidates_within(ax, ay, GROUP_RADIUS) {
            if b <= a {
                continue;
            }
            let (bx, by) = local_positions[b];
            if distance(ax, ay, bx, by) < GROUP_RADIUS {
                let ra = find(&mut parent, a);
                let rb = find(&mut parent, b);
                if ra != rb {
                    parent[ra] = rb;
                }
            }
        }
    }
    let mut clusters: HashMap<usize, Vec<usize>> = HashMap::new();
    for a in 0..n {
        let root = find(&mut parent, a);
        clusters.entry(root).or_default().push(still_ungrouped[a]);
    }
    for members in clusters.values() {
        if members.len() < 2 {
            continue;
        }
        let cx = members.iter().map(|&i| state.individuals[i].x).sum::<f64>() / members.len() as f64;
        let cy = members.iter().map(|&i| state.individuals[i].y).sum::<f64>() / members.len() as f64;
        let group_id = format!("group_{}_{}", current_day, uuid::Uuid::new_v4());
        let member_ids: Vec<Value> = members.iter().map(|&i| json!(state.individuals[i].id)).collect();
        let group = json!({
            "id": group_id,
            "member_ids": member_ids,
            "leader_id": Value::Null,
            "founded_day": current_day,
            "territory": { "x": cx, "y": cy },
            "internal_tension": 0.3,
            "norms": [],
            "culture": [],
        });
        state.groups.push(group);
        for &i in members {
            state.individuals[i].group_id = Some(group_id.clone());
            state.individuals[i].social = merge_field(&state.individuals[i].social, "group_id", json!(group_id.clone()));
        }
    }

    // Drop empty groups (all members dead/departed).
    state.groups.retain(|g| {
        g.get("member_ids")
            .and_then(Value::as_array)
            .map(|arr| !arr.is_empty())
            .unwrap_or(false)
    });
}

fn merge_field(target: &Value, key: &str, value: Value) -> Value {
    let mut obj = target.as_object().cloned().unwrap_or_default();
    obj.insert(key.to_string(), value);
    Value::Object(obj)
}

fn push_member(group: &mut Value, id: &str) {
    if let Some(obj) = group.as_object_mut() {
        let mut members = obj.get("member_ids").and_then(Value::as_array).cloned().unwrap_or_default();
        if !members.iter().any(|v| v.as_str() == Some(id)) {
            members.push(json!(id));
        }
        obj.insert("member_ids".to_string(), Value::Array(members));
    }
}

fn nearest_fertile_opposite_sex<'a>(
    ind: &crate::state::Individual,
    snapshot: &'a [crate::state::Individual],
    grid: &SpatialGrid,
    current_day: i32,
) -> Option<&'a crate::state::Individual> {
    grid.candidates_within(ind.x, ind.y, MATE_SEARCH_RADIUS)
        .into_iter()
        .filter_map(|idx| snapshot.get(idx))
        .filter(|other| {
            other.id != ind.id
                && other.alive
                && !other.is_dead
                && other.sex != ind.sex
                && biology::individual::is_fertile(other, current_day)
        })
        .min_by(|a, b| {
            distance(ind.x, ind.y, a.x, a.y)
                .partial_cmp(&distance(ind.x, ind.y, b.x, b.y))
                .unwrap_or(std::cmp::Ordering::Equal)
        })
}

/// Movement follows the priority order documented for the simulation: survival
/// stress (already expressed as the chosen action) -> band cohesion -> a
/// persisted wander heading -> mating drive. A move is only committed if the
/// destination is still on land, so bands never drift out into open ocean.
fn apply_movement(state: &mut SimulationState, snapshot: &[crate::state::Individual], grid: &SpatialGrid, current_day: i32) {
    let mut group_centroids: HashMap<String, (f64, f64, usize)> = HashMap::new();
    for ind in snapshot.iter().filter(|i| i.alive && !i.is_dead) {
        if let Some(gid) = &ind.group_id {
            let entry = group_centroids.entry(gid.clone()).or_insert((0.0, 0.0, 0));
            entry.0 += ind.x;
            entry.1 += ind.y;
            entry.2 += 1;
        }
    }
    let group_centroids: HashMap<String, (f64, f64)> = group_centroids
        .into_iter()
        .map(|(gid, (sx, sy, n))| (gid, (sx / n as f64, sy / n as f64)))
        .collect();

    for individual in state.individuals.iter_mut() {
        if !individual.alive || individual.is_dead {
            continue;
        }
        let action = individual.extra.get("_currentAction").and_then(Value::as_str).unwrap_or("explore").to_string();
        if action == "rest" || action == "craft" {
            continue;
        }
        let persisted_angle = individual.extra.get("_moveAngle").and_then(Value::as_f64).unwrap_or_else(|| rand::random::<f64>() * std::f64::consts::TAU);

        let (mut angle, mut step) = match action.as_str() {
            "flee" => (persisted_angle + std::f64::consts::PI + (rand::random::<f64>() - 0.5), DAILY_STEP * 4.0),
            "explore" => (persisted_angle + (rand::random::<f64>() - 0.5) * 1.2, DAILY_STEP * 2.5),
            "mate" => {
                if let Some(target) = nearest_fertile_opposite_sex(individual, snapshot, grid, current_day) {
                    ((target.y - individual.y).atan2(target.x - individual.x), DAILY_STEP)
                } else if let Some((cx, cy)) = individual.group_id.as_ref().and_then(|g| group_centroids.get(g)) {
                    ((cy - individual.y).atan2(cx - individual.x), DAILY_STEP)
                } else {
                    (persisted_angle, DAILY_STEP * 0.5)
                }
            }
            "socialize" => {
                if let Some((cx, cy)) = individual.group_id.as_ref().and_then(|g| group_centroids.get(g)) {
                    ((cy - individual.y).atan2(cx - individual.x), DAILY_STEP)
                } else {
                    (persisted_angle, DAILY_STEP * 0.5)
                }
            }
            _ => (persisted_angle + (rand::random::<f64>() - 0.5) * 0.3, DAILY_STEP), // forage/hunt/drink/seek_warmth
        };
        angle = angle.rem_euclid(std::f64::consts::TAU);

        let candidate_x = individual.x + angle.cos() * step;
        let candidate_y = individual.y + angle.sin() * step;
        if environment::is_on_land(candidate_y, candidate_x) {
            individual.x = candidate_x;
            individual.y = candidate_y;
        } else {
            // Coastline: don't strand the band, just stop advancing this tick.
            step = 0.0;
        }
        let _ = step;
        individual.extra.insert("_moveAngle".to_string(), json!(angle));
    }
}

pub fn advance_one_day(state: &mut SimulationState) -> TickReport {
    state.current_day += 1;
    state.current_year = state.current_day / 365;
    let current_day = state.current_day;

    let mut discovered_techs = as_string_set(&state.discovered_techs);
    let mut discovered_beliefs = as_string_set(&state.discovered_beliefs);
    let mut discovered_arts = as_string_set(&state.discovered_arts);
    let mut astronomy_knowledge = as_string_set(&state.astronomy_knowledge);
    let mut celestial_observations = as_string_set(&state.celestial_observations);

    // 1. World state (season/weather/resources).
    let mut world_value = serde_json::to_value(&state.world_state).unwrap_or_else(|_| json!({}));
    environment::update_world_state(&mut world_value, current_day, Some(&discovered_techs));
    state.world_state = serde_json::from_value(world_value.clone()).unwrap_or_default();

    // 2. Age + generation count (max generation currently alive).
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
    let generation_count = state.individuals.iter().filter_map(|i| i.generation).max().unwrap_or(0);

    // 3. Groups: form/merge bands from proximity before per-individual processing.
    form_groups(state, current_day);

    let mut events: Vec<Value> = Vec::new();

    // 4. Per-individual embarrassingly-parallel updates: economy, epigenetics,
    //    consciousness (cardinal rule: only this call may touch mind.consciousness),
    //    psychology, language growth, gut microbiome, decision-making.
    let group_sizes: HashMap<String, usize> = state
        .groups
        .iter()
        .filter_map(|g| {
            let id = g.get("id")?.as_str()?.to_string();
            let size = g.get("member_ids")?.as_array()?.len();
            Some((id, size))
        })
        .collect();
    let world_value_ref = &world_value;
    let discovered_techs_ref = &discovered_techs;
    state.individuals.par_iter_mut().for_each(|individual| {
        if !individual.alive || individual.is_dead {
            return;
        }
        let group_size = individual
            .group_id
            .as_ref()
            .and_then(|gid| group_sizes.get(gid).copied())
            .unwrap_or(1);

        let gathered = economy::gather_resources(individual, world_value_ref, discovered_techs_ref);
        if individual.inventory.is_null() {
            individual.inventory = economy::initialize_inventory();
        }
        if let (Some(inv), Some(gathered_obj)) = (individual.inventory.as_object_mut(), gathered.as_object()) {
            for (k, v) in gathered_obj {
                let current = inv.get(k).and_then(Value::as_f64).unwrap_or(0.0);
                inv.insert(k.clone(), json!(current + v.as_f64().unwrap_or(0.0)));
            }
        }
        let consumed = economy::consume_resources(individual);
        let satiation = consumed.get("satiation").and_then(Value::as_f64).unwrap_or(0.5);
        individual.extra.insert("satiation".to_string(), json!(satiation));
        let produced = economy::produce_goods(individual, discovered_techs_ref);
        if let (Some(inv), Some(produced_obj)) = (individual.inventory.as_object_mut(), produced.as_object()) {
            for (k, v) in produced_obj {
                let current = inv.get(k).and_then(Value::as_f64).unwrap_or(0.0);
                inv.insert(k.clone(), json!(current + v.as_f64().unwrap_or(0.0)));
            }
        }
        if satiation < 0.3 {
            if let Some(health) = individual.health.as_object_mut() {
                let hp = health.get("hp").and_then(Value::as_f64).unwrap_or(1.0);
                health.insert("hp".to_string(), json!((hp - 0.01 * (0.3 - satiation)).max(0.0)));
            }
        }

        epigenetics::update_epigenome(individual, Some(world_value_ref), current_day);
        // Cardinal rule: consciousness may only be mutated here.
        consciousness::update_consciousness(individual);
        psychology::update_mental_state(individual, &[], world_value_ref, current_day);
        language::update_foxp2_expression(individual, group_size);
        language::update_language_stage(individual, group_size, generation_count);
        microbiome::update_gut_microbiome(individual, world_value_ref);
        let action = agent::select_action(individual, world_value_ref);
        individual.extra.insert("_currentAction".to_string(), json!(action));
    });

    // 5. Movement: band cohesion / mating drive / persisted wander heading, gated
    //    by the land mask so nobody drifts into open ocean. Built from a snapshot
    //    taken before anyone moves (standard simultaneous-update flocking).
    let pre_move_snapshot = state.individuals.clone();
    let pre_move_positions: Vec<(f64, f64)> = pre_move_snapshot.iter().map(|i| (i.x, i.y)).collect();
    let pre_move_grid = SpatialGrid::build(&pre_move_positions, NEARBY_RADIUS);
    apply_movement(state, &pre_move_snapshot, &pre_move_grid, current_day);

    // 6. Technology + language: observation-based learning only (cardinal rule).
    //    A spatial grid bounds the neighbor search to nearby cells instead of
    //    scanning the whole population for every individual.
    let snapshot = state.individuals.clone();
    let positions: Vec<(f64, f64)> = snapshot.iter().map(|i| (i.x, i.y)).collect();
    let grid = SpatialGrid::build(&positions, NEARBY_RADIUS);
    for individual in state.individuals.iter_mut() {
        if !individual.alive || individual.is_dead {
            continue;
        }
        let nearby: Vec<crate::state::Individual> = grid
            .candidates_within(individual.x, individual.y, NEARBY_RADIUS)
            .into_iter()
            .filter_map(|idx| snapshot.get(idx))
            .filter(|other| other.id != individual.id && other.alive && !other.is_dead)
            .filter(|other| distance(individual.x, individual.y, other.x, other.y) < NEARBY_RADIUS)
            .cloned()
            .collect();
        if nearby.is_empty() {
            continue;
        }
        technology::learn_tech_from_observation(individual, &nearby, &mut discovered_techs);
        if let Some(teacher) = nearby.iter().max_by_key(|other| {
            other.language.get("vocabulary").and_then(Value::as_object).map(|m| m.len()).unwrap_or(0)
        }) {
            language::learn_from_teacher(individual, teacher);
        }
    }

    // 7. Reproduction (biology cardinal path: only genetic inheritance + mutation).
    let alive_snapshot: Vec<crate::state::Individual> = state
        .individuals
        .iter()
        .filter(|i| i.alive && !i.is_dead)
        .cloned()
        .collect();
    let community_lang_stage = state
        .individuals
        .iter()
        .filter(|i| i.alive)
        .map(|i| i.language.get("stage").and_then(Value::as_i64).unwrap_or(0))
        .max()
        .unwrap_or(0) as i32;
    let sim_id = state.id.clone().unwrap_or_default();
    let mut conceived = biology::reproduction::check_reproduction(&alive_snapshot, current_day, &sim_id, community_lang_stage);
    if !conceived.is_empty() {
        let population_by_id: HashMap<String, crate::state::Individual> =
            state.individuals.iter().map(|i| (i.id.clone(), i.clone())).collect();
        for child in conceived.iter_mut() {
            let parent1 = child.parent_1_id.as_ref().and_then(|id| population_by_id.get(id)).cloned();
            let parent2 = child.parent_2_id.as_ref().and_then(|id| population_by_id.get(id)).cloned();
            if let (Some(mut p1), Some(mut p2)) = (parent1, parent2) {
                epigenetics::inherit_epigenome(child, &mut p1, &mut p2);
            } else {
                epigenetics::initialize_epigenome(child);
            }
            psychology::initialize_psychology(child);
            child.inbreeding_coeff = Some(biology::genome::compute_inbreeding_coefficient(child, &population_by_id));
        }
        for female_id in conceived.iter().filter_map(|c| c.parent_1_id.clone()) {
            if let Some(mother) = state.individuals.iter_mut().find(|i| i.id == female_id) {
                if let Some(obj) = mother.health.as_object_mut() {
                    obj.insert("pregnancy".to_string(), json!(current_day));
                }
            }
        }
        state.pending_births.append(&mut conceived);
    }

    // Only a pregnancy that has reached term becomes a living member of the population.
    let (due, still_pending): (Vec<_>, Vec<_>) = state
        .pending_births
        .drain(..)
        .partition(|child| child.birth_day <= current_day);
    state.pending_births = still_pending;
    for mut child in due {
        if let Some(mother) = child
            .parent_1_id
            .clone()
            .and_then(|id| state.individuals.iter_mut().find(|i| i.id == id))
        {
            let resilience = mother.phenotype.get("health_resilience").and_then(Value::as_f64).unwrap_or(0.5);
            let mother_risk = (0.06 * (1.0 - resilience)).max(0.002);
            if let Some(obj) = mother.health.as_object_mut() {
                obj.insert("pregnancy".to_string(), Value::Null);
            }
            if rand::random::<f64>() < mother_risk {
                mother.alive = false;
                mother.is_dead = true;
                mother.death_day = Some(current_day);
                mother.extra.insert("death_cause".to_string(), json!("BirthComplications"));
                events.push(json!({ "type": "death", "individual_id": mother.id, "cause": "BirthComplications", "day": current_day, "importance": "high" }));
            }
            let neonatal_risk = (mother_risk * 0.6).max(0.005);
            if rand::random::<f64>() < neonatal_risk {
                child.alive = false;
                child.is_dead = true;
                child.death_day = Some(current_day);
                child.extra.insert("death_cause".to_string(), json!("BirthComplications"));
            }
        }
        events.push(json!({ "type": "birth", "individual_id": child.id, "day": current_day, "importance": "low" }));
        state.individuals.push(child);
    }

    // 8. Mortality.
    for individual in state.individuals.iter_mut() {
        if !individual.alive || individual.is_dead {
            continue;
        }
        if let Some(cause) = biology::mortality::roll_death(individual, current_day, Some(&world_value)) {
            individual.alive = false;
            individual.is_dead = true;
            individual.death_day = Some(current_day);
            individual.extra.insert("death_cause".to_string(), json!(format!("{cause:?}")));
            events.push(json!({ "type": "death", "individual_id": individual.id, "cause": format!("{cause:?}"), "day": current_day, "importance": "medium" }));
        }
    }

    // 9. Microbiome outbreaks (population-wide contagion).
    events.extend(microbiome::process_microbiome_tick(&mut state.individuals, &world_value, current_day));

    // 10. Belief formation (per-individual reflection) + spread + ritual emergence.
    for individual in state.individuals.iter_mut() {
        if !individual.alive || individual.is_dead {
            continue;
        }
        if let Some(ev) = belief::try_form_belief(individual, &mut discovered_beliefs, &discovered_techs, &world_value, current_day) {
            events.push(ev);
        }
    }
    events.extend(belief::update_belief_spread(&mut state.individuals, &discovered_beliefs, &state.groups, current_day));
    for group in state.groups.clone() {
        if let Some(ev) = belief::check_ritual_emergence(&group, &state.individuals, &discovered_beliefs, current_day) {
            events.push(ev);
        }
    }

    // 11. Culture, art.
    events.extend(culture::process_culture_tick(&state.individuals, &mut state.groups, &discovered_techs, current_day));
    events.extend(art::process_art_tick(&state.individuals, &mut discovered_arts, &discovered_techs, &world_value, current_day));
    for individual in state.individuals.iter_mut() {
        if individual.is_dead {
            continue;
        }
        art::apply_art_effects(individual, None, &discovered_arts);
    }

    // 12. Social: leadership + roles + fission signalling.
    events.extend(social::process_group_dynamics(&mut state.individuals, &mut state.groups, current_day));
    let leader_by_group: HashMap<String, String> = state
        .groups
        .iter()
        .filter_map(|g| {
            let id = g.get("id")?.as_str()?.to_string();
            let leader = g.get("leader_id")?.as_str()?.to_string();
            Some((id, leader))
        })
        .collect();
    state.individuals.par_iter_mut().for_each(|individual| {
        if individual.is_dead {
            return;
        }
        let leader_id = individual.group_id.as_ref().and_then(|gid| leader_by_group.get(gid));
        let role = social::compute_role_for(individual, leader_id.map(|s| s.as_str()));
        individual.extra.insert("group_role".to_string(), json!(role));
    });

    // 13. Law: norm emergence, then per-member violation checks (cardinal rule:
    //     driven by the violator's own phenotype, never a random external pick)
    //     and exile enforcement once a group has adopted punishment_exile.
    for group in state.groups.iter_mut() {
        events.extend(law::process_law_tick(group, &state.individuals, &discovered_techs, current_day));

        let norms: HashSet<String> = group
            .get("norms")
            .and_then(Value::as_array)
            .map(|arr| arr.iter().filter_map(Value::as_str).map(String::from).collect())
            .unwrap_or_default();
        if norms.is_empty() {
            continue;
        }
        let member_ids: Vec<String> = group
            .get("member_ids")
            .and_then(Value::as_array)
            .map(|arr| arr.iter().filter_map(Value::as_str).map(String::from).collect())
            .unwrap_or_default();
        for member_id in member_ids {
            let Some(individual) = state.individuals.iter_mut().find(|i| i.id == member_id) else { continue };
            if individual.is_dead {
                continue;
            }
            if let Some(violated_norm) = law::check_norm_violation(individual, &norms) {
                events.push(law::process_norm_enforcement(group, individual, violated_norm, current_day));
            }
        }
    }

    // 14. Architecture: form settlements once a group is large enough, then build.
    let mut new_settlements = Vec::new();
    for group in state.groups.iter() {
        let Some(group_id) = group.get("id").and_then(Value::as_str) else { continue };
        let member_count = group.get("member_ids").and_then(Value::as_array).map(|a| a.len()).unwrap_or(0);
        let has_settlement = state.settlements.iter().any(|s| s.get("group_id").and_then(Value::as_str) == Some(group_id));
        if member_count >= 4 && !has_settlement {
            new_settlements.push(architecture::create_settlement(group, &world_value, current_day));
        }
    }
    state.settlements.append(&mut new_settlements);
    for settlement in state.settlements.iter_mut() {
        events.extend(architecture::process_architecture_tick(settlement, &state.individuals, &discovered_techs, &world_value, current_day));
    }
    let group_sizes_for_settlements: HashMap<String, usize> = state
        .groups
        .iter()
        .filter_map(|g| Some((g.get("id")?.as_str()?.to_string(), g.get("member_ids")?.as_array()?.len())))
        .collect();
    for settlement in state.settlements.iter() {
        let group_size = settlement
            .get("group_id")
            .and_then(Value::as_str)
            .and_then(|gid| group_sizes_for_settlements.get(gid).copied())
            .unwrap_or(0);
        if let Some(ev) = architecture::check_settlement_overcrowding(settlement, group_size, current_day) {
            events.push(ev);
        }
    }

    // 15. Astronomy.
    events.extend(astronomy::process_astronomy_tick(
        &state.individuals,
        &mut celestial_observations,
        &mut astronomy_knowledge,
        &discovered_techs,
        current_day,
    ));

    // 16. Trade between adjacent living individuals (cheap pairing pass).
    let alive_ids: Vec<String> = state.individuals.iter().filter(|i| i.alive).map(|i| i.id.clone()).collect();
    for pair in alive_ids.chunks(2) {
        let [a, b] = pair else { continue };
        let idx_a = state.individuals.iter().position(|i| &i.id == a);
        let idx_b = state.individuals.iter().position(|i| &i.id == b);
        if let (Some(ia), Some(ib)) = (idx_a, idx_b) {
            if ia == ib {
                continue;
            }
            let (lo, hi) = if ia < ib { (ia, ib) } else { (ib, ia) };
            let (left, right) = state.individuals.split_at_mut(hi);
            if let Some(ev) = economy::attempt_trade(&mut left[lo], &mut right[0], current_day) {
                events.push(ev);
            }
        }
    }

    // Persist discovered sets back onto the state.
    state.discovered_techs = from_string_set(discovered_techs);
    state.discovered_beliefs = from_string_set(discovered_beliefs);
    state.discovered_arts = from_string_set(discovered_arts);
    state.astronomy_knowledge = from_string_set(astronomy_knowledge);
    state.celestial_observations = from_string_set(celestial_observations);

    let alive_count = state.alive_count();
    state.world_state.alive_count = Some(alive_count);
    state.world_state.current_day = Some(state.current_day);
    state.world_state.current_year = Some(state.current_year);

    if !events.is_empty() {
        state.events.extend(events);
        let len = state.events.len();
        if len > MAX_EVENTS {
            state.events.drain(0..len - MAX_EVENTS);
        }
    }

    TickReport {
        current_day: state.current_day,
        alive_count,
        updated_age_count,
    }
}
