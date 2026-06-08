// Wave 0 RED state: all tests FAIL against stubs that return []
// Implementation fills in Plan 02.
import { describe, it, expect, vi } from 'vitest';
import { buildHighlightSpecs, buildSubHoverSpecs } from '../highlightUtils';
import type { StructLike } from '../highlightUtils';
import type { Layer, AuxMap } from '../parseInchi';

// Identity mock — CSS var names passed through as-is for readable assertions
const resolveVarFn = (name: string): string => name;

// Benzene fixture (6 C atoms, cyclic bonds)
const auxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const atomElements: Record<number, string> = {
  1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C',
};

// Mock struct for c-layer tests — no charged atoms
function makeMockStruct(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

// Mock struct with one positively charged atom at pool id 2
function makeMockStructWithCharge(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
      }),
    },
    atoms: {
      forEach: vi.fn((cb) => {
        cb({ charge: 0 }, 0);
        cb({ charge: 0 }, 1);
        cb({ charge: 1 }, 2);  // N+ at pool id 2
        cb({ charge: 0 }, 3);
        cb({ charge: 0 }, 4);
        cb({ charge: 0 }, 5);
      }),
    },
  };
}

/**
 * Phase 8: Mock struct with an explicit H atom.
 * Bonds 0–5 are the same benzene ring as makeMockStruct.
 * Bond 6 connects pool 0 (heavy atom) to pool 6 (explicit H atom).
 */
function makeMockStructWithExplicitH(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
        cb({ begin: 0, end: 6 }, 6); // bond 6: explicit H (pool 6) bonded to heavy atom (pool 0)
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

// Helper to make a basic layer
function makeLayer(overrides: Partial<Layer>): Layer {
  return {
    type: 'formula',
    prefix: '',
    text: '',
    atoms: [],
    bonds: [],
    ...overrides,
  };
}

const formulaLayer: Layer = makeLayer({
  type: 'formula',
  text: 'C6H6',
  atoms: [1, 2, 3, 4, 5, 6],
});

const cLayer: Layer = makeLayer({
  type: 'c',
  prefix: 'c',
  text: '1-2-3-4-5-6-1',
  atoms: [1, 2, 3, 4, 5, 6],
  bonds: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]],
});

const hLayer: Layer = makeLayer({
  type: 'h',
  prefix: 'h',
  text: '1-6H',
  atoms: [1, 2, 3, 4, 5, 6],
});

const hLayerMulti: Layer = makeLayer({
  type: 'h',
  prefix: 'h',
  text: '1H3,2H',
  atoms: [1, 2],
});

const hLayerMobile: Layer = makeLayer({
  type: 'h',
  prefix: 'h',
  text: '(H,3,4)',
  atoms: [3, 4],
});

const tLayer: Layer = makeLayer({
  type: 't',
  prefix: 't',
  text: '1+,2-',
  atoms: [1, 2],
});

const bLayer: Layer = makeLayer({
  type: 'b',
  prefix: 'b',
  text: '1-2+',
  atoms: [1, 2],
});

const mLayer: Layer = makeLayer({
  type: 'm',
  prefix: 'm',
  text: '1',
  atoms: [],
});

const sLayer: Layer = makeLayer({
  type: 's',
  prefix: 's',
  text: '1',
  atoms: [],
});

const versionLayer: Layer = makeLayer({
  type: 'version',
  prefix: '',
  text: '1S',
  atoms: [],
});

const qLayer: Layer = makeLayer({
  type: 'q',
  prefix: 'q',
  text: '+1',
  atoms: [],
});

const pLayer: Layer = makeLayer({
  type: 'p',
  prefix: 'p',
  text: '+1',
  atoms: [],
});

const iLayer: Layer = makeLayer({
  type: 'i',
  prefix: 'i',
  text: '2D',
  atoms: [],
});

// Layers array including t-layer for m/s tests
const allLayers: Layer[] = [versionLayer, formulaLayer, cLayer, hLayer, tLayer, mLayer, sLayer];

