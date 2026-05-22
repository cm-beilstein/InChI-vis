import type { AuxMap } from './parseInchi';

export interface MappingPair {
  k: number;  // Ketcher draw-order rank (1-based)
  c: number;  // canonical InChI index (1-based)
  el: string; // element symbol ('C', 'N', 'O', etc.)
}

/**
 * Derives sorted Ketcher-rank → canonical-index pairs from auxMap and atomElements.
 * auxMap values are Ketcher pool IDs (cumulative, not sequential).
 * Sorted position of pool IDs gives draw-order rank (D-07, RESEARCH.md Pattern 1).
 *
 * Algorithm (from design_handoff_explain_that_inchi/app.jsx lines 319-357):
 *   1. Sort all pool IDs (Object.values(auxMap)) ascending — their positions = ranks
 *   2. For each canonical key, find its pool ID's position in the sorted array (+1 for 1-based)
 *   3. Sort output ascending by ketcherRank
 *
 * @returns pairs sorted ascending by ketcherRank; empty array when auxMap is empty.
 */
export function deriveMappingPairs(
  auxMap: AuxMap,
  atomElements: Record<number, string>,
): MappingPair[] {
  const canonicalKeys = Object.keys(auxMap);
  if (canonicalKeys.length === 0) return [];

  const poolIds = Object.values(auxMap).sort((a, b) => a - b);

  return canonicalKeys
    .map(cStr => {
      const c = Number(cStr);
      return {
        k: poolIds.indexOf(auxMap[c]) + 1,
        c,
        el: atomElements[c] ?? '?',
      };
    })
    .sort((a, b) => a.k - b.k);
}
