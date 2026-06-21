// Persistent worker pool — workers stay alive across ticks, no spawn overhead per tick.

import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(__dirname, 'individualWorker.mjs');
const WORKER_TIMEOUT_MS = 30000; // BUG-06: 30s timeout — prevents infinite hangs

export class WorkerPool {
  constructor() {
    const requestedMax = Number(process.env.MAX_WORKERS ?? 2);
    const maxWorkers = Number.isFinite(requestedMax) && requestedMax > 0 ? Math.floor(requestedMax) : 2;
    // Cap worker count so hosted and desktop builds can keep RAM/CPU predictable.
    this.size = Math.min(maxWorkers, Math.max(1, Math.ceil(cpus().length / 2)));
    this._workers = [];
    this._serialized = new WeakMap(); // cache: individual → {beliefs, known_techs arrays}
    this._init();
  }

  _spawnWorker(slot) {
    const w = new Worker(WORKER_PATH);
    w.on('error', err => console.error(`[worker ${slot}] error:`, err));
    // BUG-04: restart crashed workers automatically
    w.on('exit', (code) => {
      if (code !== 0 && this._workers[slot] === w) {
        console.warn(`[worker ${slot}] exited with code ${code} — restarting`);
        this._workers[slot] = this._spawnWorker(slot);
      }
    });
    return w;
  }

  _init() {
    for (let i = 0; i < this.size; i++) {
      this._workers.push(this._spawnWorker(i));
    }
  }

  // Serialize Sets to arrays (structured clone cannot transfer Set objects).
  // Only the Set→Array conversions are cached (Sets grow monotonically).
  // The full object spread is always fresh — caching it causes stale inventory/health
  // references after Object.assign(ind, delta) replaces those sub-objects each tick.
  _serializeInd(ind) {
    const beliefs     = ind.beliefs     instanceof Set ? ind.beliefs     : null;
    const known_techs = ind.known_techs instanceof Set ? ind.known_techs : null;
    const cached = this._serialized.get(ind);

    const beliefsArr = (cached && cached.beliefsSize === (beliefs?.size ?? -1))
      ? cached.beliefsArr
      : (beliefs ? [...beliefs] : (ind.beliefs ?? []));

    const known_techsArr = (cached && cached.known_techsSize === (known_techs?.size ?? -1))
      ? cached.known_techsArr
      : (known_techs ? [...known_techs] : (ind.known_techs ?? []));

    this._serialized.set(ind, {
      beliefsSize:     beliefs?.size     ?? -1,
      known_techsSize: known_techs?.size ?? -1,
      beliefsArr,
      known_techsArr,
    });

    return { ...ind, beliefs: beliefsArr, known_techs: known_techsArr };
  }

  // Dispatch `individuals` across all available workers in parallel.
  // Returns merged { deltas, events } once every worker finishes.
  async run(individuals, worldState, discoveredTechs, day) {
    if (individuals.length === 0) return { deltas: [], events: [] };

    const n = Math.min(this.size, individuals.length);
    const chunkSize = Math.ceil(individuals.length / n);

    const promises = [];
    for (let i = 0; i < n; i++) {
      const chunk = individuals.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;

      const serialized = chunk.map(ind => this._serializeInd(ind));

      const workerIdx = i;
      promises.push(new Promise((resolve, reject) => {
        const w = this._workers[workerIdx];

        // BUG-06: timeout guard — if worker hangs, reject after WORKER_TIMEOUT_MS
        const timer = setTimeout(() => {
          w.off('message', onMsg);
          w.off('error', onErr);
          reject(new Error(`Worker ${workerIdx} timed out after ${WORKER_TIMEOUT_MS}ms on day ${day}`));
        }, WORKER_TIMEOUT_MS);

        const onMsg = (data) => {
          clearTimeout(timer);
          w.off('error', onErr);
          resolve(data);
        };
        const onErr = (err) => {
          clearTimeout(timer);
          w.off('message', onMsg);
          reject(err);
        };

        w.once('message', onMsg);
        w.once('error', onErr);
        w.postMessage({ individuals: serialized, worldState, discoveredTechs: [...discoveredTechs], day });
      }));
    }

    const results = await Promise.all(promises);
    return {
      deltas: results.flatMap(r => r.deltas),
      events: results.flatMap(r => r.events),
    };
  }

  terminate() {
    for (let i = 0; i < this._workers.length; i++) {
      this._workers[i].terminate();
    }
    this._workers = [];
  }
}
