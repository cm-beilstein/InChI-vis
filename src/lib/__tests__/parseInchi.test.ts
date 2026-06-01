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

describe('INCHI-06: multi-fragment enrichLayers', () => {
  const TOLUENE_BENZENE_INCHI = 'InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H';

  it('Test D: formulaLayer.atoms has 13 entries for toluene+benzene', () => {
    const layers = parseInchi(TOLUENE_BENZENE_INCHI);
    const formulaLayer = layers.find(l => l.type === 'formula')!;
    expect(formulaLayer).toBeDefined();
    expect(formulaLayer.atoms).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('Test D: cLayer.bonds does NOT contain spurious cross-fragment bond [7, 1]', () => {
    const layers = parseInchi(TOLUENE_BENZENE_INCHI);
    const cLayer = layers.find(l => l.type === 'c')!;
    expect(cLayer).toBeDefined();
    // [7, 1] would be the spurious bond created if the ';' is not handled:
    // the parser would see the '7' at end of fragment 1 and '1' at start of fragment 2 as connected
    expect(cLayer.bonds).not.toContainEqual([7, 1]);
  });

  it('Test D: cLayer.atoms does not contain atom indices > 13', () => {
    const layers = parseInchi(TOLUENE_BENZENE_INCHI);
    const cLayer = layers.find(l => l.type === 'c')!;
    expect(cLayer).toBeDefined();
    const allAbove13 = cLayer.atoms.filter(a => a > 13);
    expect(allAbove13).toHaveLength(0);
  });

  it('Test D: cLayer.bonds contains fragment-2 ring closure with offset applied', () => {
    // Fragment 2 text: '1-2-4-6-5-3-1' with offset=7
    // After offset: atoms 8,9,11,13,12,10,8 → bonds include [10, 8] (fragment-2 ring closure 3→1 + offset)
    const layers = parseInchi(TOLUENE_BENZENE_INCHI);
    const cLayer = layers.find(l => l.type === 'c')!;
    expect(cLayer).toBeDefined();
    // The ring closure in fragment 2 (1-2-4-6-5-3-1) → last bond is [3+7, 1+7] = [10, 8]
    expect(cLayer.bonds).toContainEqual([10, 8]);
  });

  it('Test E: hLayer.atoms includes fragment-2 atom 1 with offset 7 applied (= canonical 8)', () => {
    // h-layer text: '2-6H,1H3;1-6H'
    // Fragment 1: atoms 2,3,4,5,6 (range 2-6H) and atom 1 (1H3)
    // Fragment 2: atoms 1-6 with offset=7 → atoms 8,9,10,11,12,13
    const layers = parseInchi(TOLUENE_BENZENE_INCHI);
    const hLayer = layers.find(l => l.type === 'h')!;
    expect(hLayer).toBeDefined();
    // Fragment 1 atom 1 (bearing H3) should be present
    expect(hLayer.atoms).toContain(1);
    // Fragment 2 atom 1 (canonical 8 after offset) should be present
    expect(hLayer.atoms).toContain(8);
  });
});

describe('parseStereoAtoms', () => {
  it('extracts atom numbers from stereo notation', () => {
    expect(parseStereoAtoms('2-,5+')).toEqual([2, 5]);
  });
});
