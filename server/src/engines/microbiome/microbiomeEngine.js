// Microbiome & Disease Engine
// min_day: earliest simulation day this pathogen can first appear (staggers introduction)
export const PATHOGEN_TYPES={
  wound_infection:    {transmission:'contact',   base_mortality:0.12,duration_days:14,immunity_duration:60,   density_threshold:2, min_day:180},
  intestinal_parasite:{transmission:'fecal_oral',base_mortality:0.05,duration_days:30,immunity_duration:365*3,density_threshold:5, min_day:365},
  respiratory_common: {transmission:'airborne',  base_mortality:0.02,duration_days:14,immunity_duration:180,  density_threshold:4, min_day:365},
  fungal_skin:        {transmission:'contact',   base_mortality:0.01,duration_days:30,immunity_duration:180,  density_threshold:4, min_day:500},
  fever_tick:         {transmission:'vector',    base_mortality:0.08,duration_days:10,immunity_duration:365*2,density_threshold:3, min_day:730, biomes:['grassland','temperate_forest']},
  malaria_like:       {transmission:'vector',    base_mortality:0.1, duration_days:14,immunity_duration:365,  density_threshold:3, min_day:730, biomes:['tropical_rainforest','tropical_savanna','coastal']},
  pneumonia_like:     {transmission:'airborne',  base_mortality:0.15,duration_days:21,immunity_duration:365*2,density_threshold:8, min_day:1000},
  cholera_like:       {transmission:'water',     base_mortality:0.3, duration_days:7, immunity_duration:365*5,density_threshold:20,min_day:1500},
  plague_like:        {transmission:'airborne',  base_mortality:0.4, duration_days:10,immunity_duration:365*10,density_threshold:30,min_day:2000},
};

export function processMicrobiomeTick(population,worldState,simDay){
  const events=[];
  const alive=population.filter(i=>!i.is_dead);
  const density=alive.length;
  for(const ind of alive)dedupeInfections(ind);
  // Grace period: no NEW outbreaks before day 180 or below 8 people
  // Existing infections are always processed (cleared + mortality) regardless of density.
  if(simDay>=180&&density>=8){
    for(const[pathId,path]of Object.entries(PATHOGEN_TYPES)){
      if(density<path.density_threshold)continue;
      if(simDay<(path.min_day??180))continue;
      if(path.biomes&&!path.biomes.includes(worldState.biome))continue;
      const sm=(worldState.season==='summer'&&path.transmission==='vector')?2.0:(worldState.season==='winter'&&path.transmission==='airborne')?1.5:1.0;
      let newCases=0;
      for(const ind of alive){
        if(ind.infections?.some(i=>i.pathogen_id===pathId))continue;
        if(ind.immunities?.[pathId]>simDay)continue;
        if(Math.random()<envExposureProb(ind,path,sm,density)){
          if(!ind.infections)ind.infections=[];
          ind.infections.push({pathogen_id:pathId,days_remaining:path.duration_days,infected_day:simDay});
          newCases++;
        }
      }
      if(newCases>0){
        events.push({type:'epidemic_outbreak',pathogen_id:pathId,initial_cases:newCases,day:simDay,importance:path.base_mortality>0.2?'high':'medium',description:`A ${pathId.replace(/_/g,' ')} outbreak begins`});
      }
    }
  }
  // Always process existing infections: decrement duration, apply mortality, clear when done.
  for(const ind of population){
    if(!ind.infections||ind.is_dead)continue;
    for(const inf of[...ind.infections]){
      inf.days_remaining--;
      const path=PATHOGEN_TYPES[inf.pathogen_id];
      if(!path){
        if(inf.days_remaining<=0||ind.is_dead)ind.infections=ind.infections.filter(i=>i!==inf);
        continue;
      }
      const totalImmunity=Math.min((ind.phenotype?.immune_strength??0.5)*0.7+(ind.health?.microbiome_immunity??0),0.95);
      const dailyMortality=path.base_mortality*(1-totalImmunity)*(1-(ind.health?.hp??0.5)*0.3)/path.duration_days;
      if(Math.random()<dailyMortality){
        ind.is_dead=true;ind.death_cause='infection';ind.death_day=simDay;
      }
      if(inf.days_remaining<=0||ind.is_dead){
        ind.infections=ind.infections.filter(i=>i!==inf);
        if(!ind.is_dead){if(!ind.immunities)ind.immunities={};ind.immunities[inf.pathogen_id]=simDay+path.immunity_duration;}
      }
    }
  }
  return events;
}