describe('buildHighlightSpecs', () => {
  describe('INCHI-03: layer-wide highlights', () => {
    it('formula layer: returns specs with C atoms grouped by element color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      // Should NOT be empty — C atoms should be grouped by --c-el-C color
      expect(specs.length).toBeGreaterThan(0);
      // All 6 atoms should appear in specs
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds).toContain(0); // canonical 1 → ketcher 0
      expect(allAtomIds).toContain(5); // canonical 6 → ketcher 5
    });

    it('formula layer: atom color is elementColor resolved (--c-el-C)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      // With identity resolveVarFn, color should be '--c-el-C'
      const cSpec = specs.find(s => s.atoms.includes(0));
      expect(cSpec).toBeDefined();
      expect(cSpec!.color).toBe('--c-el-C');
    });

    it('formula layer with N atom: N atoms get --c-el-N color', () => {
      const mixedLayer: Layer = makeLayer({
        type: 'formula',
        text: 'C2N',
        atoms: [1, 2, 3],
      });
      const mixedElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'N' };
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(mixedLayer, null, { 1: 0, 2: 1, 3: 2 }, mixedElements, [], allLayers, struct, resolveVarFn);
      const nSpec = specs.find(s => s.atoms.includes(2));
      expect(nSpec).toBeDefined();
      expect(nSpec!.color).toBe('--c-el-N');
    });

    it('formula layer: bonds array is empty (no bond highlights)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const hasBonds = specs.some(s => s.bonds.length > 0);
      expect(hasBonds).toBe(false);
    });

    it('c-layer: atoms from bond endpoint set are returned', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds.length).toBeGreaterThan(0);
    });

    it('c-layer: bonds array is non-empty (findBondId was called)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const hasBonds = specs.some(s => s.bonds.length > 0);
      expect(hasBonds).toBe(true);
    });

    it('c-layer: color is --c-conn', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-conn');
    });

    it('h-layer: atoms grouped by H-count color (count 1 → --c-hydro-1)', () => {
      // hLayer has text '1-6H' → all atoms get count 1
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(hLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      const spec = specs[0];
      expect(spec.color).toBe('--c-hydro-1');
    });

    it('h-layer: count 3 → --c-hydro-3', () => {
      // hLayerMulti has '1H3,2H' → atom 1 gets count 3, atom 2 gets count 1
      const struct = makeMockStruct();
      const smallAuxMap: AuxMap = { 1: 0, 2: 1 };
      const smallElements: Record<number, string> = { 1: 'C', 2: 'C' };
      const specs = buildHighlightSpecs(hLayerMulti, null, smallAuxMap, smallElements, [], allLayers, struct, resolveVarFn);
      const hydro3Spec = specs.find(s => s.color === '--c-hydro-3');
      expect(hydro3Spec).toBeDefined();
      expect(hydro3Spec!.atoms).toContain(0); // canonical 1 → ketcher 0
    });

    it('h-layer: mobile H atoms get --c-hydro-mobile color', () => {
      const struct = makeMockStruct();
      const smallAuxMap: AuxMap = { 3: 2, 4: 3 };
      const smallElements: Record<number, string> = { 3: 'C', 4: 'C' };
      const specs = buildHighlightSpecs(hLayerMobile, null, smallAuxMap, smallElements, [], allLayers, struct, resolveVarFn);
      const mobileSpec = specs.find(s => s.color === '--c-hydro-mobile');
      expect(mobileSpec).toBeDefined();
      expect(mobileSpec!.atoms).toContain(2); // canonical 3 → ketcher 2
      expect(mobileSpec!.atoms).toContain(3); // canonical 4 → ketcher 3
    });

    it('t-layer: plus-parity atoms get --c-stereo-plus', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(tLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
      expect(plusSpec).toBeDefined();
      expect(plusSpec!.atoms).toContain(0); // canonical 1 → ketcher 0
    });

    it('t-layer: minus-parity atoms get --c-stereo-minus', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(tLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
      expect(minusSpec).toBeDefined();
      expect(minusSpec!.atoms).toContain(1); // canonical 2 → ketcher 1
    });

    it('b-layer: highlights the double-bond atom pair and the bond with stereo-plus color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(bLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-stereo-plus');
      expect(specs[0].atoms).toEqual(expect.arrayContaining([0, 1]));
      expect(specs[0].bonds).toContain(99); // findBondId(0,1) in mock struct
    });

    it('m-layer: reads atoms from co-present t-layer, uses --c-stereo color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(mLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo');
      // Should include stereo atoms from t-layer (canonical 1,2 → ketcher 0,1)
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds).toContain(0);
      expect(allAtomIds).toContain(1);
    });

    it('s-layer: reads atoms from co-present t-layer, uses --c-stereo color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(sLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo');
    });

    it('m-layer with no t-layer: returns empty array', () => {
      const struct = makeMockStruct();
      const noTLayers: Layer[] = [versionLayer, formulaLayer, mLayer];
      const specs = buildHighlightSpecs(mLayer, null, auxMap, atomElements, [], noTLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('version layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(versionLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('q layer: highlights all atoms in the charged fragment (single fragment)', () => {
      // qLayer.text = '+1', formulaLayer = C6H6 (6 heavy atoms) → all 6 atoms highlighted
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(qLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-charge');
      expect(specs[0].atoms).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('q layer multi-fragment: only highlights atoms in the charged fragment', () => {
      // CuSO4-like: q '+2;' → fragment 1 (Cu, 1 atom) charged; fragment 2 (H2O4S, 5 heavy atoms) not
      const cuSo4FormulaLayer = makeLayer({ type: 'formula', text: 'Cu.H2O4S', atoms: [1, 2, 3, 4, 5, 6] });
      const cuSo4QLayer = makeLayer({ type: 'q', prefix: 'q', text: '+2;', atoms: [] });
      const cuSo4AuxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
      const cuSo4Elements: Record<number, string> = { 1: 'Cu', 2: 'O', 3: 'O', 4: 'O', 5: 'O', 6: 'S' };
      const localLayers: Layer[] = [cuSo4FormulaLayer, cuSo4QLayer];
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cuSo4QLayer, null, cuSo4AuxMap, cuSo4Elements, [], localLayers, struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-charge');
      expect(specs[0].atoms).toEqual([0]); // only Cu (pool id 0)
    });

    it('p layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(pLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('i layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(iLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });
  });

  describe('INCHI-05: formula layer with explicit H atoms (hAtomPoolIds)', () => {
    it('formula layer with hAtomPoolIds: H pool IDs are appended with --c-el-H color', () => {
      const struct = makeMockStruct();
      // Simulate ethanol-like molecule: 2 C atoms (canonical 1,2 → ketcher 0,1) + 1 explicit H (pool id 7)
      const hAtomPoolIds = [7];
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, hAtomPoolIds, allLayers, struct, resolveVarFn);
      const hSpec = specs.find(s => s.atoms.includes(7));
      expect(hSpec).toBeDefined();
      expect(hSpec!.color).toBe('--c-el-H');
    });

    it('formula layer with empty hAtomPoolIds: no H spec appended', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      // No H pool IDs — should not produce an H-colored spec
      const hSpec = specs.find(s => s.color === '--c-el-H');
      expect(hSpec).toBeUndefined();
    });

    it('formula layer with multiple hAtomPoolIds: all H IDs appear in one H spec', () => {
      const struct = makeMockStruct();
      const hAtomPoolIds = [10, 11, 12];
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, hAtomPoolIds, allLayers, struct, resolveVarFn);
      const hSpec = specs.find(s => s.color === '--c-el-H');
      expect(hSpec).toBeDefined();
      expect(hSpec!.atoms).toContain(10);
      expect(hSpec!.atoms).toContain(11);
      expect(hSpec!.atoms).toContain(12);
    });
  });
});

