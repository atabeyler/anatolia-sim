import { describe, it, expect } from 'vitest';
import { inheritEpigenome, initializeEpigenome } from '../src/engines/epigenetics/epigeneticsEngine.js';

function makeParent(methylation) {
  const p = {};
  initializeEpigenome(p);
  for (const id of Object.keys(p.epigenome)) {
    p.epigenome[id].methylation = methylation;
  }
  return p;
}

describe('inheritEpigenome', () => {
  it('child starts at neutral 0.5 when both parents are neutral', () => {
    const child = {};
    inheritEpigenome(child, makeParent(0.5), makeParent(0.5));
    for (const id of Object.keys(child.epigenome)) {
      expect(child.epigenome[id].methylation).toBeCloseTo(0.5, 5);
    }
  });

  it('heritability determines deviation from 0.5 — IMMUNE_PRIMING (h=0.6) at parents=1.0 → child≈0.8', () => {
    const child = {};
    inheritEpigenome(child, makeParent(1.0), makeParent(1.0));
    // formula: 0.5 + (1.0 - 0.5) * 0.6 = 0.8
    expect(child.epigenome['IMMUNE_PRIMING'].methylation).toBeCloseTo(0.8, 5);
  });

  it('heritability determines deviation — HPA_AXIS (h=0.3) at parents=1.0 → child≈0.65', () => {
    const child = {};
    inheritEpigenome(child, makeParent(1.0), makeParent(1.0));
    // formula: 0.5 + (1.0 - 0.5) * 0.3 = 0.65
    expect(child.epigenome['HPA_AXIS'].methylation).toBeCloseTo(0.65, 5);
  });

  it('child methylation clamped to [0, 1]', () => {
    const child = {};
    inheritEpigenome(child, makeParent(0.0), makeParent(0.0));
    for (const id of Object.keys(child.epigenome)) {
      expect(child.epigenome[id].methylation).toBeGreaterThanOrEqual(0);
      expect(child.epigenome[id].methylation).toBeLessThanOrEqual(1);
    }
  });

  it('initializes missing parent epigenomes automatically', () => {
    const p1 = {};
    const p2 = {};
    const child = {};
    expect(() => inheritEpigenome(child, p1, p2)).not.toThrow();
    expect(child.epigenome).toBeDefined();
  });
});
