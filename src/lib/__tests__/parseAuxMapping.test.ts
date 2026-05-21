import { describe, it, expect } from 'vitest';
import { parseAuxMapping, parseInchiWithAux, parseAtomElements } from '../parseAuxMapping';

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

describe('parseAtomElements', () => {
  it('parses benzene rA:6CCCCCC to 1-based map of 6 carbons', () => {
    // Fixture: real Ketcher 3.12.0 benzene AuxInfo body
    const body = '1/0/N:1,3,5,2,6,4/E:(1,2,3,4,5,6)/rA:6CCCCCC/rB:;d-1s2;d-2;s1;s4d-5;/rC:5.27,-9.09,0;';
    const map = parseAtomElements(body);
    expect(map[1]).toBe('C');
    expect(map[2]).toBe('C');
    expect(map[6]).toBe('C');
    expect(Object.keys(map)).toHaveLength(6);
  });

  it('returns empty map when rA: field is absent', () => {
    expect(parseAtomElements('1/0/N:1,2,3')).toEqual({});
  });

  it('returns empty map for empty string', () => {
    expect(parseAtomElements('')).toEqual({});
  });

  // Assumption A1 verification fixture (chlorobenzene-style: 6C + 1Cl)
  // Format: rA:7CClCCCCC — 7 atoms; first is C, second is Cl (two chars), rest are C
  it('handles two-character element symbols (Cl) correctly', () => {
    const body = '1/0/N:1,2,3,4,5,6,7/rA:7CClCCCCC';
    const map = parseAtomElements(body);
    expect(map[1]).toBe('C');
    expect(map[2]).toBe('Cl');
    expect(map[3]).toBe('C');
    expect(Object.keys(map)).toHaveLength(7);
  });
});

describe('parseInchiWithAux — atomElements', () => {
  it('returns atomElements field with 6 carbons for benzene', () => {
    const BENZENE_AUXINFO_BODY = '1/0/N:1,3,5,2,6,4/E:(1,2,3,4,5,6)/rA:6CCCCCC/rB:;d-1s2;d-2;s1;s4d-5;/rC:5.2715,-9.0876,0;7.0018,-9.0871,0;6.1383,-8.5875,0;7.0018,-10.088,0;5.2715,-10.0925,0;6.1405,-10.5875,0;';
    const raw = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=' + BENZENE_AUXINFO_BODY;
    const result = parseInchiWithAux(raw);
    expect(result).toHaveProperty('atomElements');
    expect(result.atomElements[1]).toBe('C');
    expect(result.atomElements[6]).toBe('C');
    expect(Object.keys(result.atomElements)).toHaveLength(6);
  });

  it('returns empty atomElements when no rA: field present', () => {
    const raw = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=1/0/N:1,2,3,4,5,6';
    const result = parseInchiWithAux(raw);
    expect(result).toHaveProperty('atomElements');
    expect(result.atomElements).toEqual({});
  });
});
