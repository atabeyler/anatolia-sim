use serde_json::{json, Value};

const BIOMES: &[(&str, [f64; 2], f64, f64, f64)] = &[
    ("tropical_rainforest", [22.0, 30.0], 0.90, 0.95, 0.40),
    ("tropical_savanna", [20.0, 32.0], 0.70, 0.50, 0.50),
    ("desert", [5.0, 45.0], 0.20, 0.10, 0.20),
    ("mediterranean", [8.0, 30.0], 0.75, 0.65, 0.20),
    ("temperate_forest", [-5.0, 25.0], 0.70, 0.75, 0.25),
    ("grassland", [-10.0, 30.0], 0.60, 0.40, 0.35),
    ("boreal_forest", [-30.0, 20.0], 0.50, 0.70, 0.30),
    ("tundra", [-40.0, 10.0], 0.20, 0.60, 0.20),
    ("mountain", [-20.0, 15.0], 0.40, 0.80, 0.30),
    ("coastal", [5.0, 25.0], 0.85, 0.90, 0.15),
];

pub fn get_biome(latitude: f64, longitude: f64) -> &'static str {
    let abs_lat = latitude.abs();
    let lon_mod = longitude.rem_euclid(90.0).abs();
    let coastal = lon_mod < 20.0 || lon_mod > 70.0;
    let continental = (35.0..=55.0).contains(&lon_mod);
    if abs_lat < 10.0 { return if coastal { "coastal" } else { "tropical_rainforest" }; }
    if abs_lat < 20.0 { return if continental { "tropical_savanna" } else { "tropical_rainforest" }; }
    if abs_lat < 30.0 { return if coastal { "coastal" } else if continental { "desert" } else { "tropical_savanna" }; }
    if abs_lat < 45.0 { return if coastal { "mediterranean" } else if continental { "grassland" } else { "temperate_forest" }; }
    if abs_lat < 60.0 { return if coastal { "temperate_forest" } else if continental { "grassland" } else { "boreal_forest" }; }
    if abs_lat < 70.0 { return "boreal_forest"; }
    "tundra"
}

pub fn create_world_state(latitude: f64, longitude: f64) -> Value {
    let biome_key = get_biome(latitude, longitude);
    let biome = BIOMES.iter().find(|(k, ..)| *k == biome_key).unwrap_or(&BIOMES[0]);
    let phonology_seed = (((latitude * 100.0).round() as i64) * 31 + ((longitude * 100.0).round() as i64) * 17 + 1277).rem_euclid(10_000);
    json!({
        "latitude": latitude,
        "longitude": longitude,
        "biome": biome_key,
        "temperature": (biome.1[0] + biome.1[1]) / 2.0,
        "food_abundance": biome.2,
        "water_abundance": biome.3,
        "predator_risk": biome.4,
        "disease_pressure": 0.1,
        "season": "spring",
        "day_of_year": 0,
        "year": 0,
        "natural_disaster": null,
        "flora": { "density": biome.2 * 0.8 },
        "fauna": { "prey_density": biome.2 * 0.6, "predator_density": biome.4 },
        "human_impact": 0,
        "phonology_seed": phonology_seed,
        "current_weather": "clear",
        "weather_intensity": 0.5,
        "weather_days_remaining": 5,
        "weather_move_mult": 1.0,
        "weather_hp_delta": 0.0,
        "weather_cold_risk": false,
        "weather_heat_risk": false,
        "_weather_water_delta": 0.0,
        "_weather_food_delta": 0.0
    })
}

pub fn update_world_state(world_state: &mut Value, simulation_day: i32, discovered_techs: Option<&std::collections::HashSet<String>>) {
    let day_of_year = simulation_day.rem_euclid(365);
    if let Some(obj) = world_state.as_object_mut() {
        obj.insert("day_of_year".to_string(), json!(day_of_year));
        obj.insert("year".to_string(), json!(simulation_day / 365));
        let season = if day_of_year < 80 || day_of_year >= 335 { "winter" }
            else if day_of_year < 172 { "spring" }
            else if day_of_year < 264 { "summer" }
            else { "autumn" };
        obj.insert("season".to_string(), json!(season));
        let biome = obj.get("biome").and_then(|v| v.as_str()).unwrap_or("mediterranean");
        let (_, range, food_base, water_base, _) = BIOMES.iter().find(|(k, ..)| *k == biome).copied().unwrap_or(BIOMES[3]);
        let tmin = range[0];
        let tmax = range[1];
        let tmid = (tmin + tmax) / 2.0;
        let tamp = ((tmax - tmin) / 3.0).min(15.0);
        obj.insert("temperature".to_string(), json!((tmid + tamp * ((day_of_year as f64 - 80.0) / 365.0 * std::f64::consts::TAU).sin()).round()));
        let season_multiplier = match season { "summer" => 1.3, "winter" => 0.4, "spring" => 0.9, _ => 1.1 };
        let human_impact = obj.get("human_impact").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let base_food = (food_base * season_multiplier - human_impact * 0.1).max(0.05);
        let mut tech_food_floor: f64 = 0.05;
        if let Some(techs) = discovered_techs {
            if techs.contains("food_preservation") { tech_food_floor = 0.15; }
            if techs.contains("plant_cultivation") { tech_food_floor = tech_food_floor.max(0.18); }
            if techs.contains("animal_herding") { tech_food_floor = tech_food_floor.max(0.20); }
            if techs.contains("pottery") { tech_food_floor = tech_food_floor.max(0.22); }
        }
        obj.insert("food_abundance".to_string(), json!(base_food.max(tech_food_floor).min(1.0)));
        obj.insert("water_abundance".to_string(), json!(water_base.min(1.0).max(0.02)));
        obj.insert("natural_disaster".to_string(), Value::Null);
    }
}

pub fn compute_resource_pressure(world_state: &Value, population_size: usize) -> Value {
    let food = world_state.get("food_abundance").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let water = world_state.get("water_abundance").and_then(|v| v.as_f64()).unwrap_or(0.5);
    let carrying_capacity = food * 500.0;
    let pressure = population_size as f64 / carrying_capacity.max(1.0);
    json!({
        "food_pressure": pressure.min(1.0),
        "water_pressure": (population_size as f64 / (water * 1000.0).max(1.0)).min(1.0),
        "carrying_capacity": carrying_capacity.round() as i64,
        "overpopulated": pressure > 1.0
    })
}
