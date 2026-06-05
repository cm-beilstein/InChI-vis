// src/hooks/useKetcherHighlights.ts
// Bridges the Zustand store to Ketcher's highlight API.
// applyKetcherHighlights is extracted as a pure helper for direct unit testing.

import { useEffect } from 'react';
import type React from 'react';
import type { Ketcher } from 'ketcher-core';
import { useInchiStore } from '../store';
import { buildHighlightSpecs, resolveVar } from '../lib/highlightUtils';
import type { HighlightSpec, StructLike } from '../lib/highlightUtils';

/**
 * Applies highlight specs to the Ketcher editor.
 * Always calls clear() first to prevent stale highlight accumulation (D-04).
 * Calls create() only when specs is non-empty.
 */
export function applyKetcherHighlights(
  editor: { highlights: { clear(): void; create(...args: HighlightSpec[]): void } },
  specs: HighlightSpec[],
): void {
  editor.highlights.clear();
  if (specs.length > 0) {
    editor.highlights.create(...specs);
  }
}

/**
 * After highlights.create() synchronously redraws highlighted atoms, set the atom
 * label text fill to white for any atom that displays a visible element symbol.
 *
 * DOM contract (verified in ketcher-core/dist/index.modern.js):
 *  - highlights.create() calls editor.update() synchronously, recreating SVG elements
 *  - Each atom's primary SVG element gets data-atom-id="<poolId>" and data-atomLabel="<symbol>"
 *  - SVG root is at editorAny.render.paper.canvas
 *
 * Carbon atoms have no visible label in skeletal formula and are left unchanged.
 * The inline style.fill overrides Raphaël's fill attribute and is wiped automatically
 * on the next redraw (highlights.clear() → redraw → fresh elements).
 */
export function whiteAtomLabels(svgRoot: Element, specs: HighlightSpec[]): void {
  for (const spec of specs) {
    for (const atomId of spec.atoms) {
      const el = svgRoot.querySelector(`[data-atom-id="${atomId}"]`);
      if (!el) continue;
      const label = el.getAttribute('data-atomLabel') ?? '';
      if (label !== 'C') {
        (el as SVGElement).style.fill = 'white';
      }
    }
  }
}

/**
 * React hook that subscribes to Zustand hover state and drives Ketcher canvas highlights.
 * Called from App.tsx once Ketcher is ready (isReady = true).
 *
 * ketcherRef is intentionally excluded from the useEffect deps array — it is a stable
 * React ref whose .current is always the same Ketcher instance after init.
 */
export function useKetcherHighlights(
  ketcherRef: React.RefObject<Ketcher | null>,
  isReady: boolean,
  _isHighlightingRef?: React.RefObject<boolean>,
): void {
  const hoverIdx     = useInchiStore(s => s.hoverIdx);
  const subHover     = useInchiStore(s => s.subHover);
  const layers       = useInchiStore(s => s.layers);
  const auxMap       = useInchiStore(s => s.auxMap);
  const atomElements = useInchiStore(s => s.atomElements);
  const hAtomPoolIds = useInchiStore(s => s.hAtomPoolIds);

  useEffect(() => {
    if (!isReady || !ketcherRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorAny = ketcherRef.current.editor as any;
    const struct = editorAny.render.ctab.molecule as StructLike;
    const highlightEditor = editorAny as { highlights: { clear(): void; create(...args: HighlightSpec[]): void } };

    // Guard: highlights.create/clear both call editor.update() synchronously, which
    // fires the editor change event. Without this flag, each highlight triggers
    // getInchi(true), which rebuilds the molecule struct and changes pool IDs,
    // making the auxMap stale for multi-fragment molecules (D-04).
    if (_isHighlightingRef) _isHighlightingRef.current = true;
    try {
      // Always clear first — prevents stale highlight accumulation.
      // Also clears on hoverIdx=null (idle) and non-spatial layers (D-01).
      if (hoverIdx === null) {
        highlightEditor.highlights.clear();
        return;
      }
      const layer = layers[hoverIdx];
      if (!layer) {
        highlightEditor.highlights.clear();
        return;
      }
      // Non-spatial layers: clear canvas, update explanation card only (D-01)
      // 'b' is also non-spatial — matches NON_SPATIAL guard in buildHighlightSpecs
      if (['version', 'q', 'i', 'b'].includes(layer.type)) {
        highlightEditor.highlights.clear();
        return;
      }

      const specs = buildHighlightSpecs(layer, subHover, auxMap, atomElements, hAtomPoolIds, layers, struct, resolveVar);
      applyKetcherHighlights(highlightEditor, specs);
      if (specs.length > 0) {
        const svgRoot = editorAny.render.paper.canvas as Element;
        whiteAtomLabels(svgRoot, specs);
      }
    } finally {
      if (_isHighlightingRef) _isHighlightingRef.current = false;
    }
  }, [hoverIdx, subHover, layers, auxMap, atomElements, hAtomPoolIds, isReady]);
  // Note: ketcherRef is a ref — intentionally not in deps (stable reference)
}
