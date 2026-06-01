import { describe, it, expect } from 'vitest';
import { parseInchi } from '../parseInchi';
import { parseAuxMapping } from '../parseAuxMapping';
import { buildHighlightSpecs } from '../highlightUtils';

const INCHI = 'InChI=1S/2C6H6/c2*1-2-4-6-5-3-1/h2*1-6H';
const AUX_BODY = '1/0/N:1,3,5,2,6,4;7,9,11,8,12,10/E:(1,2,3,4,5,6)(7,8,9,10,11,12)';

// Simulate what App.tsx does: rank → sequential pool ID (0-based)
function makeAuxMap() {
  const rankMap = parseAuxMapping(AUX_BODY, '2C6H6');
  const poolIds = [0,1,2,3,4,5,6,7,8,9,10,11]; // sequential for freshly drawn
  const actual: Record<number,number> = {};
  for (const [canonStr, rank] of Object.entries(rankMap)) {
    const poolId = poolIds[rank as number];
    if (poolId !== undefined) actual[Number(canonStr)] = poolId;
  }
  return actual;
}

// Mock struct for c-layer bond lookup
const mockStruct = {
  findBondId: (a: number, b: number) => a * 100 + b, // fake bond IDs
};

// Mock resolveVar
const resolve = (v: string) => v;

describe('buildHighlightSpecs — 2-benzene', () => {
  const layers = parseInchi(INCHI);
  const auxMap = makeAuxMap();
  const atomElements = Object.fromEntries([...Array(12)].map((_, i) => [i+1, 'C']));

  it('formula layer: highlights all 12 atoms', () => {
    const formulaLayer = layers.find(l => l.type === 'formula')!;
    const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], layers, mockStruct as any, resolve);
    console.log('formula specs:', JSON.stringify(specs));
    const allAtoms = specs.flatMap(s => s.atoms);
    expect(allAtoms.length).toBe(12);
  });

  it('c-layer: highlights 12 atoms and 12 bonds', () => {
    const cLayer = layers.find(l => l.type === 'c')!;
    const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], layers, mockStruct as any, resolve);
    console.log('c-layer specs:', JSON.stringify(specs));
    const allAtoms = specs.flatMap(s => s.atoms);
    const allBonds = specs.flatMap(s => s.bonds);
    expect(allAtoms.length).toBe(12);
    expect(allBonds.length).toBe(12);
  });

  it('h-layer: highlights all 12 atoms', () => {
    const hLayer = layers.find(l => l.type === 'h')!;
    const specs = buildHighlightSpecs(hLayer, null, auxMap, atomElements, [], layers, mockStruct as any, resolve);
    console.log('h-layer specs:', JSON.stringify(specs));
    const allAtoms = specs.flatMap(s => s.atoms);
    expect(allAtoms.length).toBe(12);
  });
});
