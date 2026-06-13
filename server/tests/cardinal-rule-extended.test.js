import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINES_DIR = join(__dirname, '../src/engines');
const GOD_ROUTE   = join(__dirname, '../src/api/routes/god.js');

function collectEngineFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectEngineFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

describe('Cardinal Rule — extended', () => {
  it('longevity god route rejects non-founders', async () => {
    const src = readFileSync(GOD_ROUTE, 'utf8');
    // Must contain is_founder guard inside the longevity case
    expect(src).toMatch(/case 'longevity'[\s\S]{0,400}is_founder/);
  });

  it('no engine sets .max_lifespan directly on non-founders', () => {
    const files = collectEngineFiles(ENGINES_DIR);
    const violators = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // Allow max_lifespan reads (>=, <=, ===, ??) but flag direct assignments
      if (/\.max_lifespan\s*=[^=]/.test(src)) {
        violators.push(file.replace(ENGINES_DIR + '/', ''));
      }
    }
    expect(violators, `Engines writing .max_lifespan: ${violators.join(', ')}`).toEqual([]);
  });

  it('swimming tech is discoverable (present in TECH_SKILLS)', async () => {
    const { TECH_SKILLS } = await import('../src/engines/agent/activityEngine.js');
    expect(TECH_SKILLS).toHaveProperty('swimming');
    expect(TECH_SKILLS.swimming.skills).toHaveProperty('water_carrying');
  });

  it('polytheism does not require writing_system', async () => {
    const { BELIEF_ARCHETYPES } = await import('../src/engines/belief/beliefEngine.js');
    expect(BELIEF_ARCHETYPES.polytheism.requires_tech).not.toContain('writing_system');
  });
});