// Per-individual environmental exposure probability, weighted by personal vulnerability
// to each transmission route. No central selection — the environment finds its victims.
// Scale by population size: small isolated groups have lower pathogen reservoir pressure.
function envExposureProb(ind,path,sm,density){
  const populationScale=Math.min(1.0,Math.max(0.2,density/25));
  const base=0.00008*sm*populationScale;
  switch(path.transmission){
    case 'water':
      // Thirsty individuals drink more, risking contaminated sources
      return base*(1+Math.max(0,1-(ind.health?.hydration??0.8))*2);
    case 'fecal_oral':
      // Group living increases fecal-oral contact
      return base*(ind.group_id?1.5:0.6);
    case 'airborne':
      // Proximity to others drives airborne transmission
      return base*(ind.group_id?2.0:0.4);
    case 'vector':
      // Uniform vector pressure within the biome
      return base;
    case 'contact':
      // Weakened individuals more susceptible to wound/skin pathogens
      return base*(1+Math.max(0,0.5-(ind.health?.hp??0.5))*3);
    default:
      return base;
  }
}

export function spreadInfection(infected,susceptible,pathId,simDay,aliveCount=50){
  if(!infected.infections?.some(i=>i.pathogen_id===pathId)||susceptible.immunities?.[pathId]>simDay)return false;
  if(susceptible.infections?.some(i=>i.pathogen_id===pathId))return false;
  const path=PATHOGEN_TYPES[pathId];
  if(!path)return false;
  const groupScale=Math.min(1.0,Math.max(0.3,aliveCount/30));
  const tr=(path.transmission==='airborne'?0.3:path.transmission==='contact'?0.2:0.15)*groupScale;
  if(Math.random()<tr*(1-(susceptible.phenotype?.immune_strength??0.5)*0.5)){
    if(!susceptible.infections)susceptible.infections=[];
    susceptible.infections.push({pathogen_id:pathId,days_remaining:path.duration_days,infected_day:simDay});
    return true;
  }
  return false;
}

function dedupeInfections(ind){
  if(!Array.isArray(ind.infections)||ind.infections.length<2)return;
  const byPath=new Map();
  for(const inf of ind.infections){
    if(!inf?.pathogen_id)continue;
    const prev=byPath.get(inf.pathogen_id);
    if(!prev||((inf.days_remaining??0)>(prev.days_remaining??0)))byPath.set(inf.pathogen_id,inf);
  }
  ind.infections=[...byPath.values()];
}

export function updateGutMicrobiome(individual,worldState){
  if(!individual.microbiome)individual.microbiome={diversity:0.5,composition:{}};
  const dd=worldState.food_abundance*0.5+(individual.inventory?.dried_food?0.1:0)+(individual.inventory?.food>3?0.2:0);
  // Individuals with stronger immune genes (IMMUNE_01/02) maintain higher microbiome diversity
  const immuneBoost=(individual.phenotype?.immune_strength??0.5)*0.15;
  individual.microbiome.diversity=Math.min(1,individual.microbiome.diversity*0.95+Math.min(1,dd+immuneBoost)*0.05);
  // Store microbiome immunity boost separately from genetic immune_strength phenotype
  if(!individual.health)individual.health={};
  individual.health.microbiome_immunity=Math.min(individual.microbiome.diversity*0.3,0.3);
}

export function computeHealthStats(population){
  const living=population.filter(i=>!i.is_dead);
  if(living.length===0)return{sick_count:0,sick_rate:0,pathogen_diversity:0};
  const sick=living.filter(i=>i.infections?.length>0);
  return{sick_count:sick.length,sick_rate:sick.length/living.length,pathogen_diversity:new Set(sick.flatMap(i=>i.infections?.map(inf=>inf.pathogen_id)??[])).size};
}
