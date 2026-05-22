// src/lib/highlightUtils.ts
// Pure highlight spec builder — no browser globals required.
// resolveVarFn is injected so this module is testable in Node (vitest environment: 'node').
// Production caller passes: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

import type { Layer, SubHover, AuxMap } from './parseInchi';
import {
  parseHydrogenAtoms,
  parseMobileHydrogens,
  parseStereoAtoms,
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
  layers: Layer[],
  struct: StructLike,
  resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  // When subHover is active, delegate entirely to buildSubHoverSpecs (D-05)
  if (subHover !== null) {
    return buildSubHoverSpecs(subHover, auxMap, atomElements, layer, struct, resolveVarFn);
  }

  // NON-SPATIAL layers — no canvas highlight (D-01)
  if (['version', 'q', 'p', 'i', 'b'].includes(layer.type)) {
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
      // Fixed hydrogen atoms grouped by count color
      const hydroAtoms = parseHydrogenAtoms(layer.text);
      const colorToAtoms = new Map<string, number[]>();
      for (const [canonStr, count] of Object.entries(hydroAtoms)) {
        const canon = Number(canonStr);
        const colorVar = hydroColor(count);
        if (!colorVar) continue; // count < 1 — skip
        const kId = auxMap[canon];
        if (kId === undefined) continue;
        const color = resolveVarFn(stripVar(colorVar));
        if (!colorToAtoms.has(color)) colorToAtoms.set(color, []);
        colorToAtoms.get(color)!.push(kId);
      }

      // Mobile hydrogen atoms
      const mobileCanons = parseMobileHydrogens(layer.text);
      const mobileKAtoms = mobileCanons
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);

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
      // Group atoms by parity sign
      const parities = parseStereoParities(layer.text);
      const plusAtoms: number[] = [];
      const minusAtoms: number[] = [];
      for (const [canonStr, sign] of Object.entries(parities)) {
        const canon = Number(canonStr);
        const kId = auxMap[canon];
        if (kId === undefined) continue;
        if (sign === '+') plusAtoms.push(kId);
        else minusAtoms.push(kId);
      }
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

    case 'm':
    case 's': {
      // Delegate to co-present t-layer atoms
      const tLayer = layers.find(l => l.type === 't');
      if (!tLayer) return [];
      const stereoCanons = parseStereoAtoms(tLayer.text);
      const kAtoms = stereoCanons
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);
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
  layer: Layer,
  struct: StructLike,
  resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  switch (subHover.kind) {
    case 'element': {
      const el = subHover.el!;
      const kAtoms = layer.atoms
        .filter(canon => atomElements[canon] === el)
        .map(canon => auxMap[canon])
        .filter((id): id is number => id !== undefined);
      if (kAtoms.length === 0) return [];
      const color = resolveVarFn(stripVar(elementColor(el)));
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'atom': {
      const kAtomId = auxMap[subHover.canonical!];
      if (kAtomId === undefined) return [];
      // Collect incident bonds
      const incidentBonds: number[] = [];
      struct.bonds.forEach((bond, bid) => {
        if (bond.begin === kAtomId || bond.end === kAtomId) {
          incidentBonds.push(bid);
        }
      });
      const color = resolveVarFn('--c-conn');
      return [{ atoms: [kAtomId], bonds: incidentBonds, rgroupAttachmentPoints: [], color }];
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
