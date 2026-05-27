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

export function getBiome(latitude, longitude) {
  const absLat = Math.abs(latitude);
  if (absLat < 10) return 'tropical_rainforest';
  if (absLat < 20) return 'tropical_savanna';
  if (absLat < 30) return Math.abs(longitude % 90) < 20 ? 'coastal' : 'desert';
  if (absLat < 45) return 'mediterranean';
  if (absLat < 60) return 'temperate_forest';
  if (absLat < 70) return 'boreal_forest';
  return 'tundra';
}

export function createWorldState(latitude, longitude) {
  const biomeKey = getBiome(latitude, longitude);
  const biome = BIOMES[biomeKey];
  return {
    latitude, longitude, biome: biomeKey,
    temperature: (biome.temp_range[0] + biome.temp_range[1]) / 2,
    food_abundance: biome.food_base, water_abundance: biome.water_base,
    predator_risk: biome.predator_risk, disease_pressure: 0.1,
    season: 'spring', day_of_year: 0, year: 0, natural_disaster: null,
    flora: { density: biome.food_base * 0.8 },
    fauna: { prey_density: biome.food_base * 0.6, predator_density: biome.predator_risk },
    human_impact: 0,
  };
}

export function updateWorldState(worldState, simulationDay) {
  const dayOfYear = simulationDay % 365;
  worldState.day_of_year = dayOfYear;
  worldState.year = Math.floor(simulationDay / 365);
  if (dayOfYear < 80 || dayOfYear >= 335) worldState.season = 'winter';
  else if (dayOfYear < 172) worldState.season = 'spring';
  else if (dayOfYear < 264) worldState.season = 'summer';
  else worldState.season = 'autumn';
  const biome = BIOMES[worldState.biome];
  const [tMin, tMax] = biome.temp_range;
  worldState.temperature = (tMin + tMax) / 2 + (tMax - tMin) / 2 * Math.sin((dayOfYear - 80) / 365 * 2 * Math.PI);
  const foodBase = biome.food_base;
  const seasonMultiplier = { summer: 1.3, winter: 0.4, spring: 0.9, autumn: 1.1 }[worldState.season] ?? 1;
  worldState.food_abundance = Math.max(0.05, foodBase * seasonMultiplier - worldState.human_impact * 0.1);
  worldState.natural_disaster = rollNaturalDisaster(worldState, simulationDay);
  return worldState;
}

export function rollNaturalDisaster(worldState, simulationDay) {
  const events = [];
  const tectonicRisk = getTectonicRisk(worldState.latitude, worldState.longitude);
  if (Math.random() < tectonicRisk * 0.0001) {
    const magnitude = 5 + Math.random() * 3;
    events.push({ type: 'earthquake', magnitude, mortality_factor: magnitude > 7 ? 0.3 : 0.05 });
  }
  if (worldState.season === 'summer' && ['desert','grassland','tropical_savanna'].includes(worldState.biome) && Math.random() < 0.0003)
    events.push({ type: 'drought', duration_days: 30 + Math.floor(Math.random() * 60), mortality_factor: 0.1 });
  if (worldState.season === 'spring' && worldState.food_abundance > 0.7 && Math.random() < 0.0002)
    events.push({ type: 'flood', severity: Math.random(), mortality_factor: 0.05 });
  if (Math.random() < worldState.disease_pressure * 0.0005)
    events.push({ type: 'epidemic', pathogen: ['respiratory_virus','gastrointestinal','hemorrhagic_fever','skin_disease'][Math.floor(Math.random()*4)], mortality_factor: 0.1 + Math.random() * 0.3 });
  return events.length > 0 ? events : null;
}

function getTectonicRisk(lat, lon) {
  if ((Math.abs(lat) < 60 && (lon > 130 || lon < -60)) || (lat > 25 && lat < 40 && lon > 65 && lon < 100)) return 3;
  if (lat > 30 && lat < 45 && lon > -10 && lon < 40) return 2;
  return 1;
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
