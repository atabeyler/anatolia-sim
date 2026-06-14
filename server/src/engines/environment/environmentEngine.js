const BIOMES = {
  tropical_rainforest: { temp_range: [22, 30], rainfall: 'high',   food_base: 0.9, water_base: 0.95, predator_risk: 0.4 },
  tropical_savanna:    { temp_range: [20, 32], rainfall: 'medium', food_base: 0.7, water_base: 0.5,  predator_risk: 0.5 },
  desert:              { temp_range: [5,  45], rainfall: 'low',    food_base: 0.2, water_base: 0.1,  predator_risk: 0.2 },
  mediterranean:       { temp_range: [8,  30], rainfall: 'medium', food_base: 0.75,water_base: 0.65, predator_risk: 0.2 },
  temperate_forest:    { temp_range: [-5, 25], rainfall: 'medium', food_base: 0.7, water_base: 0.75, predator_risk: 0.25 },
  grassland:           { temp_range: [-10,30], rainfall: 'low',    food_base: 0.6, water_base: 0.4,  predator_risk: 0.35 },
  boreal_forest:       { temp_range: [-30,20], rainfall: 'low',    food_base: 0.5, water_base: 0.7,  predator_risk: 0.3 },
  tundra:              { temp_range: [-40,10], rainfall: 'low',    food_base: 0.2, water_base: 0.6,  predator_risk: 0.2 },
  mountain:            { temp_range: [-20,15], rainfall: 'medium', food_base: 0.4, water_base: 0.8,  predator_risk: 0.3 },
  coastal:             { temp_range: [5,  25], rainfall: 'medium', food_base: 0.85,water_base: 0.9,  predator_risk: 0.15 },
};

// ─── Weather system ───────────────────────────────────────────────────────────

// duration: [min, max] days; water/food_delta applied on top of seasonal base;
// move_mult: movement speed multiplier; hp_delta: per-tick health damage (negative = harmful)
// cold_risk / heat_risk: whether individual cold/heat tolerance matters
const WEATHER_TYPES = {
  clear:      { duration: [3, 12], move_mult: 1.00, water_delta:  0.00, food_delta:  0.00, hp_delta:  0.000, cold_risk: false, heat_risk: false },
  rain:       { duration: [2,  6], move_mult: 0.85, water_delta:  0.10, food_delta:  0.00, hp_delta:  0.000, cold_risk: false, heat_risk: false },
  heavy_rain: { duration: [1,  4], move_mult: 0.55, water_delta:  0.18, food_delta: -0.05, hp_delta: -0.0006,cold_risk: false, heat_risk: false },
  snow:       { duration: [2,  8], move_mult: 0.50, water_delta:  0.03, food_delta: -0.07, hp_delta: -0.001, cold_risk: true,  heat_risk: false },
  blizzard:   { duration: [1,  3], move_mult: 0.18, water_delta:  0.00, food_delta: -0.10, hp_delta: -0.0025,cold_risk: true,  heat_risk: false },
  storm:      { duration: [1,  3], move_mult: 0.40, water_delta:  0.06, food_delta: -0.08, hp_delta: -0.0008,cold_risk: false, heat_risk: false },
  heat_wave:  { duration: [3, 10], move_mult: 0.72, water_delta: -0.08, food_delta: -0.08, hp_delta: -0.001, cold_risk: false, heat_risk: true  },
  drought:    { duration: [5, 20], move_mult: 1.00, water_delta: -0.15, food_delta: -0.12, hp_delta: -0.0004,cold_risk: false, heat_risk: false  },
};

