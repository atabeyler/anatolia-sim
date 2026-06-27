import { SimulationEngine } from '../engines/simulationLoop.js';
import { simQuery as query, cloudQuery } from '../db/database.js';

const useSimLocal = process.env.DESKTOP_SIM_LOCAL === '1';

const BATCH_SIZE = 200; // max individuals per bulk upsert

async function withRetry(fn, retries = 3, baseDelayMs = 500) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try { return await fn(); }
    catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
}

class SimulationManager {
  constructor() {
    this.engines = new Map();
    this.wsClients = new Map();
    this._checkpointLocks = new Map(); // per-sim lock to prevent overlapping checkpoints
  }

  async start(simulation) {
    if (this.engines.has(simulation.id)) {
      this.runEngine(simulation.id, this.engines.get(simulation.id));
      return;
    }
    const { rows: individuals } = await query('SELECT * FROM individuals WHERE simulation_id = $1', [simulation.id]);
    const engine = new SimulationEngine(simulation);
    engine.load(individuals.map(parseIndividual));
    engine._runtimeDiagnostics = {
      event_buffer_length: 0,
      event_flush_in_progress: false,
      event_flush_count: 0,
      event_flush_error_count: 0,
      last_event_flush_ms: null,
      last_event_flush_at: null,
      checkpoint_in_progress: false,
      checkpoint_skip_count: 0,
      checkpoint_error_count: 0,
      last_checkpoint_ms: null,
      last_checkpoint_at: null,
      last_checkpoint_day: null,
      persist_state_ms: null,
      persist_population_ms: null,
      death_persist_error_count: 0,
      last_death_persist_ms: null,
    };

    // Restore discovered sets from latest checkpoint so resumed simulations don't
    // re-fire technology/belief/art events that already happened before the pause.
    const { rows: cpRows } = await query(
      'SELECT tech_state, belief_state, art_state, groups FROM checkpoints WHERE simulation_id = $1 ORDER BY sim_day DESC LIMIT 1',
      [simulation.id]
    );
    if (cpRows[0]) {
      const cp = cpRows[0];
      const techArr = Array.isArray(cp.tech_state) ? cp.tech_state
        : Array.isArray(cp.tech_state?.technologies) ? cp.tech_state.technologies : [];
      if (techArr.length > 0) engine.discoveredTechs = new Set(techArr);
      const beliefArr = Array.isArray(cp.belief_state) ? cp.belief_state : [];
      if (beliefArr.length > 0) engine.discoveredBeliefs = new Set(beliefArr);
      const artArr = Array.isArray(cp.art_state) ? cp.art_state : [];
      if (artArr.length > 0) engine.discoveredArts = new Set(artArr);

      // Restore group metadata (culture, norms, alliances, tension, etc.)
      // load() already rebuilt groups from member group_id fields — here we
      // overlay the group-level state that was serialised at the last checkpoint.
      const savedGroups = Array.isArray(cp.groups) ? cp.groups : [];
      if (savedGroups.length > 0) {
        const metaById = new Map(savedGroups.map(g => [g.id, g]));
        for (const group of engine.groups) {
          const saved = metaById.get(group.id);
          if (!saved) continue;
          group.culture          = new Set(Array.isArray(saved.culture) ? saved.culture : []);
          group.norms            = new Set(Array.isArray(saved.norms)   ? saved.norms   : []);
          group.internal_tension = saved.internal_tension ?? 0;
          group.prestige         = saved.prestige         ?? 0.1;
          group.alliances        = saved.alliances        ?? [];
          group.rival_ids        = saved.rival_ids        ?? [];
          group.social_order     = saved.social_order     ?? 0;
          group.leader_id        = saved.leader_id        ?? null;
          group.founded_day      = saved.founded_day      ?? 0;
          group.has_ritual       = saved.has_ritual       ?? null;
          group.ritual_cohesion  = saved.ritual_cohesion  ?? 0;
          group._culturePressure = saved._culturePressure ?? {};
          group._diffusionPressure = saved._diffusionPressure ?? 0;
        }
      }
    }

    engine.onTick = (data) => this.broadcast(simulation.id, { type: 'tick', ...data });

    engine.onEnded = async ({ reason }) => {
      // Simülasyon kapanmadan önce bekleyen tüm olayları flush et (kaybetme)
      await flushEvents().catch(() => {});
      await query("UPDATE simulations SET status = 'completed', updated_at = NOW() WHERE id = $1", [simulation.id]).catch(() => {});
      this.broadcast(simulation.id, { type: 'simulation_ended', reason });
    };

    // Batch event inserts — flush every 50 events or 5 seconds, whichever comes first
    // BUG-09: _isFlushing flag prevents overlapping concurrent DB writes
    const eventBuffer = [];
    let flushTimer = null;
    let _isFlushing = false;
    const flushEvents = async () => {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (eventBuffer.length === 0 || _isFlushing) return;
      _isFlushing = true;
      engine._runtimeDiagnostics.event_flush_in_progress = true;
      const batch = eventBuffer.splice(0);
      engine._runtimeDiagnostics.event_buffer_length = eventBuffer.length;
      const flushStart = Date.now();
      try {
        const placeholders = batch.map((_, i) => `($${i*8+1},$${i*8+2},$${i*8+3},$${i*8+4},$${i*8+5},$${i*8+6},$${i*8+7},$${i*8+8})`).join(',');
        const values = batch.flatMap(e => [e.simulation_id, e.sim_day, e.sim_year, e.event_type, e.description, JSON.stringify(e.data ?? {}), e.importance ?? 1, e.created_at ?? new Date().toISOString()]);
        await withRetry(() => query(`INSERT INTO simulation_events (simulation_id,sim_day,sim_year,event_type,description,data,importance,created_at) VALUES ${placeholders}`, values));
        engine._runtimeDiagnostics.event_flush_count++;
      } catch {
        engine._runtimeDiagnostics.event_flush_error_count++;
        /* non-critical - events lost on persistent DB failure */
      } finally {
        _isFlushing = false;
        engine._runtimeDiagnostics.event_flush_in_progress = false;
        engine._runtimeDiagnostics.last_event_flush_ms = Date.now() - flushStart;
        engine._runtimeDiagnostics.last_event_flush_at = new Date().toISOString();
        engine._runtimeDiagnostics.event_buffer_length = eventBuffer.length;
        // flush again if events arrived while we were writing
        if (eventBuffer.length >= 50) flushEvents();
      }
    };
    engine.onEvent = (event) => {
      eventBuffer.push(event);
      engine._runtimeDiagnostics.event_buffer_length = eventBuffer.length;
      if (eventBuffer.length >= 50) { flushEvents(); }
      else if (!flushTimer) { flushTimer = setTimeout(flushEvents, 5000); }
    };

    // Persist deaths immediately so WitnessPanel shows correct dead state without waiting for checkpoint.
    // Retried up to 3 times — checkpoint reconciliation is the final safety net if all retries fail.
    engine.onDeath = (dead) => {
      if (dead.length === 0) return;
      const deathPersistStart = Date.now();
      const values = dead.flatMap(d => [d.id, d.death_day ?? null, d.death_cause ?? null]);
      const rows = dead.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
      withRetry(() => query(
        `UPDATE individuals SET alive = false, is_dead = true, death_day = v.dd::integer, death_cause = v.dc
         FROM (VALUES ${rows}) AS v(id, dd, dc)
         WHERE individuals.id = v.id::uuid`,
        values
      )).then(() => {
        engine._runtimeDiagnostics.last_death_persist_ms = Date.now() - deathPersistStart;
      }).catch(err => {
        engine._runtimeDiagnostics.death_persist_error_count++;
        console.warn('[onDeath] persist error after retries:', err.message);
      });
      // Free large heap objects from dead individuals — they stay in population Map
      // for parent-id lookups and posthumous births. Keep genetic/phenotype data:
      // pregnancies conceived before a disease death still need the dead parent genome.
      for (const ind of dead) {
        ind.mind = null;
        ind.social = null;
        ind.memory = null;
        ind.psychology = null;
        ind.inventory = null;
        ind.beliefs = null;
        ind.language = null;
        ind.skills = null;
        ind.health = null;
      }
    };

    engine.onCheckpoint = async (cp) => {
      // Skip if a checkpoint is already in progress for this simulation
      if (this._checkpointLocks.get(simulation.id)) {
        engine._runtimeDiagnostics.checkpoint_skip_count++;
        return;
      }
      this._checkpointLocks.set(simulation.id, true);
      engine._runtimeDiagnostics.checkpoint_in_progress = true;
      const checkpointStart = Date.now();
      try {
        await withRetry(() => query(
          `INSERT INTO checkpoints (simulation_id, sim_day, sim_year, population_count, population_snapshot, world_state, cultural_state, tech_state, stats, belief_state, art_state, groups)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [simulation.id, cp.sim_day, cp.sim_year, cp.population_count,
           JSON.stringify(cp.population_snapshot), JSON.stringify(cp.world_state),
           JSON.stringify(cp.cultural_state), JSON.stringify(cp.tech_state), JSON.stringify(cp.stats),
           JSON.stringify(cp.belief_state ?? []), JSON.stringify(cp.art_state ?? []),
           JSON.stringify(cp.groups ?? [])]
        ));
        const stateStart = Date.now();
        await withRetry(() => this.persistState(simulation.id, engine));
        engine._runtimeDiagnostics.persist_state_ms = Date.now() - stateStart;
        const populationStart = Date.now();
        await withRetry(() => this.persistPopulation(simulation.id, engine));
        engine._runtimeDiagnostics.persist_population_ms = Date.now() - populationStart;
        engine._runtimeDiagnostics.last_checkpoint_day = cp.sim_day;

        // Yerel modda Render'a son checkpoint'i sync et (çapraz cihaz erişimi için)
        if (useSimLocal && simulation.user_id) {
          cloudQuery(
            `INSERT INTO cloud_checkpoints
               (user_id, simulation_id, simulation_name, current_day, current_year,
                population_count, population_snapshot, world_state, cultural_state,
                tech_state, belief_state, art_state, groups, stats, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
             ON CONFLICT (user_id, simulation_id) DO UPDATE SET
               simulation_name=EXCLUDED.simulation_name, current_day=EXCLUDED.current_day,
               current_year=EXCLUDED.current_year, population_count=EXCLUDED.population_count,
               population_snapshot=EXCLUDED.population_snapshot, world_state=EXCLUDED.world_state,
               cultural_state=EXCLUDED.cultural_state, tech_state=EXCLUDED.tech_state,
               belief_state=EXCLUDED.belief_state, art_state=EXCLUDED.art_state,
               groups=EXCLUDED.groups, stats=EXCLUDED.stats, updated_at=NOW()`,
            [simulation.user_id, simulation.id, simulation.name,
             cp.sim_day, cp.sim_year, cp.population_count,
             JSON.stringify(cp.population_snapshot), JSON.stringify(cp.world_state),
             JSON.stringify(cp.cultural_state), JSON.stringify(cp.tech_state),
             JSON.stringify(cp.belief_state ?? []), JSON.stringify(cp.art_state ?? []),
             JSON.stringify(cp.groups ?? []), JSON.stringify(cp.stats)]
          ).catch(err => console.warn('[cloud-sync] checkpoint sync failed:', err.message));
        }
      } catch (err) {
        engine._runtimeDiagnostics.checkpoint_error_count++;
        console.error(`[SimulationEngine] checkpoint error: ${err.message}`);
      } finally {
        this._checkpointLocks.set(simulation.id, false);
        engine._runtimeDiagnostics.checkpoint_in_progress = false;
        engine._runtimeDiagnostics.last_checkpoint_ms = Date.now() - checkpointStart;
        engine._runtimeDiagnostics.last_checkpoint_at = new Date().toISOString();
      }
    };

    this.engines.set(simulation.id, engine);
    this.runEngine(simulation.id, engine);
  }

  runEngine(simId, engine) {
    engine.start().catch(async (err) => {
      console.error(`[SIM ${simId}] Engine stopped after error:`, err);
      engine.pause();
      await this.persistState(simId, engine).catch(console.error);
      await query("UPDATE simulations SET status = 'paused' WHERE id = $1", [simId]).catch(console.error);
      this.broadcast(simId, { type: 'error', error: 'Simulation engine paused after an internal error.' });
    });
  }

  pause(simId) { this.engines.get(simId)?.pause(); }
  getEngine(simId) { return this.engines.get(simId); }
  removeEngine(simId) { this.engines.get(simId)?.pause(); this.engines.delete(simId); this.wsClients.delete(simId); }
  setSpeed(simId, speed) { const engine = this.engines.get(simId); if (engine) engine.speedMultiplier = speed; }

  // Feature 5: fast-forward — set engine warp target; engine skips sleep until day reached
  fastForward(simId, targetDay) {
    const engine = this.engines.get(simId);
    if (!engine) return false;
    engine._fastForwardTarget = targetDay;
    // Immediately notify connected clients that warp has started — tick broadcasts are
    // suppressed during warp so the client would otherwise see silence and think the sim froze.
    this.broadcast(simId, { type: 'tick', day: engine.currentDay, is_warping: true, fast_forward_target: targetDay });
    if (!engine.running) engine.start().catch(console.error);
    return true;
  }

  cancelFastForward(simId) {
    const engine = this.engines.get(simId);
    if (engine) engine._fastForwardTarget = null;
  }

  async persistState(simId, engine = this.engines.get(simId)) {
    if (!engine) return;
    await query(
      'UPDATE simulations SET current_day=$1, current_year=$2, world_state=$3, updated_at=NOW() WHERE id=$4',
      [engine.currentDay, Math.floor(engine.currentDay / 365), JSON.stringify(engine.worldState), simId]
    );
  }

  // Bulk UPSERT — one query per BATCH_SIZE individuals instead of N sequential queries
  async persistPopulation(simId, engine) {
    const allIndividuals = [...engine.population.values()];
    const all = allIndividuals.filter(i => !i.is_dead);
    const dead = allIndividuals.filter(i => i.is_dead);
    if (all.length === 0 && dead.length === 0) return;

    for (let start = 0; start < all.length; start += BATCH_SIZE) {
      const chunk = all.slice(start, start + BATCH_SIZE);
      const placeholders = [];
      const params = [];
      let p = 1;

      for (const ind of chunk) {
        placeholders.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4},$${p+5},$${p+6},$${p+7},$${p+8},$${p+9},$${p+10},$${p+11},$${p+12},$${p+13},$${p+14},$${p+15},$${p+16},$${p+17},$${p+18},$${p+19},$${p+20},$${p+21},$${p+22},$${p+23},$${p+24},$${p+25},$${p+26},$${p+27},$${p+28})`);
        params.push(
          ind.id, simId, ind.birth_day, ind.death_day, !ind.is_dead, ind.sex,
          ind.x, ind.y,
          JSON.stringify(ind.genome),
          JSON.stringify(ind.phenotype),
          JSON.stringify(ind.epigenome ?? {}),
          JSON.stringify(ind.health),
          JSON.stringify({ ...(ind.mind ?? {}), _volatile: { satiation: ind.satiation ?? null, mating_urge: ind.mating_urge ?? null, age: ind.age ?? null, _waterFear: ind._waterFear ?? null, _fears: ind._fears ?? null, _waterExperience: ind._waterExperience ?? null, known_techs: ind.known_techs instanceof Set ? [...ind.known_techs] : (Array.isArray(ind.known_techs) ? ind.known_techs : []), _experience: ind._experience ?? {}, generation: ind.generation ?? 0 } }),
          JSON.stringify(ind.social),
          JSON.stringify(ind.skills ?? []),
          JSON.stringify(ind.beliefs instanceof Set ? [...ind.beliefs] : (Array.isArray(ind.beliefs) ? ind.beliefs : [])),
          JSON.stringify(ind.language),
          JSON.stringify(ind.memory ?? {}),
          ind.parent_1_id ?? null,
          ind.parent_2_id ?? null,
          ind.death_cause ?? null,
          ind.is_founder ?? false,
          ind.is_dead ?? false,
          ind.home_x ?? null,
          ind.home_y ?? null,
          ind.group_id ?? null,
          ind.inbreeding_coeff ?? 0,
          JSON.stringify(ind.psychology ?? {}),
          JSON.stringify(ind.inventory ?? {})
        );
        p += 29;
      }

      await query(
        `INSERT INTO individuals
           (id,simulation_id,birth_day,death_day,alive,sex,x,y,genome,phenotype,epigenome,health,mind,social,skills,beliefs,language,memory,parent_1_id,parent_2_id,death_cause,is_founder,is_dead,home_x,home_y,group_id,inbreeding_coeff,psychology,inventory)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (id) DO UPDATE SET
           death_day=EXCLUDED.death_day, alive=EXCLUDED.alive, is_dead=EXCLUDED.is_dead,
           x=EXCLUDED.x, y=EXCLUDED.y,
           phenotype=EXCLUDED.phenotype, epigenome=EXCLUDED.epigenome,
           health=EXCLUDED.health, mind=EXCLUDED.mind, social=EXCLUDED.social,
           skills=EXCLUDED.skills, beliefs=EXCLUDED.beliefs,
           language=EXCLUDED.language, memory=EXCLUDED.memory,
           death_cause=EXCLUDED.death_cause,
           is_founder=EXCLUDED.is_founder, home_x=EXCLUDED.home_x, home_y=EXCLUDED.home_y,
           group_id=EXCLUDED.group_id, inbreeding_coeff=EXCLUDED.inbreeding_coeff,
           psychology=EXCLUDED.psychology, inventory=EXCLUDED.inventory`,
        params
      );
      // Yield to event loop between batches so health checks can respond
      await new Promise(resolve => setImmediate(resolve));
    }

    // Reconcile dead individuals — guarantee alive=false in DB even if onDeath write failed.
    // onDeath is fire-and-forget; this catch-up runs at every checkpoint.
    if (dead.length > 0) {
      for (let start = 0; start < dead.length; start += BATCH_SIZE) {
        const chunk = dead.slice(start, start + BATCH_SIZE);
        const values = chunk.flatMap(d => [d.id, d.death_day ?? null, d.death_cause ?? null]);
        const rows = chunk.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
        await query(
          `UPDATE individuals SET alive = false, is_dead = true, death_day = v.dd::integer, death_cause = v.dc
           FROM (VALUES ${rows}) AS v(id, dd, dc)
           WHERE individuals.id = v.id::uuid AND alive = true`,
          values
        );
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  async flushDeadOnShutdown() {
    const promises = [];
    for (const [simId, engine] of this.engines) {
      const dead = [...engine.population.values()].filter(i => i.is_dead);
      if (dead.length === 0) continue;
      for (let start = 0; start < dead.length; start += BATCH_SIZE) {
        const chunk = dead.slice(start, start + BATCH_SIZE);
        const values = chunk.flatMap(d => [d.id, d.death_day ?? null, d.death_cause ?? null]);
        const rows = chunk.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
        promises.push(query(
          `UPDATE individuals SET alive = false, is_dead = true, death_day = v.dd::integer, death_cause = v.dc
           FROM (VALUES ${rows}) AS v(id, dd, dc)
           WHERE individuals.id = v.id::uuid AND alive = true`,
          values
        ).catch(err => console.warn(`[shutdown] flush dead ${simId}:`, err.message)));
      }
    }
    await Promise.all(promises);
  }

  registerWs(simId, ws) {
    if (!this.wsClients.has(simId)) this.wsClients.set(simId, new Set());
    this.wsClients.get(simId).add(ws);
    ws.on('close', () => this.wsClients.get(simId)?.delete(ws));
  }

  broadcast(simId, data) {
    const clients = this.wsClients.get(simId);
    if (!clients) return;
    const msg = JSON.stringify(data);
    for (const ws of clients) if (ws.readyState === 1) ws.send(msg);
  }
}

function parseIndividual(row) {
  const isDead = row.alive === false || row.is_dead === true;
  // is_founder=false may be the ALTER TABLE default for pre-migration rows; check birth_day too
  const isFounder = row.is_founder === true || (row.birth_day ?? 0) < 0;
  const social = row.social ?? {};
  const mind = row.mind ?? {};
  const volatile = mind._volatile ?? {};
  const parsed = {
    ...row,
    is_dead: isDead,
    alive: !isDead,
    is_founder: isFounder,
    home_x: row.home_x ?? (isFounder ? (row.x ?? 0) : undefined),
    home_y: row.home_y ?? (isFounder ? (row.y ?? 0) : undefined),
    group_id: row.group_id ?? social.group_id ?? undefined,
    epigenome: row.epigenome ?? {},
    skills: row.skills ?? [],
    beliefs: Array.isArray(row.beliefs) ? row.beliefs : [],
    memory: row.memory ?? { social: [], events: [], knowledge: [] },
    inbreeding_coeff: row.inbreeding_coeff ?? 0,
  };
  if (volatile.satiation !== undefined) parsed.satiation = volatile.satiation;
  if (volatile.mating_urge !== undefined) parsed.mating_urge = volatile.mating_urge;
  if (volatile.age !== undefined) parsed.age = volatile.age;
  if (volatile._waterFear !== undefined) parsed._waterFear = volatile._waterFear;
  if (volatile._fears !== undefined) parsed._fears = volatile._fears;
  if (volatile._waterExperience !== undefined) parsed._waterExperience = volatile._waterExperience;
  if (volatile.known_techs !== undefined) parsed.known_techs = new Set(volatile.known_techs);
  else if (isFounder) parsed.known_techs = new Set(['swimming']); // kurucu garantisi
  if (isFounder && parsed.known_techs) parsed.known_techs.add('swimming'); // eski kayıtlar için
  if (volatile._experience !== undefined) parsed._experience = volatile._experience;
  if (volatile.generation !== undefined) parsed.generation = volatile.generation;
  else if (isFounder) parsed.generation = 0;
  if (row.psychology && Object.keys(row.psychology).length > 0) parsed.psychology = row.psychology;
  else if (volatile.psychology) parsed.psychology = volatile.psychology;
  if (row.inventory && Object.keys(row.inventory).length > 0) parsed.inventory = row.inventory;
  else if (volatile.inventory) parsed.inventory = volatile.inventory;
  return parsed;
}

export const simulationManager = new SimulationManager();
