// Persistent worker pool — workers stay alive across ticks, no spawn overhead per tick.

import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(__dirname, 'individualWorker.mjs');

export class WorkerPool {
  constructor() {
    this.size = cpus().length; // use every core
    this._workers = [];
    this._init();
  }

  _init() {
    for (let i = 0; i < this.size; i++) {
      const w = new Worker(WORKER_PATH);
      w.on('error', err => console.error(`[worker ${i}] error:`, err));
      this._workers.push(w);
    }
    // Workers started: this.size = cpus().length;
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

      promises.push(new Promise((resolve, reject) => {
        const w = this._workers[i];
        const onMsg = (data) => { w.off('error', onErr); resolve(data); };
        const onErr = (err)  => { w.off('message', onMsg); reject(err); };
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
    for (const w of this._workers) w.terminate();
    this._workers = [];
  }
}
