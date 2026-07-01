pub mod biology;
pub mod consciousness;
pub mod environment;
pub mod epigenetics;
pub mod language;
pub mod technology;
pub mod economy;
pub mod social;
pub mod culture;
pub mod law;
pub mod astronomy;
pub mod microbiome;
pub mod art;
pub mod architecture;
pub mod belief;
pub mod agent;
pub mod psychology;
mod state;
mod tick;

pub use biology::genome::{combine_gametes, compute_inbreeding_coefficient, compute_phenotype, create_gamete, create_genome};
pub use biology::individual::{create_child, create_founder, get_age, get_life_stage, is_fertile};
pub use biology::mortality::{compute_daily_death_risk, roll_death, DeathCause};
pub use biology::reproduction::check_reproduction;
pub use consciousness::{update_consciousness, update_inner_thought};
pub use environment::{compute_resource_pressure, create_world_state, get_biome, update_world_state};
pub use epigenetics::{compute_epigenetic_age, inherit_epigenome, initialize_epigenome, update_epigenome};
pub use language::{generate_proto_word, get_language_summary, learn_from_teacher, try_acquire_word_from_environment, update_foxp2_expression, update_language_stage, CORE_CONCEPTS, LANGUAGE_STAGES};
pub use technology::{known_techs_json, learn_tech_from_observation, TECH_TREE};
pub use economy::{attempt_trade, compute_economic_stats, consume_resources, gather_resources, initialize_inventory, produce_goods, GOODS_TYPES, RESOURCE_TYPES};
pub use social::{assign_group_roles, compute_social_status, process_group_dynamics, GROUP_ROLES, RELATIONSHIP_TYPES};
pub use culture::{compute_cultural_prestige, process_culture_tick, CULTURAL_MEMES};
pub use law::{compute_social_order, process_law_tick, NORM_TYPES};
pub use astronomy::{get_astronomy_bonus, process_astronomy_tick, ASTRONOMY_KNOWLEDGE};
pub use microbiome::{compute_health_stats, process_microbiome_tick, spread_infection, update_gut_microbiome, PATHOGEN_TYPES};
pub use art::{apply_art_effects, process_art_tick, ART_FORMS};
pub use architecture::{check_settlement_overcrowding, compute_settlement_capacity, compute_settlement_defense, create_settlement, process_architecture_tick, STRUCTURE_TYPES};
pub use belief::{check_ritual_emergence, try_form_belief, update_belief_spread, BELIEF_ARCHETYPES};
pub use agent::{select_action, ACTIONS};
pub use psychology::{compute_population_psych_stats, initialize_psychology, process_bonding, update_mental_state};
pub use state::{Individual, SimulationState, TickReport, WorldState};
pub use tick::advance_one_day;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advances_day_and_updates_alive_ages() {
        let mut state = SimulationState {
            current_day: 10,
            world_state: WorldState::default(),
            individuals: vec![
                Individual {
                    id: "a".to_string(),
                    birth_day: 0,
                    alive: true,
                    ..Individual::default()
                },
                Individual {
                    id: "b".to_string(),
                    birth_day: 3,
                    alive: false,
                    ..Individual::default()
                },
            ],
            ..SimulationState::default()
        };

        let report = advance_one_day(&mut state);

        assert_eq!(state.current_day, 11);
        assert_eq!(state.individuals[0].age_days, Some(11));
        assert_eq!(state.individuals[1].age_days, None);
        assert_eq!(report.current_day, 11);
        assert_eq!(report.alive_count, 1);
        assert_eq!(report.updated_age_count, 1);
    }

    #[test]
    fn preserves_unknown_fields_on_roundtrip() {
        let json = r#"
        {
          "current_day": 42,
          "world_state": {
            "biome": "temperate_forest",
            "season": "spring"
          },
          "individuals": [
            {
              "id": "abc",
              "birth_day": -730,
              "alive": true,
              "custom_note": "kept"
            }
          ],
          "unknown_flag": true
        }
        "#;

        let state: SimulationState = serde_json::from_str(json).expect("state should parse");
        assert_eq!(state.current_day, 42);
        assert_eq!(state.world_state.biome.as_deref(), Some("temperate_forest"));
        assert_eq!(state.individuals[0].extra.get("custom_note").and_then(|v| v.as_str()), Some("kept"));
        assert_eq!(state.extra.get("unknown_flag").and_then(|v| v.as_bool()), Some(true));

        let encoded = serde_json::to_string(&state).expect("state should serialize");
        let decoded: SimulationState = serde_json::from_str(&encoded).expect("state should deserialize");
        assert_eq!(decoded.current_day, 42);
        assert_eq!(decoded.individuals.len(), 1);
    }

    #[test]
    fn creates_basic_founder_and_child() {
        let founder = create_founder(&serde_json::json!({
            "sex": "female",
            "ageYears": 22,
            "x": 1.0,
            "y": 2.0,
            "name": "Ada"
        }));
        assert!(founder.is_founder);
        assert_eq!(founder.generation, Some(0));
        assert_eq!(founder.phenotype.get("name").and_then(|v| v.as_str()), Some("Ada"));

        let child = create_child(&founder, &founder, 0, "sim-1");
        assert_eq!(child.generation, Some(1));
        assert_eq!(child.simulation_id.as_deref(), Some("sim-1"));
    }
}
