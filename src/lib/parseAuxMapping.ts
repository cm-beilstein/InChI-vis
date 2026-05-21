// AuxInfo parsing — pure module, no browser globals, Node-compatible for Vitest.
// Parses the N: field from Ketcher's getInchi(true) AuxInfo block.
// Based on CONTEXT.md D-10/D-11 and RESEARCH.md Pattern 3.

import { parseInchi } from './parseInchi';
import type { Layer, AuxMap } from './parseInchi';

/**
 * Derives a canonical → element symbol map from enriched layers.
 * Uses the formula layer's atom list and resolves element symbols from the formula text.
 * Returns Record<canonicalIndex, elementSymbol>.
 */
export function buildAtomElements(layers: Layer[]): Record<number, string> {
  const formulaLayer = layers.find(l => l.type === 'formula');
  if (!formulaLayer) return {};
  const out: Record<number, string> = {};
  // Parse element runs from the formula text: e.g. "C6H6" → [C,C,C,C,C,C]
  // Assign canonical indices in formula order (Hill order: C first, H skipped, then rest alphabetically)
  // We need to expand the formula into an atom list matching canonical order.
  // The canonical numbering is the same order as the atom list in the formula layer.
  const atoms = formulaLayer.atoms; // [1, 2, 3, ... N]
  // Expand formula into element array
  const elements: string[] = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formulaLayer.text))) {
    if (!m[1] || m[1] === 'H') continue; // Skip H — canonical indices cover heavy atoms only
    const count = m[2] ? parseInt(m[2], 10) : 1;
    for (let i = 0; i < count; i++) elements.push(m[1]);
  }
  // Assign: canonical atom[i] (1-based) → elements[i]
  atoms.forEach((canon, i) => {
    if (elements[i]) out[canon] = elements[i];
  });
  return out;
}

/**
 * Builds a canonical → Ketcher-index map from an AuxInfo body string.
 *
 * Input: the portion AFTER "AuxInfo=" — e.g. "1/0/N:1,2,6,3,5,4/E:..."
 *
 * The N: field lists 1-based Ketcher draw-order atom indices in canonical order.
 * Position i (0-based) in the list = canonical atom (i+1).
 * Result: auxMap[canonicalIdx] = ketcherDrawOrderValue - 1  (0-based index)
 *
 * Per D-10: keys are canonical 1-based, values are Ketcher 0-based.
 * Per T-02-01: keys are always integers; NaN guard prevents invalid assignment.
 *
 * OPEN QUESTION (Assumption A2): if Ketcher 3.12.0 on Windows uses \r\n, the
 * caller (parseInchiWithAux) must account for that. Verify by drawing benzene
 * in the running app and logging: window.ketcher.getInchi(true).then(r => console.log(JSON.stringify(r)))
 */
export function parseAuxMapping(auxBody: string): AuxMap {
  const parts = auxBody.split('/');
  const nPart = parts.find(p => p.startsWith('N:'));
  if (!nPart) return {};
  const values = nPart.slice(2).split(',');
  const map: AuxMap = {};
  values.forEach((v, i) => {
    const n = parseInt(v, 10);
    if (!isNaN(n)) map[i + 1] = n - 1; // canonical (1-based) → Ketcher index (0-based)
  });
  return map;
}

/**
 * Splits the raw string returned by ketcher.getInchi(true) into its InChI
 * string, enriched layers array, and AuxMap.
 *
 * getInchi(true) format (per D-11 / RESEARCH.md Pattern 3):
 *   "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=1/0/N:1,2,6,3,5,4/..."
 *
 * If no AuxInfo section is present (shouldn't happen with getInchi(true) on a
 * non-empty canvas), returns the plain InChI with an empty auxMap.
 */
export function parseInchiWithAux(raw: string): {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  atomElements: Record<number, string>;
} {
  const sep = '\nAuxInfo=';
  const idx = raw.indexOf(sep);
  if (idx === -1) {
    // No AuxInfo section — plain InChI (shouldn't happen with getInchi(true) on non-empty canvas)
    const layers = parseInchi(raw);
    return { inchi: raw, layers, auxMap: {}, atomElements: buildAtomElements(layers) };
  }
  const inchiStr = raw.slice(0, idx);
  const auxBody = raw.slice(idx + sep.length);
  const layers = parseInchi(inchiStr);
  return {
    inchi: inchiStr,
    layers,
    auxMap: parseAuxMapping(auxBody),
    atomElements: buildAtomElements(layers),
  };
}