describe('INCHI-07: p-layer highlight', () => {
  it('Test A: buildHighlightSpecs pLayer with N heteroatom returns non-empty specs highlighting the N atom', () => {
    // atomElements_with_N: canonical 3 is N, rest are C
    const atomElements_with_N: Record<number, string> = { 1: 'C', 2: 'C', 3: 'N' };
    const smallAuxMap: AuxMap = { 1: 0, 2: 1, 3: 2 };
    const struct = makeMockStruct();
    const localAllLayers: Layer[] = [versionLayer, makeLayer({ type: 'formula', text: 'C2N', atoms: [1, 2, 3] }), pLayer];
    const specs = buildHighlightSpecs(pLayer, null, smallAuxMap, atomElements_with_N, [], localAllLayers, struct, resolveVarFn);
    expect(specs.length).toBeGreaterThan(0);
    // canonical 3 (N) → Ketcher index 2
    expect(specs[0].atoms).toContain(2);
    expect(specs[0].color).toBe('--c-proton');
  });

  it('Test B: buildHighlightSpecs pLayer with all-carbon atomElements returns [] (no heteroatoms)', () => {
    const atomElements_all_C: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C' };
    const smallAuxMap: AuxMap = { 1: 0, 2: 1, 3: 2 };
    const struct = makeMockStruct();
    const localAllLayers: Layer[] = [versionLayer, makeLayer({ type: 'formula', text: 'C3', atoms: [1, 2, 3] }), pLayer];
    const specs = buildHighlightSpecs(pLayer, null, smallAuxMap, atomElements_all_C, [], localAllLayers, struct, resolveVarFn);
    expect(specs).toEqual([]);
  });

  it('p layer with mobile-H sites: highlights only mobile-H bearing atoms, not all heteroatoms', () => {
    // CuSO4: /h;(H2,1,2,3,4) — no mobile H on Cu (fragment 1), mobile H on oxygens (local 1-4 of fragment 2)
    // Cu (canonical 1, pool 0) must NOT be highlighted; S (canonical 6, pool 5) must NOT be highlighted
    const cuSo4FormulaLayer = makeLayer({ type: 'formula', text: 'Cu.H2O4S', atoms: [1, 2, 3, 4, 5, 6] });
    const cuSo4HLayer = makeLayer({ type: 'h', prefix: 'h', text: ';(H2,1,2,3,4)', atoms: [] });
    const cuSo4PLayer = makeLayer({ type: 'p', prefix: 'p', text: '-2', atoms: [] });
    const cuSo4AuxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const cuSo4Elements: Record<number, string> = { 1: 'Cu', 2: 'O', 3: 'O', 4: 'O', 5: 'O', 6: 'S' };
    const localLayers: Layer[] = [cuSo4FormulaLayer, cuSo4HLayer, cuSo4PLayer];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(cuSo4PLayer, null, cuSo4AuxMap, cuSo4Elements, [], localLayers, struct, resolveVarFn);
    expect(specs).toHaveLength(1);
    expect(specs[0].color).toBe('--c-proton');
    expect(specs[0].atoms).not.toContain(0); // Cu must not be highlighted
    expect(specs[0].atoms).not.toContain(5); // S must not be highlighted
    expect(specs[0].atoms).toContain(1);     // O (canonical 2 → pool 1)
    expect(specs[0].atoms).toContain(2);     // O (canonical 3 → pool 2)
    expect(specs[0].atoms).toContain(3);     // O (canonical 4 → pool 3)
    expect(specs[0].atoms).toContain(4);     // O (canonical 5 → pool 4)
  });
});

