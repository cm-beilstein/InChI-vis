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

export function resolveVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function buildHighlightSpecs(
  _layer: Layer,
  _subHover: SubHover | null,
  _auxMap: AuxMap,
  _atomElements: Record<number, string>,
  _layers: Layer[],
  _struct: StructLike,
  _resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  // STUB — implementation in Plan 02
  return [];
}

export function buildSubHoverSpecs(
  _subHover: SubHover,
  _auxMap: AuxMap,
  _atomElements: Record<number, string>,
  _layer: Layer,
  _struct: StructLike,
  _resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  // STUB — implementation in Plan 02
  return [];
}

// Re-export utilities used by the production hook to avoid it needing to import from layerInfo directly
export { elementColor, hydroColor, parityColor, parseStereoParities, parseHydrogenAtoms, parseMobileHydrogens, parseStereoAtoms };
