// 20 koşu × 10000 gün — hayatta kalma dağılımı
import { SimulationEngine } from './src/engines/simulationLoop.js';
import { createFounder }    from './src/engines/biology/individual.js';
import { createWorldState } from './src/engines/environment/environmentEngine.js';

async function runSim(simDays) {
  const worldState = createWorldState(37.5, 32.5);
  const f1 = createFounder({ sex: 'male',   ageYears: 22, x: 32.5, y: 37.5, is_founder: true, home_x: 32.5, home_y: 37.5 });
  const f2 = createFounder({ sex: 'female', ageYears: 20, x: 32.6, y: 37.5, is_founder: true, home_x: 32.6, home_y: 37.5 });
  const engine = new SimulationEngine({ id: 'test', current_day: 0, speed_multiplier: 1, world_state: worldState });
  engine.load([f1, f2]);
  engine.onTick = () => {}; engine.onEvent = () => {}; engine.onCheckpoint = async () => {}; engine.onDeath = () => {};

  const snapshots = {}; // year → alive count at that year
  engine.running = true;
  for (let d = 0; d < simDays; d++) {
    await engine.tick();
    if (!engine.running) break;
    if (d > 0 && d % 365 === 0) {
      snapshots[Math.floor(d / 365)] = engine._aliveIds.size;
      if (engine._aliveIds.size === 0) break;
    }
  }
  engine.destroy();
  const deathLog = {};
  for (const ind of engine.population.values()) {
    if (ind.is_dead) { const c = ind.death_cause ?? 'unknown'; deathLog[c] = (deathLog[c] ?? 0) + 1; }
  }
  return { alive: engine._aliveIds.size, totalDeaths: engine.totalDeaths, deathLog, snapshots };
}

const RUNS = 10;
const DAYS = 9125; // 25 yıl

console.log(`\n${RUNS} simülasyon × ${DAYS} gün (~25 yıl)\n`);

let survived = 0;
const deathCauses = {};
const aliveByYear = {};

for (let i = 0; i < RUNS; i++) {
  const r = await runSim(DAYS);
  const ext = r.alive === 0 ? 'YOK OLDU' : `${r.alive} canlı`;
  if (r.alive > 0) survived++;
  // collect year snapshots
  for (const [yr, cnt] of Object.entries(r.snapshots)) {
    if (!aliveByYear[yr]) aliveByYear[yr] = [];
    aliveByYear[yr].push(cnt);
  }
  for (const [c, n] of Object.entries(r.deathLog)) deathCauses[c] = (deathCauses[c] ?? 0) + n;
  const extinctionYear = r.alive === 0 ? Object.keys(r.snapshots).find(y => r.snapshots[y] === 0) ?? '25+' : '—';
  process.stdout.write(`  Koşu ${i+1}: ${ext} | ${r.totalDeaths} ölüm | yok oluş yılı: ${extinctionYear} | sebepler: ${JSON.stringify(r.deathLog)}\n`);
}

console.log(`\n=== Özet (${RUNS} koşu, 25 simülasyon yılı) ===`);
console.log(`Hayatta kalan: ${survived}/${RUNS} (%${Math.round(survived/RUNS*100)})`);
console.log('Ölüm sebepleri:', deathCauses);

// Yıl bazlı ortalama nüfus (hayatta kalan koşulardan)
console.log('\nOrtalama nüfus (yıl bazlı, tüm koşular):');
for (const yr of Object.keys(aliveByYear).sort((a,b) => a-b)) {
  const vals = aliveByYear[yr];
  const avg = (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (yr % 5 === 0 || yr <= 5) console.log(`  Yıl ${yr}: ort=${avg} (min=${min} max=${max}) [${vals.length} koşu]`);
}