// Probabilities (per simulation day) that a new weather event of each type begins,
// keyed by biome → season. Remaining probability goes to 'clear'.
const BIOME_WEATHER = {
  tropical_rainforest: {
    summer: { rain: 0.25, heavy_rain: 0.15, storm: 0.08 },
    spring: { rain: 0.20, heavy_rain: 0.10, storm: 0.05 },
    autumn: { rain: 0.18, heavy_rain: 0.08, storm: 0.04 },
    winter: { rain: 0.12, heavy_rain: 0.06 },
  },
  tropical_savanna: {
    summer: { rain: 0.20, heavy_rain: 0.08, storm: 0.05, heat_wave: 0.08 },
    spring: { rain: 0.10, heat_wave: 0.05, drought: 0.03 },
    autumn: { rain: 0.10, drought: 0.04 },
    winter: { drought: 0.05, heat_wave: 0.06 },
  },
  desert: {
    summer: { heat_wave: 0.20, drought: 0.10, storm: 0.03 },
    spring: { heat_wave: 0.10, drought: 0.05 },
    autumn: { heat_wave: 0.08, drought: 0.04 },
    winter: { rain: 0.06 },
  },
  mediterranean: {
    summer: { heat_wave: 0.10, drought: 0.05 },
    spring: { rain: 0.15, storm: 0.05 },
    autumn: { rain: 0.12, storm: 0.06 },
    winter: { rain: 0.18, heavy_rain: 0.08, storm: 0.05 },
  },
  temperate_forest: {
    summer: { rain: 0.12, storm: 0.06, heat_wave: 0.04 },
    spring: { rain: 0.15, storm: 0.05 },
    autumn: { rain: 0.14, storm: 0.06 },
    winter: { snow: 0.15, heavy_rain: 0.08, rain: 0.08 },
  },
  grassland: {
    summer: { storm: 0.06, heat_wave: 0.08, drought: 0.06 },
    spring: { rain: 0.10, storm: 0.05 },
    autumn: { rain: 0.08, drought: 0.04 },
    winter: { snow: 0.12, blizzard: 0.03 },
  },
  boreal_forest: {
    summer: { rain: 0.10, storm: 0.04 },
    spring: { rain: 0.10, snow: 0.06 },
    autumn: { rain: 0.08, snow: 0.10 },
    winter: { snow: 0.20, blizzard: 0.08 },
  },
  tundra: {
    summer: { rain: 0.08 },
    spring: { snow: 0.15, rain: 0.05 },
    autumn: { snow: 0.18, blizzard: 0.05 },
    winter: { snow: 0.25, blizzard: 0.12 },
  },
  mountain: {
    summer: { rain: 0.12, storm: 0.08 },
    spring: { snow: 0.10, rain: 0.10, storm: 0.05 },
    autumn: { snow: 0.12, rain: 0.08, storm: 0.04 },
    winter: { snow: 0.20, blizzard: 0.10 },
  },
  coastal: {
    summer: { rain: 0.10, storm: 0.08, heat_wave: 0.05 },
    spring: { rain: 0.15, storm: 0.06 },
    autumn: { rain: 0.14, storm: 0.08 },
    winter: { rain: 0.18, heavy_rain: 0.08, storm: 0.06 },
  },
};