describe('CR-01: h-layer multi-fragment offset correction', () => {
  // Two-fragment molecule: fragment 1 = methane (CH4, 1 atom), fragment 2 = benzene (C6H6, 6 atoms)
  // h-layer text: "1H4;1-6H" (fragment separator ';')
  // auxMap: fragment-1 canonical 1 → Ketcher 0; fragment-2 canonicals 1–6 → Ketcher 1–6 (global 7–12 offset by 1)
  const twoFragFormulaLayer: Layer = makeLayer({
    type: 'formula',
    text: 'CH4.C6H6', // fragment 1: 1 atom, fragment 2: 6 atoms
    atoms: [1, 2, 3, 4, 5, 6, 7],
  });
  // auxMap: global canonical index → Ketcher pool ID
  const twoFragAuxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 };
  const twoFragElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C', 7: 'C' };

  it('h-layer: fragment-2 atoms are highlighted with correct global offset', () => {
    // Fragment 1 has 1 atom (canonical 1), fragment 2 has 6 atoms (canonicals 2–7 globally).
    // h-layer "1H4;1-6H": fragment-1 atom 1 → global 1; fragment-2 atoms 1–6 → global 2–7
    const hLayerTwoFrag: Layer = makeLayer({
      type: 'h',
      prefix: 'h',
      text: '1H4;1-6H',
      atoms: [1, 2, 3, 4, 5, 6, 7],
    });
    const layers: Layer[] = [versionLayer, twoFragFormulaLayer, hLayerTwoFrag];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(hLayerTwoFrag, null, twoFragAuxMap, twoFragElements, [], layers, struct, resolveVarFn);
    // Fragment-1 atom 1 → Ketcher 0, should be in --c-hydro-4 spec
    const hydro4Spec = specs.find(s => s.color === '--c-hydro-4');
    expect(hydro4Spec).toBeDefined();
    expect(hydro4Spec!.atoms).toContain(0); // canonical 1 → Ketcher 0

    // Fragment-2 atoms 1–6 offset by 1 → global canonicals 2–7 → Ketcher 1–6
    const hydro1Spec = specs.find(s => s.color === '--c-hydro-1');
    expect(hydro1Spec).toBeDefined();
    // All 6 fragment-2 atoms should appear
    expect(hydro1Spec!.atoms).toContain(1); // global canonical 2 → Ketcher 1
    expect(hydro1Spec!.atoms).toContain(6); // global canonical 7 → Ketcher 6
  });

  it('h-layer single-fragment: behaves identically to pre-fix code (no regression)', () => {
    // Single-fragment benzene h-layer — no ';' in text
    const hLayerSingleFrag: Layer = makeLayer({
      type: 'h',
      prefix: 'h',
      text: '1-6H',
      atoms: [1, 2, 3, 4, 5, 6],
    });
    const layers: Layer[] = [versionLayer, formulaLayer, hLayerSingleFrag];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(hLayerSingleFrag, null, auxMap, atomElements, [], layers, struct, resolveVarFn);
    expect(specs.length).toBeGreaterThan(0);
    const hydro1Spec = specs.find(s => s.color === '--c-hydro-1');
    expect(hydro1Spec).toBeDefined();
    expect(hydro1Spec!.atoms).toContain(0); // canonical 1 → Ketcher 0
    expect(hydro1Spec!.atoms).toContain(5); // canonical 6 → Ketcher 5
  });
});

