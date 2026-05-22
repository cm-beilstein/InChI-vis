import { describe, it, expect } from 'vitest';
import { deriveMappingPairs } from '../lib/deriveMappingPairs';
import type { AuxMap } from '../lib/parseInchi';

// Benzene fixture: auxMap from App.tsx handleChange after pool ID remapping
// Pool IDs = [0, 2, 4, 1, 5, 3] for canonical atoms [1,2,3,4,5,6]
// Sorted pool IDs: [0,1,2,3,4,5] → draw ranks 1-6
// canonical 1→poolId 0 → rank 1; canonical 2→poolId 2 → rank 3; etc.
const BENZENE_AUXMAP: AuxMap = { 1: 0, 2: 2, 3: 4, 4: 1, 5: 5, 6: 3 };
const BENZENE_ELEMENTS: Record<number, string> = { 1:'C', 2:'C', 3:'C', 4:'C', 5:'C', 6:'C' };

describe('deriveMappingPairs', () => {
  it('returns empty array when auxMap is empty', () => {
    expect(deriveMappingPairs({}, {})).toEqual([]);
  });

  it('derives benzene pairs sorted by ketcherRank', () => {
    const pairs = deriveMappingPairs(BENZENE_AUXMAP, BENZENE_ELEMENTS);
    expect(pairs[0]).toEqual({ k: 1, c: 1, el: 'C' }); // poolId 0 → rank 1, canonical 1
    expect(pairs[1]).toEqual({ k: 2, c: 4, el: 'C' }); // poolId 1 → rank 2, canonical 4
    expect(pairs[2]).toEqual({ k: 3, c: 2, el: 'C' }); // poolId 2 → rank 3, canonical 2
    expect(pairs).toHaveLength(6);
  });

  it('classifies identity pairs (ketcherRank === canonical)', () => {
    // For benzene: k=1,c=1 is identity; k=2,c=4 is divergent
    const pairs = deriveMappingPairs(BENZENE_AUXMAP, BENZENE_ELEMENTS);
    const identityPair = pairs.find(p => p.k === 1 && p.c === 1);
    expect(identityPair).toBeDefined();
    expect(identityPair!.k).toBe(identityPair!.c);
  });

  it('classifies divergent pairs (ketcherRank !== canonical)', () => {
    const pairs = deriveMappingPairs(BENZENE_AUXMAP, BENZENE_ELEMENTS);
    const divergentPairs = pairs.filter(p => p.k !== p.c);
    expect(divergentPairs.length).toBeGreaterThan(0);
  });

  it('pairs are sorted ascending by ketcherRank', () => {
    const pairs = deriveMappingPairs(BENZENE_AUXMAP, BENZENE_ELEMENTS);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i].k).toBeGreaterThanOrEqual(pairs[i-1].k);
    }
  });

  it('falls back to "?" for unknown element', () => {
    const map: AuxMap = { 1: 0 };
    const pairs = deriveMappingPairs(map, {}); // no atomElements
    expect(pairs[0].el).toBe('?');
  });
});
