import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINES_DIR = join(__dirname, '../src/engines');

function collectEngineFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectEngineFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

describe('Cardinal Rule', () => {
  it('only consciousnessEngine.js may directly assign to .consciousness', () => {
    const files = collectEngineFiles(ENGINES_DIR);
    const violators = [];
    for (const file of files) {
      if (file.endsWith('consciousnessEngine.js')) continue;
      const src = readFileSync(file, 'utf8');
      // Match direct assignment (.consciousness = ...) but not comparisons (==, ===, >=, <=, !=)
      if (/\.consciousness\s*=[^=]/.test(src)) {
        violators.push(file.replace(ENGINES_DIR + '/', ''));
      }
    }
    expect(
      violators,
      `Files writing .consciousness outside consciousnessEngine.js: ${violators.join(', ')}`
    ).toEqual([]);
  });
});
