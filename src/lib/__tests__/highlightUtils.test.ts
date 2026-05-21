// Wave 0 RED state: all tests FAIL against stubs that return []
// Implementation fills in Plan 02.
import { describe, it, expect, vi } from 'vitest';
import { buildHighlightSpecs, buildSubHoverSpecs } from '../highlightUtils';
import type { HighlightSpec, StructLike } from '../highlightUtils';
import type { Layer, AuxMap } from '../parseInchi';

// Identity mock — CSS var names passed through as-is for readable assertions
const resolveVarFn = (name: string): string => name;

// Benzene fixture (6 C atoms, cyclic bonds)
const auxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const atomElements: Record<number, string> = {
  1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C',
};

// Mock struct for c-layer tests
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
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      // Should NOT be empty — C atoms should be grouped by --c-el-C color
      expect(specs.length).toBeGreaterThan(0);
      // All 6 atoms should appear in specs
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds).toContain(0); // canonical 1 → ketcher 0
      expect(allAtomIds).toContain(5); // canonical 6 → ketcher 5
    });

    it('formula layer: atom color is elementColor resolved (--c-el-C)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
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
      const specs = buildHighlightSpecs(mixedLayer, null, { 1: 0, 2: 1, 3: 2 }, mixedElements, allLayers, struct, resolveVarFn);
      const nSpec = specs.find(s => s.atoms.includes(2));
      expect(nSpec).toBeDefined();
      expect(nSpec!.color).toBe('--c-el-N');
    });

    it('formula layer: bonds array is empty (no bond highlights)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      const hasBonds = specs.some(s => s.bonds.length > 0);
      expect(hasBonds).toBe(false);
    });

    it('c-layer: atoms from bond endpoint set are returned', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds.length).toBeGreaterThan(0);
    });

    it('c-layer: bonds array is non-empty (findBondId was called)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      const hasBonds = specs.some(s => s.bonds.length > 0);
      expect(hasBonds).toBe(true);
    });

    it('c-layer: color is --c-conn', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-conn');
    });

    it('h-layer: atoms grouped by H-count color (count 1 → --c-hydro-1)', () => {
      // hLayer has text '1-6H' → all atoms get count 1
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(hLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      const spec = specs[0];
      expect(spec.color).toBe('--c-hydro-1');
    });

    it('h-layer: count 3 → --c-hydro-3', () => {
      // hLayerMulti has '1H3,2H' → atom 1 gets count 3, atom 2 gets count 1
      const struct = makeMockStruct();
      const smallAuxMap: AuxMap = { 1: 0, 2: 1 };
      const smallElements: Record<number, string> = { 1: 'C', 2: 'C' };
      const specs = buildHighlightSpecs(hLayerMulti, null, smallAuxMap, smallElements, allLayers, struct, resolveVarFn);
      const hydro3Spec = specs.find(s => s.color === '--c-hydro-3');
      expect(hydro3Spec).toBeDefined();
      expect(hydro3Spec!.atoms).toContain(0); // canonical 1 → ketcher 0
    });

    it('h-layer: mobile H atoms get --c-hydro-mobile color', () => {
      const struct = makeMockStruct();
      const smallAuxMap: AuxMap = { 3: 2, 4: 3 };
      const smallElements: Record<number, string> = { 3: 'C', 4: 'C' };
      const specs = buildHighlightSpecs(hLayerMobile, null, smallAuxMap, smallElements, allLayers, struct, resolveVarFn);
      const mobileSpec = specs.find(s => s.color === '--c-hydro-mobile');
      expect(mobileSpec).toBeDefined();
      expect(mobileSpec!.atoms).toContain(2); // canonical 3 → ketcher 2
      expect(mobileSpec!.atoms).toContain(3); // canonical 4 → ketcher 3
    });

    it('t-layer: plus-parity atoms get --c-stereo-plus', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(tLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
      expect(plusSpec).toBeDefined();
      expect(plusSpec!.atoms).toContain(0); // canonical 1 → ketcher 0
    });

    it('t-layer: minus-parity atoms get --c-stereo-minus', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(tLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
      expect(minusSpec).toBeDefined();
      expect(minusSpec!.atoms).toContain(1); // canonical 2 → ketcher 1
    });

    it('b-layer: returns empty array [] (no canvas highlight per canvas.jsx behavior)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(bLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('m-layer: reads atoms from co-present t-layer, uses --c-stereo color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(mLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo');
      // Should include stereo atoms from t-layer (canonical 1,2 → ketcher 0,1)
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds).toContain(0);
      expect(allAtomIds).toContain(1);
    });

    it('s-layer: reads atoms from co-present t-layer, uses --c-stereo color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(sLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo');
    });

    it('m-layer with no t-layer: returns empty array', () => {
      const struct = makeMockStruct();
      const noTLayers: Layer[] = [versionLayer, formulaLayer, mLayer];
      const specs = buildHighlightSpecs(mLayer, null, auxMap, atomElements, noTLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('version layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(versionLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('q layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(qLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('p layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(pLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('i layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(iLayer, null, auxMap, atomElements, allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });
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
});
