import { describe, it, expect } from 'vitest';
import { parseInchiWithAux, remapAuxToPoolIds } from '../parseAuxMapping';

// ---------------------------------------------------------------------------
// Task 1 — /rC: parsing in parseInchiWithAux
// ---------------------------------------------------------------------------

// Real getInchi(true) benzene dump (single line) reusing the canonical /rC: fixture
// captured from Ketcher 3.12.0 (see parseAuxMapping.test.ts BENZENE_AUXINFO_BODY).
const BENZENE_RAW =
  'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\n' +
  'AuxInfo=1/0/N:1,3,5,2,6,4/E:(1,2,3,4,5,6)/rA:6CCCCCC/rB:;d-1s2;d-2;s1;s4d-5;' +
  '/rC:5.2715,-9.0876,0;7.0018,-9.0871,0;6.1383,-8.5875,0;7.0018,-10.088,0;5.2715,-10.0925,0;6.1405,-10.5875,0;';

// Same molecule but with the AuxInfo /rC: field removed entirely.
const BENZENE_RAW_NO_RC =
  'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\n' +
  'AuxInfo=1/0/N:1,3,5,2,6,4/E:(1,2,3,4,5,6)/rA:6CCCCCC/rB:;d-1s2;d-2;s1;s4d-5;';

