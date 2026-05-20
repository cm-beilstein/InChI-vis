import { describe, it, expect } from 'vitest';
import {
  parseInchi,
  parseConnectionBonds,
  parseHydrogenAtoms,
  parseMobileHydrogens,
  parseStereoAtoms,
} from '../parseInchi';

describe('parseInchi', () => {
  it('parses benzene InChI into 4 layers with correct types', () => {
    const layers = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    expect(layers[0]).toMatchObject({ type: 'version', text: '1S' });
    expect(layers[1]).toMatchObject({ type: 'formula', text: 'C6H6' });
    expect(layers[2]).toMatchObject({ type: 'c', prefix: 'c' });
    expect(layers[3]).toMatchObject({ type: 'h', prefix: 'h' });
  });

  it('enriches formula layer atoms = [1..N] for C6H6 (N=6 heavy atoms)', () => {
    const layers = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    expect(layers[1].atoms).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('enriches formula layer atoms correctly for ethanol C2H6O (N=3 heavy atoms)', () => {
    const layers = parseInchi('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');
    expect(layers[1].atoms).toEqual([1, 2, 3]);
  });

  it('enriches c layer bonds from connection text', () => {
    const layers = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    const cLayer = layers.find(l => l.type === 'c')!;
    expect(cLayer.bonds.length).toBeGreaterThan(0);
    // Benzene ring: c layer text is '1-2-4-6-5-3-1' — verify [1,2] is present
    expect(cLayer.bonds).toContainEqual([1, 2]);
  });

  it('enriches h layer atoms from hydrogen text', () => {
    const layers = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    const hLayer = layers.find(l => l.type === 'h')!;
    // h1-6H → atoms 1 through 6
    expect(hLayer.atoms).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('returns layers.length < 2 for empty InChI=1S//', () => {
    const layers = parseInchi('InChI=1S//');
    expect(layers.length).toBeLessThan(2);
  });

  it('parses ethanol InChI into correct layer count', () => {
    const layers = parseInchi('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');
    expect(layers[0]).toMatchObject({ type: 'version' });
    expect(layers[1]).toMatchObject({ type: 'formula' });
    expect(layers[2]).toMatchObject({ type: 'c', prefix: 'c' });
    expect(layers[3]).toMatchObject({ type: 'h', prefix: 'h' });
  });
});

describe('parseConnectionBonds', () => {
  it('parses linear chain 1-2-3 into [[1,2],[2,3]]', () => {
    expect(parseConnectionBonds('1-2-3')).toEqual([[1, 2], [2, 3]]);
  });

  it('parses benzene ring closure 1-2-4-6-5-3-1', () => {
    const bonds = parseConnectionBonds('1-2-4-6-5-3-1');
    expect(bonds).toContainEqual([1, 2]);
    expect(bonds).toContainEqual([3, 1]); // ring closure back to 1
  });

  it('parses branch notation 1-2(4)3', () => {
    const bonds = parseConnectionBonds('1-2(4)3');
    expect(bonds).toContainEqual([1, 2]);
    expect(bonds).toContainEqual([2, 4]); // branch to 4
    expect(bonds).toContainEqual([2, 3]); // continues from 2
  });
});

describe('parseHydrogenAtoms', () => {
  it('parses range 1-6H into {1:1,2:1,3:1,4:1,5:1,6:1}', () => {
    expect(parseHydrogenAtoms('1-6H')).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 });
  });

  it('parses mixed notation 3H,2H2,1H3', () => {
    const result = parseHydrogenAtoms('3H,2H2,1H3');
    expect(result[3]).toBe(1);
    expect(result[2]).toBe(2);
    expect(result[1]).toBe(3);
  });

  it('ignores mobile H groups in parentheses', () => {
    // "(H,3,4)" should be stripped before parsing fixed H
    const result = parseHydrogenAtoms('1H3,(H,3,4)');
    expect(result[1]).toBe(3);
    expect(result[3]).toBeUndefined(); // mobile H not in fixed map
  });
});

describe('parseMobileHydrogens', () => {
  it('extracts atom numbers from (H,3,4)', () => {
    expect(parseMobileHydrogens('1H3,(H,3,4)')).toEqual([3, 4]);
  });
});

describe('parseStereoAtoms', () => {
  it('extracts atom numbers from stereo notation', () => {
    expect(parseStereoAtoms('2-,5+')).toEqual([2, 5]);
  });
});
