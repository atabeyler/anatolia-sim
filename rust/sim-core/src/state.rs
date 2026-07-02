use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct WorldState {
    #[serde(default)]
    pub biome: Option<String>,
    #[serde(default)]
    pub season: Option<String>,
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default)]
    pub food_abundance: Option<f64>,
    #[serde(default)]
    pub water_abundance: Option<f64>,
    #[serde(default)]
    pub alive_count: Option<usize>,
    #[serde(default)]
    pub current_day: Option<i32>,
    #[serde(default)]
    pub current_year: Option<i32>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Individual {
    pub id: String,
    #[serde(default)]
    pub simulation_id: Option<String>,
    pub birth_day: i32,
    #[serde(default)]
    pub death_day: Option<i32>,
    #[serde(default)]
    pub alive: bool,
    #[serde(default)]
    pub is_dead: bool,
    #[serde(default)]
    pub is_founder: bool,
    #[serde(default)]
    pub sex: String,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub age_days: Option<i32>,
    #[serde(default)]
    pub generation: Option<i32>,
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub home_x: Option<f64>,
    #[serde(default)]
    pub home_y: Option<f64>,
    #[serde(default)]
    pub parent_1_id: Option<String>,
    #[serde(default)]
    pub parent_2_id: Option<String>,
    #[serde(default)]
    pub known_techs: Vec<String>,
    #[serde(default)]
    pub genome: Value,
    #[serde(default)]
    pub phenotype: Value,
    #[serde(default)]
    pub epigenome: Value,
    #[serde(default)]
    pub health: Value,
    #[serde(default)]
    pub mind: Value,
    #[serde(default)]
    pub social: Value,
    #[serde(default)]
    pub skills: Value,
    #[serde(default)]
    pub beliefs: Value,
    #[serde(default)]
    pub language: Value,
    #[serde(default)]
    pub memory: Value,
    #[serde(default)]
    pub psychology: Value,
    #[serde(default)]
    pub inventory: Value,
    #[serde(default)]
    pub inbreeding_coeff: Option<f64>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SimulationState {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub start_latitude: Option<f64>,
    #[serde(default)]
    pub start_longitude: Option<f64>,
    #[serde(default)]
    pub current_day: i32,
    #[serde(default)]
    pub current_year: i32,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub speed_multiplier: Option<i32>,
    #[serde(default)]
    pub world_state: WorldState,
    #[serde(default)]
    pub individuals: Vec<Individual>,
    #[serde(default)]
    pub founder_1: Option<Value>,
    #[serde(default)]
    pub founder_2: Option<Value>,
    #[serde(default)]
    pub discovered_techs: Vec<String>,
    #[serde(default)]
    pub discovered_beliefs: Vec<String>,
    #[serde(default)]
    pub discovered_arts: Vec<String>,
    #[serde(default)]
    pub astronomy_knowledge: Vec<String>,
    #[serde(default)]
    pub celestial_observations: Vec<String>,
    #[serde(default)]
    pub groups: Vec<Value>,
    #[serde(default)]
    pub settlements: Vec<Value>,
    /// Conceived individuals whose `birth_day` is still in the future. They are
    /// spliced into `individuals` (and only then count toward population/events)
    /// once `current_day >= birth_day`, so a pregnancy is not a phantom living member.
    #[serde(default)]
    pub pending_births: Vec<Individual>,
    #[serde(default)]
    pub events: Vec<Value>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct TickReport {
    pub current_day: i32,
    pub alive_count: usize,
    pub updated_age_count: usize,
}

impl SimulationState {
    pub fn alive_count(&self) -> usize {
        self.individuals
            .iter()
            .filter(|individual| individual.alive && !individual.is_dead)
            .count()
    }
}
