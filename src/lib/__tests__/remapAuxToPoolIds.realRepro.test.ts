// Regression test for the EXACT user-reported 3-component molecule that exposed the
// canonical->poolId remap bug (quick-260610-eci). Data captured live from getInchi(true)
// plus a window.ketcher atom dump. Before the coordinate-matching fix, 25/31 atoms mapped
// to the wrong pool ID (e.g. hovering benzene highlighted a different fragment).
import { describe, it, expect } from 'vitest';
import { parseInchiWithAux, remapAuxToPoolIds } from '../parseAuxMapping';

const RAW =
  'InChI=1S/C12H19N.C11H17N.C6H6/c1-9(11(3)13)10(2)12-7-5-4-6-8-12;1-9(10(2)12)8-11-6-4-3-5-7-11;1-2-4-6-5-3-1/h4-11H,13H2,1-3H3;3-7,9-10H,8,12H2,1-2H3;1-6H/t9?,10?,11-;9?,10-;/m11./s1\n' +
  'AuxInfo=1/0/N:13,8,11,6,4,5,2,1,9,7,10,3,12;29,31,25,23,24,21,20,26,27,28,22,30;14,16,18,15,19,17/E:(5,6)(7,8);(4,5)(6,7);(1,2,3,4,5,6)/it:2im;/rA:31CCCCCCCCCC.oCNCCCCCCCCCCCCCCCC.eCNC/rC:3.4973,-5.2743,0;5.2277,-5.2738,0;4.3641,-4.7742,0;5.2277,-6.2748,0;3.4973,-6.2792,0;4.3663,-6.7743,0;4.3647,-3.7742,0;5.2311,-3.2747,0;3.499,-3.2737,0;3.4996,-2.2737,0;2.6339,-1.7731,0;4.366,-1.7742,0;2.6327,-3.7731,0;6.9473,-5.4243,0;8.6777,-5.4238,0;7.8141,-4.9242,0;8.6777,-6.4248,0;6.9473,-6.4292,0;7.8163,-6.9243,0;10.4473,-5.3493,0;12.1777,-5.3488,0;11.3141,-4.8492,0;12.1777,-6.3498,0;10.4473,-6.3542,0;11.3163,-6.8493,0;11.3147,-3.8492,0;12.1811,-3.3497,0;12.1817,-2.3497,0;13.0468,-3.8502,0;13.048,-1.8502,0;11.316,-1.8492,0';

// Live atoms from window.ketcher dump (poolId:label@x,y) — screen-space y (positive).
const LIVE = '6:C@3.50,5.27 7:C@5.23,5.27 8:C@4.36,4.77 9:C@5.23,6.27 10:C@3.50,6.28 11:C@4.37,6.77 24:C@6.95,5.42 25:C@8.68,5.42 26:C@7.81,4.92 27:C@8.68,6.42 28:C@6.95,6.43 29:C@7.82,6.92 42:C@10.45,5.35 43:C@12.18,5.35 44:C@11.31,4.85 45:C@12.18,6.35 46:C@10.45,6.35 47:C@11.32,6.85 54:C@11.31,3.85 55:C@4.36,3.77 56:C@5.23,3.27 57:C@3.50,3.27 58:C@3.50,2.27 59:C@12.18,3.35 60:C@12.18,2.35 61:C@13.05,3.85 62:N@13.05,1.85 63:C@11.32,1.85 64:C@2.63,1.77 65:N@4.37,1.77 66:C@2.63,3.77'
  .split(' ').map((s) => {
    const [id, rest] = s.split(':');
    const [, xy] = rest.split('@');
    const [x, y] = xy.split(',');
    return { poolId: Number(id), x: Number(x), y: Number(y) };
  });

const FALLBACK_POOL_IDS = LIVE.map((l) => l.poolId); // iteration order = old buggy basis

const COMP_A = new Set([6, 7, 8, 9, 10, 11, 55, 56, 57, 58, 64, 65, 66]); // C12H19N (canon 1-13)
const COMP_C = new Set([42, 43, 44, 45, 46, 47, 54, 59, 60, 61, 62, 63]); // C11H17N (canon 14-25)
const COMP_B = new Set([24, 25, 26, 27, 28, 29]);                          // C6H6 benzene (canon 26-31)

describe('remapAuxToPoolIds — exact 3-component repro (quick-260610-eci)', () => {
  const { auxMap, molfileCoords } = parseInchiWithAux(RAW);
  const map = remapAuxToPoolIds(auxMap, molfileCoords, LIVE, FALLBACK_POOL_IDS);

  it('parses 31 molfile coords from /rC:', () => {
    expect(molfileCoords).toHaveLength(31);
  });

  it('benzene (canon 26-31) maps into component B {24..29}', () => {
    for (let c = 26; c <= 31; c++) expect(COMP_B.has(map[c])).toBe(true);
  });

  it('C12H19N (canon 1-13) maps into component A', () => {
    for (let c = 1; c <= 13; c++) expect(COMP_A.has(map[c])).toBe(true);
  });

  it('C11H17N (canon 14-25) maps into component C', () => {
    for (let c = 14; c <= 25; c++) expect(COMP_C.has(map[c])).toBe(true);
  });

  it('is a bijection over all 31 pool IDs', () => {
    const vals = Object.values(map);
    expect(vals).toHaveLength(31);
    expect(new Set(vals).size).toBe(31);
  });

  it('differs from the old buggy poolIds[rank] basis (proves the fix changed behavior)', () => {
    const buggy: Record<number, number> = {};
    for (const [c, rank] of Object.entries(auxMap)) buggy[Number(c)] = FALLBACK_POOL_IDS[rank as number];
    const wrong = Object.keys(map).filter((c) => map[Number(c)] !== buggy[Number(c)]).length;
    expect(wrong).toBeGreaterThanOrEqual(20); // ~25/31 were wrong under the old logic
  });
});