describe('CR-02: t-layer multi-fragment offset correction', () => {
  // Two-fragment molecule: fragment 1 = 2 atoms, fragment 2 = 2 atoms
  // t-layer text: "1+;1-" — fragment 1 atom 1 is '+', fragment 2 atom 1 is '-'
  // Without offset correction both fragments return canonical index 1, second overwrites first.
  const twoFragFormulaT: Layer = makeLayer({
    type: 'formula',
    text: 'C2.C2',  // 2 atoms in each fragment
    atoms: [1, 2, 3, 4],
  });
  const twoFragAuxMapT: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3 };
  const twoFragElementsT: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C', 4: 'C' };

  it('t-layer: fragment-2 stereocentre uses global canonical index (no collision)', () => {
    const tLayerTwoFrag: Layer = makeLayer({
      type: 't',
      prefix: 't',
      text: '1+;1-', // fragment 1 atom 1 = '+', fragment 2 atom 1 = '-'
      atoms: [1, 3],
    });
    const layers: Layer[] = [versionLayer, twoFragFormulaT, tLayerTwoFrag];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(tLayerTwoFrag, null, twoFragAuxMapT, twoFragElementsT, [], layers, struct, resolveVarFn);

    // Fragment-1 atom 1 → global 1 → Ketcher 0 → plus
    const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
    expect(plusSpec).toBeDefined();
    expect(plusSpec!.atoms).toContain(0);

    // Fragment-2 atom 1 + offset 2 → global 3 → Ketcher 2 → minus
    const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
    expect(minusSpec).toBeDefined();
    expect(minusSpec!.atoms).toContain(2);
  });

  it('t-layer single-fragment: behaves identically to pre-fix code (no regression)', () => {
    const tLayerSingle: Layer = makeLayer({
      type: 't',
      prefix: 't',
      text: '1+,2-',
      atoms: [1, 2],
    });
    const layers: Layer[] = [versionLayer, formulaLayer, tLayerSingle];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(tLayerSingle, null, auxMap, atomElements, [], layers, struct, resolveVarFn);
    const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
    expect(plusSpec).toBeDefined();
    expect(plusSpec!.atoms).toContain(0); // canonical 1 → Ketcher 0
    const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
    expect(minusSpec).toBeDefined();
    expect(minusSpec!.atoms).toContain(1); // canonical 2 → Ketcher 1
  });

  it('m-layer with two-fragment t-layer: uses global canonical indices for both fragments', () => {
    const tLayerTwoFrag: Layer = makeLayer({
      type: 't',
      prefix: 't',
      text: '1+;1-',
      atoms: [1, 3],
    });
    const mLayerLocal: Layer = makeLayer({ type: 'm', prefix: 'm', text: '1', atoms: [] });
    const layers: Layer[] = [versionLayer, twoFragFormulaT, tLayerTwoFrag, mLayerLocal];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(mLayerLocal, null, twoFragAuxMapT, twoFragElementsT, [], layers, struct, resolveVarFn);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs[0].color).toBe('--c-stereo');
    // Both fragments' stereocentres should be highlighted
    expect(specs[0].atoms).toContain(0); // fragment-1 atom 1 → Ketcher 0
    expect(specs[0].atoms).toContain(2); // fragment-2 atom 1 + offset 2 → Ketcher 2
  });
});

