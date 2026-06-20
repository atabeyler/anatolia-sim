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
    this.size = cpus().length;
    this._workers = [];
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

      // Serialize Sets to arrays (structured clone cannot transfer Set objects)
      const serialized = chunk.map(ind => ({
        ...ind,
        beliefs:     [...(ind.beliefs     instanceof Set ? ind.beliefs     : (ind.beliefs     ?? []))],
        known_techs: [...(ind.known_techs instanceof Set ? ind.known_techs : (ind.known_techs ?? []))],
      }));

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