function updateWeather(worldState) {
  if (!worldState.current_weather) {
    worldState.current_weather = 'clear';
    worldState.weather_intensity = 0.5;
    worldState.weather_days_remaining = 5;
  }

  worldState.weather_days_remaining = Math.max(0, worldState.weather_days_remaining - 1);

  if (worldState.weather_days_remaining <= 0) {
    const probs = BIOME_WEATHER[worldState.biome]?.[worldState.season] ?? {};
    const roll = Math.random();
    let cumulative = 0;
    let chosen = 'clear';
    for (const [type, prob] of Object.entries(probs)) {
      cumulative += prob;
      if (roll < cumulative) { chosen = type; break; }
    }
    const wtDef = WEATHER_TYPES[chosen] ?? WEATHER_TYPES.clear;
    const [minDur, maxDur] = wtDef.duration;
    worldState.current_weather = chosen;
    worldState.weather_intensity = 0.4 + Math.random() * 0.6;
    worldState.weather_days_remaining = Math.round(minDur + Math.random() * (maxDur - minDur));
  }

  const wt = WEATHER_TYPES[worldState.current_weather] ?? WEATHER_TYPES.clear;
  const i = worldState.weather_intensity ?? 0.5;
  worldState.weather_move_mult  = wt.move_mult;
  worldState.weather_hp_delta   = wt.hp_delta * i;
  worldState.weather_cold_risk  = wt.cold_risk;
  worldState.weather_heat_risk  = wt.heat_risk;
  worldState._weather_water_delta = wt.water_delta * i;
  worldState._weather_food_delta  = wt.food_delta  * i;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Biome classification uses latitude (primary) + a continentality proxy derived from
// longitude (secondary). lonMod ∈ [0,90] represents position within a continental block:
// edges (0–20, 70–90) are treated as coastal/maritime; centre (35–55) as continental
// interior. This allows grassland and desert to emerge without elevation data.
// Mountain biome requires real elevation input — not modelled at this resolution.
export function getBiome(latitude, longitude) {
  const absLat = Math.abs(latitude);
  const lonMod = Math.abs(longitude % 90);
  const coastal      = lonMod < 20 || lonMod > 70;
  const continental  = lonMod >= 35 && lonMod <= 55;

  if (absLat < 10)  return coastal ? 'coastal' : 'tropical_rainforest';
  if (absLat < 20)  return continental ? 'tropical_savanna' : 'tropical_rainforest';
  if (absLat < 30)  return coastal ? 'coastal' : (continental ? 'desert' : 'tropical_savanna');
  if (absLat < 45)  return coastal ? 'mediterranean' : (continental ? 'grassland' : 'temperate_forest');
  if (absLat < 60)  return coastal ? 'temperate_forest' : (continental ? 'grassland' : 'boreal_forest');
  if (absLat < 70)  return 'boreal_forest';
  return 'tundra';
}

export function createWorldState(latitude, longitude) {
  const biomeKey = getBiome(latitude, longitude);
  const biome = BIOMES[biomeKey];
  const phonology_seed = Math.abs(
    (Math.round(latitude * 100) * 31 + Math.round(longitude * 100) * 17 + 1277) % 10000
  );
  return {
    latitude, longitude, biome: biomeKey,
    temperature: (biome.temp_range[0] + biome.temp_range[1]) / 2,
    food_abundance: biome.food_base, water_abundance: biome.water_base,
    predator_risk: biome.predator_risk, disease_pressure: 0.1,
    season: 'spring', day_of_year: 0, year: 0, natural_disaster: null,
    flora: { density: biome.food_base * 0.8 },
    fauna: { prey_density: biome.food_base * 0.6, predator_density: biome.predator_risk },
    human_impact: 0,
    phonology_seed,
    current_weather: 'clear',
    weather_intensity: 0.5,
    weather_days_remaining: 5,
    weather_move_mult: 1.0,
    weather_hp_delta: 0,
    weather_cold_risk: false,
    weather_heat_risk: false,
    _weather_water_delta: 0,
    _weather_food_delta: 0,
  };
}

export function updateWorldState(worldState, simulationDay, discoveredTechs = null) {
  const dayOfYear = simulationDay % 365;
  worldState.day_of_year = dayOfYear;
  worldState.year = Math.floor(simulationDay / 365);
  if (dayOfYear < 80 || dayOfYear >= 335) worldState.season = 'winter';
  else if (dayOfYear < 172) worldState.season = 'spring';
  else if (dayOfYear < 264) worldState.season = 'summer';
  else worldState.season = 'autumn';

  const biome = BIOMES[worldState.biome];
  const [tMin, tMax] = biome.temp_range;
  const tMid = (tMin + tMax) / 2;
  const tAmp = Math.min(15, (tMax - tMin) / 3);
  worldState.temperature = Math.round(tMid + tAmp * Math.sin((dayOfYear - 80) / 365 * 2 * Math.PI));

  const foodBase = biome.food_base;
  const seasonMultiplier = { summer: 1.3, winter: 0.4, spring: 0.9, autumn: 1.1 }[worldState.season] ?? 1;
  const baseFood  = Math.max(0.05, foodBase * seasonMultiplier - worldState.human_impact * 0.1);
  const baseWater = biome.water_base;

  // Update weather state for today
  updateWeather(worldState);

  // Apply weather modifiers on top of seasonal baselines
  // Stored-food floor: civilizations with preservation/cultivation techs maintain winter reserves
  let techFoodFloor = 0.05;
  if (discoveredTechs) {
    if (discoveredTechs.has('food_preservation')) techFoodFloor = 0.15;
    if (discoveredTechs.has('plant_cultivation'))  techFoodFloor = Math.max(techFoodFloor, 0.18);
    if (discoveredTechs.has('animal_herding'))      techFoodFloor = Math.max(techFoodFloor, 0.20);
    if (discoveredTechs.has('pottery'))             techFoodFloor = Math.max(techFoodFloor, 0.22);
  }
  worldState.food_abundance  = Math.max(techFoodFloor, Math.min(1, baseFood  + (worldState._weather_food_delta  ?? 0)));
  worldState.water_abundance = Math.max(0.02,          Math.min(1, baseWater + (worldState._weather_water_delta ?? 0)));

  worldState.natural_disaster = null;
  return worldState;
}

export function computeResourcePressure(worldState, populationSize) {
  const carryingCapacity = worldState.food_abundance * 500;
  const pressure = populationSize / carryingCapacity;
  return {
    food_pressure: Math.min(1, pressure),
    water_pressure: Math.min(1, populationSize / (worldState.water_abundance * 1000)),
    carrying_capacity: Math.round(carryingCapacity),
    overpopulated: pressure > 1,
  };
}