describe('buildSubHoverSpecs', () => {
  describe('INCHI-04: sub-token highlights', () => {
    it('kind element: only atoms where atomElements[canonical] === subHover.el are highlighted', () => {
      const struct = makeMockStruct();
      const mixedElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'N', 4: 'C', 5: 'C', 6: 'C' };
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'N' },
        auxMap,
        mixedElements,
        [],
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      // Only canonical 3 (ketcher 2) should appear — it's the N atom
      expect(specs[0].atoms).toEqual([2]);
    });

    it('kind element: color comes from elementColor (--c-el-C for C)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'C' },
        auxMap,
        atomElements,
        [],
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-el-C');
    });

    it('kind atom: single atom + all incident bonds from struct.bonds.forEach', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'atom', canonical: 1 },
        auxMap,
        atomElements,
        [],
        cLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      // canonical 1 → ketcher 0
      expect(specs[0].atoms).toContain(0);
      // bonds incident to atom 0 (begin or end === 0): bonds 0 (0→1) and 5 (5→0)
      expect(specs[0].bonds.length).toBeGreaterThan(0);
      expect(specs[0].bonds).toContain(0); // bond id 0: begin=0, end=1
      expect(specs[0].bonds).toContain(5); // bond id 5: begin=5, end=0
    });

    it('kind atom: color is --c-conn', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'atom', canonical: 1 },
        auxMap,
        atomElements,
        [],
        cLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-conn');
    });

    it('kind stereo: single atom, color from parityColor(subHover.sign)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'stereo', atom: 1, sign: '+' },
        auxMap,
        atomElements,
        [],
        tLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(0); // canonical 1 → ketcher 0
      expect(specs[0].color).toBe('--c-stereo-plus');
    });

    it('kind stereo: minus sign uses --c-stereo-minus', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'stereo', atom: 2, sign: '-' },
        auxMap,
        atomElements,
        [],
        tLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo-minus');
    });

    it('kind hAtoms: atoms from subHover.atoms[], color from hydroColor(subHover.count)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1, 2], count: 1 },
        auxMap,
        atomElements,
        [],
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(0); // canonical 1 → ketcher 0
      expect(specs[0].atoms).toContain(1); // canonical 2 → ketcher 1
      expect(specs[0].color).toBe('--c-hydro-1');
    });

    it('kind hAtoms: count 3 → --c-hydro-3', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1], count: 3 },
        auxMap,
        atomElements,
        [],
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-hydro-3');
    });

    it('kind mobileH: atoms from subHover.atoms[], color --c-hydro-mobile', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'mobileH', atoms: [3, 4] },
        auxMap,
        atomElements,
        [],
        hLayerMobile,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(2); // canonical 3 → ketcher 2
      expect(specs[0].atoms).toContain(3); // canonical 4 → ketcher 3
      expect(specs[0].color).toBe('--c-hydro-mobile');
    });
  });

  describe('INCHI-05: element sub-hover H-branch', () => {
    it('kind element H with hAtomPoolIds: returns spec with H pool IDs and --c-el-H color', () => {
      const struct = makeMockStruct();
      const hAtomPoolIds = [7, 8];
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H' },
        auxMap,
        atomElements,
        hAtomPoolIds,
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(7);
      expect(specs[0].atoms).toContain(8);
      expect(specs[0].color).toBe('--c-el-H');
    });

    it('kind element H with empty hAtomPoolIds: silent no-op, returns []  (D-04)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H' },
        auxMap,
        atomElements,
        [],
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Phase 8: explicit-H bond path in case 'hAtoms' (RED tests)
  // -------------------------------------------------------------------------
  describe('case hAtoms — Phase 8 explicit-H bond path', () => {
    it('regression: implicit H (pool ID NOT in hAtomPoolIds) → spec.atoms has heavy atom, spec.bonds is empty', () => {
      // canonical 1 → pool 0; pool 0 is NOT in hAtomPoolIds (empty) → implicit H
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1], count: 1 },
        { 1: 0 }, // canonical 1 → pool 0
        atomElements,
        [], // no explicit H atoms
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(0); // heavy atom pool 0
      expect(specs[0].bonds).toHaveLength(0); // no explicit H → no bonds
    });

    it('explicit H (pool ID IN hAtomPoolIds) → spec.atoms includes explicit H pool ID and bonded heavy atom pool ID; spec.bonds includes bond ID', () => {
      // canonical 7 → pool 6; pool 6 IS in hAtomPoolIds → explicit H
      // bond 6 connects pool 6 (explicit H) to pool 0 (heavy atom)
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [7], count: 1 },
        { 7: 6 }, // canonical 7 → pool 6 (explicit H)
        atomElements,
        [6], // pool 6 is an explicit H atom
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(6); // explicit H pool ID
      expect(specs[0].atoms).toContain(0); // bonded heavy atom pool ID
      expect(specs[0].bonds).toContain(6); // bond ID between H (pool 6) and heavy atom (pool 0)
    });

    it('mixed atoms (some explicit H, some implicit) → spec.atoms includes all; spec.bonds includes only explicit-H bond IDs', () => {
      // canonical 1 → pool 0 (implicit H), canonical 7 → pool 6 (explicit H)
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1, 7], count: 1 },
        { 1: 0, 7: 6 }, // 1→pool 0 (implicit), 7→pool 6 (explicit)
        atomElements,
        [6], // only pool 6 is explicit H
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(0); // implicit heavy atom
      expect(specs[0].atoms).toContain(6); // explicit H atom
      // bonds must include the explicit H bond (6) but NOT 0 or 1 (those are ring bonds)
      expect(specs[0].bonds).toContain(6);
      expect(specs[0].bonds).not.toContain(0);
      expect(specs[0].bonds).not.toContain(1);
    });
  });
});
