import { describe, it, expect } from 'vitest';
import { parseAuxMapping, parseInchiWithAux } from '../parseAuxMapping';

// ASSUMED A1: Ketcher global draw-order in N: field continues across fragments (not reset per fragment)
// ASSUMED A2: N: fragment separator in AuxInfo is ';'
// These must be validated empirically by drawing toluene+benzene and running getInchi(true)
const TOLUENE_BENZENE_INCHI = 'InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H';
// Plausible toluene(7)+benzene(6) AuxInfo body — fragment 1 draw orders are 7,1,2,3,4,5,6 (global 1–7),
// fragment 2 draw orders are 8,9,10,11,12,13 (global, continuing from fragment 1)
const TOLUENE_BENZENE_AUXBODY = '1/0/N:7,1,2,3,4,5,6;8,9,10,11,12,13/E:(1,2,3,4,5,6,7)(8,9,10,11,12,13)/rA:13nCCCCCCCCCCCCC/rB:;;d1s3;d-3;;s1;d-6;s2s5s6d-8;s3s7;s4;s10s9;s11;/rC:;;;;;;;;;;;/';

// Fixture: real getInchi(true) output captured from Ketcher 3.12.0 on 2026-05-20
// Verified empirically from browser console: window.ketcher.getInchi(true)
const BENZENE_AUXINFO_BODY = '1/0/N:1,3,5,2,6,4/E:(1,2,3,4,5,6)/rA:6CCCCCC/rB:;d-1s2;d-2;s1;s4d-5;/rC:5.2715,-9.0876,0;7.0018,-9.0871,0;6.1383,-8.5875,0;7.0018,-10.088,0;5.2715,-10.0925,0;6.1405,-10.5875,0;';

describe('parseAuxMapping', () => {
  it('maps real Ketcher 3.12.0 benzene N:1,3,5,2,6,4 to correct canonical→Ketcher 0-based indices', () => {
    const map = parseAuxMapping(BENZENE_AUXINFO_BODY);
    expect(map[1]).toBe(0); // canonical 1 → draw order 1 → index 0
    expect(map[2]).toBe(2); // canonical 2 → draw order 3 → index 2
    expect(map[3]).toBe(4); // canonical 3 → draw order 5 → index 4
    expect(map[4]).toBe(1); // canonical 4 → draw order 2 → index 1
    expect(map[5]).toBe(5); // canonical 5 → draw order 6 → index 5
    expect(map[6]).toBe(3); // canonical 6 → draw order 4 → index 3
  });

  it('handles single-atom molecule N:1', () => {
    const map = parseAuxMapping('1/0/N:1');
    expect(map[1]).toBe(0);
    expect(Object.keys(map)).toHaveLength(1);
  });

  it('returns empty map when N: field is absent', () => {
    const map = parseAuxMapping('1/0/E:(1,2)');
    expect(map).toEqual({});
  });

  it('returns empty map for empty string', () => {
    expect(parseAuxMapping('')).toEqual({});
  });
});

describe('INCHI-06: multi-fragment N: parsing', () => {
  it('Test A: two-fragment N: value maps fragment-1 atoms correctly', () => {
    // N:7,1,2,3,4,5,6;8,9,10,11,12,13 with toluene(7)+benzene(6)
    // Fragment 1: position 0 → canonical 1 → draw order 7 → index 6
    //             position 1 → canonical 2 → draw order 1 → index 0
    //             position 6 → canonical 7 → draw order 6 → index 5
    // Fragment 2 offset=7: position 0 → canonical 8 → draw order 8 → index 7
    //                      position 1 → canonical 9 → draw order 9 → index 8
    //                      position 5 → canonical 13 → draw order 13 → index 12
    const raw = TOLUENE_BENZENE_INCHI + '\nAuxInfo=' + TOLUENE_BENZENE_AUXBODY;
    const result = parseInchiWithAux(raw);
    // Fragment 1 checks
    expect(result.auxMap[1]).toBe(6);  // draw order 7 → index 6
    expect(result.auxMap[2]).toBe(0);  // draw order 1 → index 0
    expect(result.auxMap[7]).toBe(5);  // draw order 6 → index 5
    // Fragment 2 checks (offset=7)
    expect(result.auxMap[8]).toBe(7);  // draw order 8 → index 7
    expect(result.auxMap[9]).toBe(8);  // draw order 9 → index 8
    expect(result.auxMap[13]).toBe(12); // draw order 13 → index 12
    expect(Object.keys(result.auxMap)).toHaveLength(13);
  });

  it('Test B: single-fragment N: without semicolon still works (regression)', () => {
    // parseAuxMapping should still work correctly for single-fragment molecules
    const map = parseAuxMapping(BENZENE_AUXINFO_BODY);
    expect(map[1]).toBe(0);
    expect(map[2]).toBe(2);
    expect(Object.keys(map)).toHaveLength(6);
  });

  it('Test C: parseInchiWithAux with two-fragment raw string produces correct auxMap[8] for fragment-2 atom', () => {
    const raw = TOLUENE_BENZENE_INCHI + '\nAuxInfo=' + TOLUENE_BENZENE_AUXBODY;
    const result = parseInchiWithAux(raw);
    // Fragment 2's first atom (canonical index 8 = offset 7 + local canonical 1)
    // should map to Ketcher index 7 (draw order 8 → 0-based index 7)
    expect(result.auxMap[8]).toBe(7);
  });
});

describe('parseInchiWithAux', () => {
  it('splits real Ketcher 3.12.0 getInchi(true) output into inchi, layers, and auxMap', () => {
    const raw = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=' + BENZENE_AUXINFO_BODY;
    const result = parseInchiWithAux(raw);
    expect(result.inchi).toBe('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    expect(result.layers.length).toBeGreaterThan(1);
    expect(result.auxMap[1]).toBe(0); // canonical 1 → draw order 1 → index 0
    expect(result.auxMap[4]).toBe(1); // canonical 4 → draw order 2 → index 1
  });

  it('handles plain InChI with no AuxInfo section', () => {
    const raw = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    const result = parseInchiWithAux(raw);
    expect(result.inchi).toBe(raw);
    expect(result.auxMap).toEqual({});
  });
});
