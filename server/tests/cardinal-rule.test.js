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
      if (/\.consciousness\s*=[^=]/.test(src)) {
        violators.push(file.replace(ENGINES_DIR + '/', ''));
      }
    }
    expect(
      violators,
      `Files writing .consciousness outside consciousnessEngine.js: ${violators.join(', ')}`
    ).toEqual([]);
  });

  it('only genome.js and epigeneticsEngine.js may mutate phenotype fields directly', () => {
    const files = collectEngineFiles(ENGINES_DIR);
    // These files are permitted to write phenotype fields
    const ALLOWED = ['genome.js', 'epigeneticsEngine.js', 'individual.js'];
    const violators = [];
    for (const file of files) {
      const basename = file.split('/').pop();
      if (ALLOWED.includes(basename)) continue;
      const src = readFileSync(file, 'utf8');
      // Match patterns like: p.someField = value or phenotype.someField = value
      // but NOT comparisons (===, !==, >=, <=, ==, !=) and NOT property access chains
      const matches = src.match(/\bp\.((?!is_dead|alive|group_id|name)[a-z_]+)\s*=[^=]/g) ?? [];
      // Filter out false positives: lines with 'const p =' or 'let p =' or 'p =' where p is not phenotype
      const realMatches = matches.filter(m => !m.includes('p.x') && !m.includes('p.y') && !m.includes('p.id'));
      if (realMatches.length > 0) violators.push({ file: basename, matches: realMatches });
    }
    expect(
      violators,
      `Files with direct phenotype mutation outside allowed set:\n${JSON.stringify(violators, null, 2)}`
    ).toEqual([]);
  });

  it('foxp2_expression is never directly assigned outside languageEngine.js and individual.js', () => {
    const files = collectEngineFiles(ENGINES_DIR);
    const violators = [];
    for (const file of files) {
      if (file.endsWith('languageEngine.js') || file.endsWith('individual.js')) continue;
      const src = readFileSync(file, 'utf8');
      if (/foxp2_expression\s*=[^=]/.test(src)) {
        violators.push(file.replace(ENGINES_DIR + '/', ''));
      }
    }
    expect(violators, `foxp2_expression written outside allowed files: ${violators.join(', ')}`).toEqual([]);
  });

  it('beliefs are only added via beliefEngine.js (no direct ind.beliefs.add outside)', () => {
    const files = collectEngineFiles(ENGINES_DIR);
    const violators = [];
    for (const file of files) {
      if (file.endsWith('beliefEngine.js')) continue;
      const src = readFileSync(file, 'utf8');
      if (/\.beliefs\.(add|set)\s*\(/.test(src)) {
        violators.push(file.replace(ENGINES_DIR + '/', ''));
      }
    }
    expect(violators, `ind.beliefs.add() called outside beliefEngine.js: ${violators.join(', ')}`).toEqual([]);
  });

  it('known_techs are only added via technologyEngine.js or activityEngine.js', () => {
    const files = collectEngineFiles(ENGINES_DIR);
    const ALLOWED = ['technologyEngine.js', 'activityEngine.js'];
    const violators = [];
    for (const file of files) {
      const basename = file.split('/').pop();
      if (ALLOWED.includes(basename)) continue;
      const src = readFileSync(file, 'utf8');
      if (/\.known_techs\.(add|set)\s*\(/.test(src)) {
        violators.push(file.replace(ENGINES_DIR + '/', ''));
      }
    }
    expect(violators, `known_techs.add() called outside allowed files: ${violators.join(', ')}`).toEqual([]);
  });

  it('polytheism belief requires pottery, not writing_system', () => {
    const src = readFileSync(join(ENGINES_DIR, 'belief/beliefEngine.js'), 'utf8');
    // polytheism: { ... } block — key written without quotes
    const polytStart = src.indexOf('polytheism:');
    const polytBlock = src.slice(polytStart, polytStart + 300);
    expect(polytBlock).toContain('pottery');
    // writing_system must not appear before the next top-level belief key
    const nextKey = polytBlock.search(/\bmonotheism\b/);
    const polytDef = nextKey > 0 ? polytBlock.slice(0, nextKey) : polytBlock;
    expect(polytDef).not.toContain("'writing_system'");
  });
});
