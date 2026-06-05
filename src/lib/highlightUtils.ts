// src/lib/highlightUtils.ts
// Pure highlight spec builder — no browser globals required.
// resolveVarFn is injected so this module is testable in Node (vitest environment: 'node').
// Production caller passes: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

import type { Layer, SubHover, AuxMap } from './parseInchi';
import {
  parseHydrogenAtoms,
  parseMobileHydrogens,
  parseStereoAtoms,
  formulaFragmentCounts,
  expandLayerText,
} from './parseInchi';

import {
  elementColor,
  hydroColor,
  parityColor,
  parseStereoParities,
} from './layerInfo';

export type HighlightSpec = {
  atoms: number[];
  bonds: number[];
  rgroupAttachmentPoints: number[];
  color: string;
};

// Minimal struct interface — only the methods/properties Phase 4 needs
export interface StructLike {
  findBondId(begin: number, end: number): number | null;
  bonds: { forEach(cb: (bond: { begin: number; end: number }, id: number) => void): void };
}

/** Production implementation: reads CSS custom property and converts to rgb for Ketcher SVG renderer.
 * getComputedStyle returns oklch() strings which Raphaël cannot parse — use canvas to normalise. */
export function resolveVar(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return '#888';
  // Convert to rgb via a 1x1 canvas — handles oklch, hsl, named colors, etc.
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${g},${b})`;
  } catch {
    return raw;
  }
}

/**
 * Strips a CSS var() wrapper to get the custom property name.
 * elementColor('C') => 'var(--c-el-C)' => '--c-el-C'
 */
function stripVar(cssVar: string): string {
  return cssVar.replace('var(', '').replace(')', '');
}

export function buildHighlightSpecs(
  layer: Layer,
  subHover: SubHover | null,
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  hAtomPoolIds: number[] = [],
  layers: Layer[],
  struct: StructLike,
  resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  // When subHover is active, delegate entirely to buildSubHoverSpecs (D-05)
  if (subHover !== null) {
    return buildSubHoverSpecs(subHover, auxMap, atomElements, hAtomPoolIds, layer, struct, resolveVarFn);
  }

  // NON-SPATIAL layers — no canvas highlight (D-01)
  if (['version', 'q', 'i', 'b'].includes(layer.type)) {
    return [];
  }

  switch (layer.type) {
    case 'formula': {
      // Group atoms by resolved element color
      const colorToAtoms = new Map<string, number[]>();
      for (const canon of layer.atoms) {
        const el = atomElements[canon];
        if (!el) continue;
        const kId = auxMap[canon];
        if (kId === undefined) continue;
        const color = resolveVarFn(stripVar(elementColor(el)));
        if (!colorToAtoms.has(color)) colorToAtoms.set(color, []);
        colorToAtoms.get(color)!.push(kId);
      }
      // Append explicit H atom pool IDs with H element color (D-05)
      if (hAtomPoolIds.length > 0) {
        const hColor = resolveVarFn(stripVar(elementColor('H')));
        const existing = colorToAtoms.get(hColor) ?? [];
        colorToAtoms.set(hColor, [...existing, ...hAtomPoolIds]);
      }
      const specs: HighlightSpec[] = [];
      for (const [color, atoms] of colorToAtoms) {
        specs.push({ atoms, bonds: [], rgroupAttachmentPoints: [], color });
      }
      return specs.filter(s => s.atoms.length > 0 || s.bonds.length > 0);
    }

    case 'c': {
      // Map canonical atoms through auxMap
      const kAtoms = layer.atoms
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);

      // Resolve bonds via findBondId for each canonical bond pair
      const kBonds: number[] = [];
      for (const [a, b] of layer.bonds) {
        const kA = auxMap[a];
        const kB = auxMap[b];
        if (kA === undefined || kB === undefined) continue;
        const bid = struct.findBondId(kA, kB);
        if (bid !== null) kBonds.push(bid);
      }

      const color = resolveVarFn('--c-conn');
      const specs: HighlightSpec[] = [
        { atoms: kAtoms, bonds: kBonds, rgroupAttachmentPoints: [], color },
      ];
      return specs.filter(s => s.atoms.length > 0 || s.bonds.length > 0);
    }

    case 'h': {
      const formulaLayerH = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsH = formulaLayerH ? formulaFragmentCounts(formulaLayerH.text) : [];

      // expandLayerText handles both "2*1-6H" (multiplier) and "2-6H;1-6H" (semicolon)
      const fragmentTextsH = expandLayerText(layer.text);
      const colorToAtoms = new Map<string, number[]>();
      let cumulativeOffsetH = 0;
      fragmentTextsH.forEach((fragText, fi) => {
        const hydroAtoms = parseHydrogenAtoms(fragText);
        for (const [canonStr, count] of Object.entries(hydroAtoms)) {
          const canon = Number(canonStr) + cumulativeOffsetH;
          const colorVar = hydroColor(count);
          if (!colorVar) continue; // count < 1 — skip
          const kId = auxMap[canon];
          if (kId === undefined) continue;
          const color = resolveVarFn(stripVar(colorVar));
          if (!colorToAtoms.has(color)) colorToAtoms.set(color, []);
          colorToAtoms.get(color)!.push(kId);
        }
        cumulativeOffsetH += fragmentAtomCountsH[fi] ?? 0;
      });

      // Mobile hydrogen atoms — same per-fragment offset approach
      cumulativeOffsetH = 0;
      const mobileKAtoms: number[] = [];
      fragmentTextsH.forEach((fragText, fi) => {
        parseMobileHydrogens(fragText).forEach(c => {
          const kId = auxMap[c + cumulativeOffsetH];
          if (kId !== undefined) mobileKAtoms.push(kId);
        });
        cumulativeOffsetH += fragmentAtomCountsH[fi] ?? 0;
      });

      const specs: HighlightSpec[] = [];
      for (const [color, atoms] of colorToAtoms) {
        specs.push({ atoms, bonds: [], rgroupAttachmentPoints: [], color });
      }
      if (mobileKAtoms.length > 0) {
        const mobileColor = resolveVarFn('--c-hydro-mobile');
        specs.push({ atoms: mobileKAtoms, bonds: [], rgroupAttachmentPoints: [], color: mobileColor });
      }
      return specs.filter(s => s.atoms.length > 0 || s.bonds.length > 0);
    }

    case 't': {
      const formulaLayerT = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsT = formulaLayerT ? formulaFragmentCounts(formulaLayerT.text) : [];
      const fragmentTextsT = expandLayerText(layer.text);
      const plusAtoms: number[] = [];
      const minusAtoms: number[] = [];
      let cumulativeOffsetT = 0;
      fragmentTextsT.forEach((fragText, fi) => {
        const parities = parseStereoParities(fragText);
        for (const [canonStr, sign] of Object.entries(parities)) {
          const canon = Number(canonStr) + cumulativeOffsetT;
          const kId = auxMap[canon];
          if (kId === undefined) continue;
          if (sign === '+') plusAtoms.push(kId);
          else minusAtoms.push(kId);
        }
        cumulativeOffsetT += fragmentAtomCountsT[fi] ?? 0;
      });

      const specs: HighlightSpec[] = [];
      if (plusAtoms.length > 0) {
        specs.push({
          atoms: plusAtoms,
          bonds: [],
          rgroupAttachmentPoints: [],
          color: resolveVarFn('--c-stereo-plus'),
        });
      }
      if (minusAtoms.length > 0) {
        specs.push({
          atoms: minusAtoms,
          bonds: [],
          rgroupAttachmentPoints: [],
          color: resolveVarFn('--c-stereo-minus'),
        });
      }
      return specs;
    }

    case 'p': {
      // Protonation site highlighting: collect heteroatom canonical indices (not C, not H)
      // and highlight them with --c-proton color. Pure-carbon molecules return [] silently.
      const heteroIds: number[] = [];
      for (const [canonStr, el] of Object.entries(atomElements)) {
        if (el === 'C' || el === 'H') continue;
        const canon = Number(canonStr);
        const kId = auxMap[canon];
        if (kId === undefined) continue;
        heteroIds.push(kId);
      }
      if (heteroIds.length === 0) return [];
      return [{ atoms: heteroIds, bonds: [], rgroupAttachmentPoints: [], color: resolveVarFn('--c-proton') }];
    }

    case 'm':
    case 's': {
      // Delegate to co-present t-layer atoms
      const tLayer = layers.find(l => l.type === 't');
      if (!tLayer) return [];
      const formulaLayerMS = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsMS = formulaLayerMS ? formulaFragmentCounts(formulaLayerMS.text) : [];
      const fragmentTextsMS = expandLayerText(tLayer.text);
      const kAtoms: number[] = [];
      let cumulativeOffsetMS = 0;
      fragmentTextsMS.forEach((fragText, fi) => {
        parseStereoAtoms(fragText).forEach(c => {
          const kId = auxMap[c + cumulativeOffsetMS];
          if (kId !== undefined) kAtoms.push(kId);
        });
        cumulativeOffsetMS += fragmentAtomCountsMS[fi] ?? 0;
      });

      if (kAtoms.length === 0) return [];
      const color = resolveVarFn('--c-stereo');
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    default:
      return [];
  }
}

export function buildSubHoverSpecs(
  subHover: SubHover,
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  hAtomPoolIds: number[] = [],
  layer: Layer,
  struct: StructLike,
  resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  switch (subHover.kind) {
    case 'element': {
      const el = subHover.el!;
      // Explicit H atoms: direct pool ID list, no canonical lookup (D-04, D-06)
      if (el === 'H') {
        if (hAtomPoolIds.length === 0) return []; // silent no-op per D-04
        const color = resolveVarFn(stripVar(elementColor('H')));
        return [{ atoms: hAtomPoolIds, bonds: [], rgroupAttachmentPoints: [], color }];
      }
      // Restrict to the canonical ID range of the hovered fragment or group.
      // Used for dot-separated formulas (e.g. C7H8.C6H6, C7H8.2C6H6).
      let atomsToCheck = layer.atoms;
      if (subHover.canonRange !== undefined) {
        const [lo, hi] = subHover.canonRange;
        atomsToCheck = layer.atoms.filter(c => c >= lo && c <= hi);
      }
      const kAtoms = atomsToCheck
        .filter(canon => atomElements[canon] === el)
        .map(canon => auxMap[canon])
        .filter((id): id is number => id !== undefined);
      if (kAtoms.length === 0) return [];
      const color = resolveVarFn(stripVar(elementColor(el)));
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'atom': {
      // canonicals is set for 2* identical-fragment layers (one canonical per fragment).
      // Falls back to the single canonical field for single-fragment and ;-separated layers.
      const canonIds = subHover.canonicals ?? (subHover.canonical != null ? [subHover.canonical] : []);
      const kAtomIds = canonIds.map(c => auxMap[c]).filter((id): id is number => id !== undefined);
      if (kAtomIds.length === 0) return [];
      const incidentBonds: number[] = [];
      struct.bonds.forEach((bond, bid) => {
        if (kAtomIds.includes(bond.begin) || kAtomIds.includes(bond.end)) incidentBonds.push(bid);
      });
      const color = resolveVarFn('--c-conn');
      return [{ atoms: kAtomIds, bonds: incidentBonds, rgroupAttachmentPoints: [], color }];
    }

    case 'stereo': {
      const kAtomId = auxMap[subHover.atom!];
      if (kAtomId === undefined) return [];
      const color = resolveVarFn(stripVar(parityColor(subHover.sign!)));
      return [{ atoms: [kAtomId], bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'hAtoms': {
      const kAtoms = (subHover.atoms ?? [])
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);
      if (kAtoms.length === 0) return [];
      const colorVar = hydroColor(subHover.count!) ?? 'var(--c-hydro-1)';
      const color = resolveVarFn(stripVar(colorVar));
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'mobileH': {
      const kAtoms = (subHover.atoms ?? [])
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);
      if (kAtoms.length === 0) return [];
      const color = resolveVarFn('--c-hydro-mobile');
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    default:
      return [];
  }
}

// Re-export utilities used by the production hook to avoid it needing to import from layerInfo directly
export { elementColor, hydroColor, parityColor, parseStereoParities, parseHydrogenAtoms, parseMobileHydrogens, parseStereoAtoms };