describe('parseInchiWithAux — /rC: parsing', () => {
  it('parses molfileCoords from the /rC: field (one entry per molfile rank)', () => {
    const result = parseInchiWithAux(BENZENE_RAW);
    expect(result.molfileCoords).toHaveLength(6);
    expect(result.molfileCoords[0].x).toBeCloseTo(5.2715, 3);
    expect(result.molfileCoords[0].y).toBeCloseTo(-9.0876, 3);
    expect(result.molfileCoords[5].x).toBeCloseTo(6.1405, 3);
    expect(result.molfileCoords[5].y).toBeCloseTo(-10.5875, 3);
  });

  it('returns molfileCoords: [] when /rC: is absent', () => {
    const result = parseInchiWithAux(BENZENE_RAW_NO_RC);
    expect(result.molfileCoords).toEqual([]);
  });

  it('returns molfileCoords: [] when there is no AuxInfo section at all', () => {
    const result = parseInchiWithAux('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    expect(result.molfileCoords).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — remapAuxToPoolIds coordinate matching, fallback, and no-regression
// ---------------------------------------------------------------------------

describe('remapAuxToPoolIds', () => {
  it('matches each canonical to the live atom at the same (x, -y) coordinate', () => {
    // benzene auxMap: canonical → molfile rank
    const { auxMap, molfileCoords } = parseInchiWithAux(BENZENE_RAW);
    // Live atoms: screen y is POSITIVE (molfile y negated). Pool IDs are
    // interleaved/non-sequential to prove rank!=iteration-order is corrected.
    const liveAtoms = [
      { poolId: 40, x: 5.2715, y: 9.0876 },  // matches rank 0
      { poolId: 41, x: 7.0018, y: 9.0871 },  // matches rank 1
      { poolId: 42, x: 6.1383, y: 8.5875 },  // matches rank 2
      { poolId: 43, x: 7.0018, y: 10.088 },  // matches rank 3
      { poolId: 44, x: 5.2715, y: 10.0925 }, // matches rank 4
      { poolId: 45, x: 6.1405, y: 10.5875 }, // matches rank 5
    ];
    // Fallback in iteration order (rank → poolId) — DELIBERATELY WRONG order so
    // that a passing coord match proves coordinate matching was used, not fallback.
    const fallbackPoolIds = [45, 44, 43, 42, 41, 40];
    const result = remapAuxToPoolIds(auxMap, molfileCoords, liveAtoms, fallbackPoolIds);
    // canonical c → rank auxMap[c] → poolId 40+rank (from coordinate match)
    for (const [canonStr, rank] of Object.entries(auxMap)) {
      expect(result[Number(canonStr)]).toBe(40 + (rank as number));
    }
    // bijection over the 6 distinct pool IDs
    expect(new Set(Object.values(result)).size).toBe(6);
  });

  it('keeps multi-component fragments in their correct bucket (synthetic 2-fragment reorder)', () => {
    // Two benzene rings. molfile groups by component: ranks 0..5 = ring A, 6..11 = ring B.
    // Pool IDs are interleaved across the two rings (A: even-ish, B: high) — exactly the
    // multi-component case where iteration order != molfile order.
    const molfileCoords = [
      { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 2, y: -1 },   // ring A ranks 0-2
      { x: 0, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -2 },   // ring A ranks 3-5
      { x: 10, y: -1 }, { x: 11, y: -1 }, { x: 12, y: -1 }, // ring B ranks 6-8
      { x: 10, y: -2 }, { x: 11, y: -2 }, { x: 12, y: -2 }, // ring B ranks 9-11
    ];
    // auxMap canonical 1..6 → ring A ranks, 7..12 → ring B ranks
    const auxMap: Record<number, number> = {
      1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
      7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11,
    };
    // Live atoms: ring A pool IDs {6,7,8,9,10,11}, ring B pool IDs {20,21,22,23,24,25}.
    // Listed in INTERLEAVED iteration order so the fallback would scramble fragments.
    const liveAtoms = [
      { poolId: 6, x: 0, y: 1 },   { poolId: 20, x: 10, y: 1 },
      { poolId: 7, x: 1, y: 1 },   { poolId: 21, x: 11, y: 1 },
      { poolId: 8, x: 2, y: 1 },   { poolId: 22, x: 12, y: 1 },
      { poolId: 9, x: 0, y: 2 },   { poolId: 23, x: 10, y: 2 },
      { poolId: 10, x: 1, y: 2 },  { poolId: 24, x: 11, y: 2 },
      { poolId: 11, x: 2, y: 2 },  { poolId: 25, x: 12, y: 2 },
    ];
    // Iteration-order fallback (what the OLD buggy code used).
    const fallbackPoolIds = liveAtoms.map(a => a.poolId);
    const result = remapAuxToPoolIds(auxMap, molfileCoords, liveAtoms, fallbackPoolIds);
    const ringA = new Set([6, 7, 8, 9, 10, 11]);
    const ringB = new Set([20, 21, 22, 23, 24, 25]);
    for (let c = 1; c <= 6; c++) expect(ringA.has(result[c])).toBe(true);
    for (let c = 7; c <= 12; c++) expect(ringB.has(result[c])).toBe(true);
    expect(new Set(Object.values(result)).size).toBe(12);
  });

  it('no-regression: when molfileCoords order == liveAtoms order, result equals fallbackPoolIds[rank]', () => {
    const molfileCoords = [
      { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 2, y: -1 },
    ];
    const auxMap: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
    const liveAtoms = [
      { poolId: 5, x: 0, y: 1 },
      { poolId: 6, x: 1, y: 1 },
      { poolId: 7, x: 2, y: 1 },
    ];
    const fallbackPoolIds = [5, 6, 7];
    const result = remapAuxToPoolIds(auxMap, molfileCoords, liveAtoms, fallbackPoolIds);
    for (const [canonStr, rank] of Object.entries(auxMap)) {
      expect(result[Number(canonStr)]).toBe(fallbackPoolIds[rank as number]);
    }
  });

  it('fallback: molfileCoords=[] forces every canonical to fallbackPoolIds[rank]', () => {
    const auxMap: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
    const liveAtoms = [
      { poolId: 5, x: 0, y: 1 },
      { poolId: 6, x: 1, y: 1 },
      { poolId: 7, x: 2, y: 1 },
    ];
    const fallbackPoolIds = [5, 6, 7];
    const result = remapAuxToPoolIds(auxMap, [], liveAtoms, fallbackPoolIds);
    for (const [canonStr, rank] of Object.entries(auxMap)) {
      expect(result[Number(canonStr)]).toBe(fallbackPoolIds[rank as number]);
    }
  });

  it('fallback: a single rank with no coord match falls back for that entry only', () => {
    const molfileCoords = [
      { x: 0, y: -1 },
      { x: 999, y: -999 }, // no live atom near here → fallback for this one
      { x: 2, y: -1 },
    ];
    const auxMap: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
    const liveAtoms = [
      { poolId: 50, x: 0, y: 1 },
      { poolId: 51, x: 2, y: 1 },
    ];
    const fallbackPoolIds = [50, 60, 51];
    const result = remapAuxToPoolIds(auxMap, molfileCoords, liveAtoms, fallbackPoolIds);
    expect(result[1]).toBe(50); // coord match
    expect(result[2]).toBe(60); // fallback (rank 1)
    expect(result[3]).toBe(51); // coord match
  });
});
