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
 * React hook that subscribes to Zustand hover state and drives Ketcher canvas highlights.
 * Called from App.tsx once Ketcher is ready (isReady = true).
 *
 * ketcherRef is intentionally excluded from the useEffect deps array — it is a stable
 * React ref whose .current is always the same Ketcher instance after init.
 */
export function useKetcherHighlights(
  ketcherRef: React.RefObject<Ketcher | null>,
  isReady: boolean,
): void {
  const hoverIdx    = useInchiStore(s => s.hoverIdx);
  const subHover    = useInchiStore(s => s.subHover);
  const layers      = useInchiStore(s => s.layers);
  const auxMap      = useInchiStore(s => s.auxMap);
  const atomElements = useInchiStore(s => s.atomElements);

  useEffect(() => {
    if (!isReady || !ketcherRef.current) return;
    const editor = ketcherRef.current.editor;
    const struct = (editor as any).render.ctab.molecule as StructLike;

    // Always clear first — prevents stale highlight accumulation (D-04).
    // Also clears on hoverIdx=null (idle) and non-spatial layers (D-01).
    if (hoverIdx === null) {
      editor.highlights.clear();
      return;
    }
    const layer = layers[hoverIdx];
    if (!layer) {
      editor.highlights.clear();
      return;
    }
    // Non-spatial layers: clear canvas, update explanation card only (D-01)
    if (['version', 'q', 'p', 'i'].includes(layer.type)) {
      editor.highlights.clear();
      return;
    }

    const specs = buildHighlightSpecs(layer, subHover, auxMap, atomElements, layers, struct, resolveVar);
    applyKetcherHighlights(editor, specs);
  }, [hoverIdx, subHover, layers, auxMap, atomElements, isReady]);
  // Note: ketcherRef is a ref — intentionally not in deps (stable reference)
}
