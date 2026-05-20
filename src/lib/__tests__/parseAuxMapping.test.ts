import { describe, it, expect } from 'vitest';
import { parseAuxMapping, parseInchiWithAux } from '../parseAuxMapping';

describe('parseAuxMapping', () => {
  // NOTE (Assumption A1): The N: values below are from a web search example for benzene.
  // These MUST be verified empirically before the phase gate:
  //   1. Run `npm run dev`
  //   2. Draw benzene in the editor
  //   3. Run in browser console: window.ketcher.getInchi(true).then(console.log)
  //   4. Capture the AuxInfo body (after "AuxInfo=") and update this fixture.
  // Until verified, these tests validate the parsing logic, not the exact Ketcher 3.12.0 values.
  it('maps N:1,2,6,3,5,4 to correct canonical→Ketcher 0-based indices', () => {
    const map = parseAuxMapping('1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/rA:6nCCCCCC');
    expect(map[1]).toBe(0); // canonical 1 → draw order 1 → index 0
    expect(map[2]).toBe(1); // canonical 2 → draw order 2 → index 1
    expect(map[3]).toBe(5); // canonical 3 → draw order 6 → index 5
    expect(map[4]).toBe(2); // canonical 4 → draw order 3 → index 2
    expect(map[5]).toBe(4); // canonical 5 → draw order 5 → index 4
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
  it('splits raw getInchi(true) output into inchi, layers, and auxMap', () => {
    const raw = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)';
    const result = parseInchiWithAux(raw);
    expect(result.inchi).toBe('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    expect(result.layers.length).toBeGreaterThan(1);
    expect(result.auxMap[1]).toBe(0);
  });

  it('handles plain InChI with no AuxInfo section', () => {
    const raw = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    const result = parseInchiWithAux(raw);
    expect(result.inchi).toBe(raw);
    expect(result.auxMap).toEqual({});
  });
});
