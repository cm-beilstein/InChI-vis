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
  hAtomPoolIds: number[] = [],
  struct?: StructLike,
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const isMobile = subHover.kind === 'mobileH';
  const totalCount = subHover.kind === 'hAtoms' ? (subHover.count ?? 1) : null;

  // First pass: resolve atom centers, per-atom implicit H counts, and badge directions.
  // implicitCount = totalCount − bonded explicit H atoms; atoms at ≤ 0 are skipped.
  //
  // Badge direction: largest angular gap among ALL bond directions visible in the SVG.
  // This avoids collisions with both bond lines and already-drawn explicit H labels in
  // one unified pass, replacing the earlier avoidDir + centroid-fallback approach.
  const centers: Array<{ cx: number; cy: number; implicitCount: number; dir?: { dx: number; dy: number } }> = [];
  for (const canonAtom of subHover.atoms ?? []) {
    const poolId = auxMap[canonAtom];
    if (poolId === undefined) continue;

    // Count bonded explicit H to derive implicitCount; skip atom if all H are drawn.
    let implicitCount = totalCount ?? 1;
    if (!isMobile && struct && hAtomPoolIds.length > 0) {
      let explicitH = 0;
      struct.bonds.forEach(bond => {
        if (bond.begin === poolId || bond.end === poolId) {
          const neighbor = bond.begin === poolId ? bond.end : bond.begin;
          if (hAtomPoolIds.includes(neighbor)) explicitH++;
        }
      });
      implicitCount = (totalCount ?? 1) - explicitH;
      if (implicitCount <= 0) continue;
    }

    const atomEl = svgRoot.querySelector(`[data-atom-id="${poolId}"]`);
    if (!atomEl) continue;
    const parentGroup = atomEl.closest('g') ?? atomEl;
    const bbox = (parentGroup as SVGGraphicsElement).getBBox?.();
    if (!bbox) continue;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    // Collect angles to every bonded neighbor whose SVG element is present.
    // Includes both heavy-atom bonds (bond lines) and explicit H atoms.
    let dir: { dx: number; dy: number } | undefined;
    if (struct) {
      const angles: number[] = [];
      struct.bonds.forEach(bond => {
        if (bond.begin === poolId || bond.end === poolId) {
          const neighbor = bond.begin === poolId ? bond.end : bond.begin;
          const nEl = svgRoot.querySelector(`[data-atom-id="${neighbor}"]`);
          if (!nEl) return;
          const nGroup = nEl.closest('g') ?? nEl;
          const nBbox = (nGroup as SVGGraphicsElement).getBBox?.();
          if (!nBbox) return;
          const ndx = (nBbox.x + nBbox.width / 2) - cx;
          const ndy = (nBbox.y + nBbox.height / 2) - cy;
          if (Math.abs(ndx) > 0.5 || Math.abs(ndy) > 0.5) angles.push(Math.atan2(ndy, ndx));
        }
      });
      if (angles.length > 0) {
        // Place badge at the midpoint of the largest angular gap — the "open" direction
        // that avoids all bond lines and drawn H labels around this atom.
        angles.sort((a, b) => a - b);
        let maxGap = 0;
        let badgeAngle = -Math.PI / 2;
        for (let i = 0; i < angles.length; i++) {
          const a1 = angles[i];
          const a2 = angles[(i + 1) % angles.length];
          const gap = a2 > a1 ? a2 - a1 : a2 + 2 * Math.PI - a1;
          if (gap > maxGap) { maxGap = gap; badgeAngle = a1 + gap / 2; }
        }
        dir = { dx: Math.cos(badgeAngle), dy: Math.sin(badgeAngle) };
      }
    }

    centers.push({ cx, cy, implicitCount, dir });
  }
  if (centers.length === 0) return;

  // Centroid fallback for atoms where no neighbor SVG positions were available.
  const centX = centers.reduce((s, c) => s + c.cx, 0) / centers.length;
  const centY = centers.reduce((s, c) => s + c.cy, 0) / centers.length;
  const OFFSET = 18;

  for (const { cx, cy, implicitCount, dir } of centers) {
    let dx: number, dy: number;
    if (dir) {
      dx = dir.dx;
      dy = dir.dy;
    } else {
      dx = cx - centX;
      dy = cy - centY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) { dx = 0; dy = -1; }
      else { dx /= len; dy /= len; }
    }

    const colorVar = isMobile ? '--c-hydro-mobile' : `--c-hydro-${Math.min(implicitCount, 4)}`;
    const fill = resolveVarFn(colorVar);
    const text = isMobile ? 'H?' : implicitCount === 1 ? 'H' : `H${implicitCount}`;

    const badge = document.createElementNS(ns, 'text');
    badge.setAttribute('data-h-badge', 'true');
    badge.setAttribute('x', String(cx + dx * OFFSET));
    badge.setAttribute('y', String(cy + dy * OFFSET));
    badge.setAttribute('text-anchor', 'middle');
    badge.setAttribute('dominant-baseline', 'central');
    badge.setAttribute('font-size', '12');
    badge.setAttribute('font-weight', '500');
    badge.setAttribute('pointer-events', 'none');
    // White halo painted under the fill so badges remain readable over bond lines.
    badge.setAttribute('stroke', 'white');
    badge.setAttribute('stroke-width', '3');
    badge.setAttribute('paint-order', 'stroke fill');
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
      if (['version', 'i'].includes(layer.type)) {
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
          renderHBadges(svgRoot, subHover, auxMap, resolveVar, hAtomPoolIds, struct);
        }
      }
    } finally {
      if (_isHighlightingRef) _isHighlightingRef.current = false;
    }
  }, [hoverIdx, subHover, layers, auxMap, atomElements, hAtomPoolIds, isReady]);
  // Note: ketcherRef is a ref — intentionally not in deps (stable reference)
}
