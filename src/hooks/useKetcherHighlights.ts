// src/hooks/useKetcherHighlights.ts
// Bridges the Zustand store to Ketcher's highlight API.
// applyKetcherHighlights is extracted as a pure helper for direct unit testing.

import { useEffect } from 'react';
import type React from 'react';
import type { Ketcher } from 'ketcher-core';
import { useInchiStore } from '../store';
import { buildHighlightSpecs, resolveVar } from '../lib/highlightUtils';
import type { HighlightSpec, StructLike } from '../lib/highlightUtils';
import type { SubHover, AuxMap } from '../lib/parseInchi';

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
 * Injects SVG <text data-h-badge="true"> badges above each atom listed in subHover.atoms.
 * Called AFTER applyKetcherHighlights (SVG is synchronously redrawn by that point).
 *
 * Badge text:
 *  - kind='hAtoms' count=1 → "H"
 *  - kind='hAtoms' count=N → "HN" (e.g. "H2", "H3")
 *  - kind='mobileH' → "H?" (italic)
 *
 * Atom center is read from the parent group bounding box (Assumption A1).
 * Guards on null element and missing getBBox (JSDOM safety).
 */
export function renderHBadges(
  svgRoot: Element,
  subHover: SubHover,
  auxMap: AuxMap,
  resolveVarFn: (name: string) => string,
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const isMobile = subHover.kind === 'mobileH';
  const count = subHover.kind === 'hAtoms' ? (subHover.count ?? 1) : null;
  const colorVar = isMobile ? '--c-hydro-mobile' : `--c-hydro-${Math.min(count!, 4)}`;
  const fill = resolveVarFn(colorVar);
  const text = isMobile ? 'H?' : count === 1 ? 'H' : `H${count}`;

  for (const canonAtom of subHover.atoms ?? []) {
    const poolId = auxMap[canonAtom];
    if (poolId === undefined) continue;
    const atomEl = svgRoot.querySelector(`[data-atom-id="${poolId}"]`);
    if (!atomEl) continue;
    // Read atom center via parent group bounding box (A1 — empirical verify needed)
    const parentGroup = atomEl.closest('g') ?? atomEl;
    const bbox = (parentGroup as SVGGraphicsElement).getBBox?.();
    if (!bbox) continue;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const badge = document.createElementNS(ns, 'text');
    badge.setAttribute('data-h-badge', 'true');
    badge.setAttribute('x', String(cx));
    badge.setAttribute('y', String(cy + 20));    // +20 per design handoff canvas.jsx line 203
    badge.setAttribute('text-anchor', 'middle');
    badge.setAttribute('dominant-baseline', 'central');
    badge.setAttribute('font-size', '12');
    badge.setAttribute('font-weight', '500');
    badge.setAttribute('pointer-events', 'none');
    if (isMobile) badge.setAttribute('font-style', 'italic');
    badge.style.fill = fill;
    badge.textContent = text;
    svgRoot.appendChild(badge);
  }
}

/**
 * Removes all SVG badge elements injected by renderHBadges.
 * Must be called on all highlight-clear paths to prevent badge persistence (D-03, D-06).
 */
export function cleanHBadges(svgRoot: Element): void {
  svgRoot.querySelectorAll('[data-h-badge]').forEach(el => el.remove());
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
  _isHighlightingRef?: React.MutableRefObject<boolean>,
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
        const svgRoot = editorAny.render.paper.canvas as Element;
        cleanHBadges(svgRoot);
        return;
      }
      const layer = layers[hoverIdx];
      if (!layer) {
        highlightEditor.highlights.clear();
        const svgRoot = editorAny.render.paper.canvas as Element;
        cleanHBadges(svgRoot);
        return;
      }
      // Non-spatial layers: clear canvas, update explanation card only (D-01)
      // 'b' is also non-spatial — matches NON_SPATIAL guard in buildHighlightSpecs
      if (['version', 'q', 'i', 'b'].includes(layer.type)) {
        highlightEditor.highlights.clear();
        const svgRoot = editorAny.render.paper.canvas as Element;
        cleanHBadges(svgRoot);
        return;
      }

      const specs = buildHighlightSpecs(layer, subHover, auxMap, atomElements, hAtomPoolIds, layers, struct, resolveVar);
      applyKetcherHighlights(highlightEditor, specs);
      const svgRoot = editorAny.render.paper.canvas as Element;
      cleanHBadges(svgRoot);
      if (specs.length > 0) {
        whiteAtomLabels(svgRoot, specs);
        if (subHover && (subHover.kind === 'hAtoms' || subHover.kind === 'mobileH')) {
          renderHBadges(svgRoot, subHover, auxMap, resolveVar);
        }
      }
    } finally {
      if (_isHighlightingRef) _isHighlightingRef.current = false;
    }
  }, [hoverIdx, subHover, layers, auxMap, atomElements, hAtomPoolIds, isReady]);
  // Note: ketcherRef is a ref — intentionally not in deps (stable reference)
}
