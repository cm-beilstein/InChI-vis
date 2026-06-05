# Phase 8: Hydrogen Implicit & Explicit Highlight — Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 4 (modified only — no new files)
**Analogs found:** 4 / 4

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/hooks/useKetcherHighlights.ts` | hook / DOM-mutator | event-driven (Zustand → SVG) | self — `whiteAtomLabels` is the template | exact |
| `src/lib/highlightUtils.ts` | pure utility | transform (SubHover → HighlightSpec[]) | self — `case 'atom'` bond-lookup pattern | exact |
| `src/lib/__tests__/highlightUtils.test.ts` | test | unit | `src/hooks/__tests__/useKetcherHighlights.test.ts` + existing `highlightUtils.test.ts` content | exact |
| `src/hooks/__tests__/useKetcherHighlights.test.ts` | test | unit | existing `useKetcherHighlights.test.ts` structure | exact |

---

## Pattern Assignments

### `src/hooks/useKetcherHighlights.ts` — add `renderHBadges` + `cleanHBadges` + hook wiring

**Analog:** `whiteAtomLabels` (same file, lines 40–51) — exact template for SVG DOM injection after `highlights.create()`

**Imports pattern** (lines 1–10 of current file):
```typescript
// src/hooks/useKetcherHighlights.ts — existing imports, no new ones needed
import { useEffect } from 'react';
import type React from 'react';
import type { Ketcher } from 'ketcher-core';
import { useInchiStore } from '../store';
import { buildHighlightSpecs, resolveVar } from '../lib/highlightUtils';
import type { HighlightSpec, StructLike } from '../lib/highlightUtils';
```
Phase 8 must also import `SubHover` and `AuxMap` types (already available from `'../lib/parseInchi'` via re-export in `highlightUtils`) since `renderHBadges` signature needs them. Preferred: add to the existing `highlightUtils` import line.

**Core pattern — `whiteAtomLabels` (lines 40–51) — copy exactly for `renderHBadges` / `cleanHBadges`:**
```typescript
// ANALOG — whiteAtomLabels: finds atom SVG element by data-atom-id, mutates style
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
```

**`renderHBadges` — follow this structure (same file, after `whiteAtomLabels`):**
```typescript
// NEW: renderHBadges — inject SVG <text data-h-badge="true"> above each atom
// Called AFTER applyKetcherHighlights (SVG is synchronously redrawn by that point)
export function renderHBadges(
  svgRoot: Element,
  subHover: SubHover,            // kind === 'hAtoms' | 'mobileH'
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
    // Read atom center via parent group bounding box (A1 — needs empirical verify)
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

// NEW: cleanHBadges — mirrors whiteAtomLabels cleanup approach (data attribute selector)
export function cleanHBadges(svgRoot: Element): void {
  svgRoot.querySelectorAll('[data-h-badge]').forEach(el => el.remove());
}
```

**Hook wiring pattern — existing `useEffect` body (lines 84–111), extend the `specs.length > 0` branch:**
```typescript
// CURRENT (lines 103–108):
const specs = buildHighlightSpecs(layer, subHover, auxMap, atomElements, hAtomPoolIds, layers, struct, resolveVar);
applyKetcherHighlights(highlightEditor, specs);
if (specs.length > 0) {
  const svgRoot = editorAny.render.paper.canvas as Element;
  whiteAtomLabels(svgRoot, specs);
}

// PHASE 8 EXTENSION — add cleanHBadges on ALL paths + renderHBadges on h-layer sub-hover:
const specs = buildHighlightSpecs(layer, subHover, auxMap, atomElements, hAtomPoolIds, layers, struct, resolveVar);
applyKetcherHighlights(highlightEditor, specs);
const svgRoot = editorAny.render.paper.canvas as Element;
cleanHBadges(svgRoot);            // always clean first (Pitfall 1 + Pitfall 3)
if (specs.length > 0) {
  whiteAtomLabels(svgRoot, specs);
  if (subHover && (subHover.kind === 'hAtoms' || subHover.kind === 'mobileH')) {
    renderHBadges(svgRoot, subHover, auxMap, resolveVar);
  }
}
```

**Early-return paths — also add `cleanHBadges` (Pitfall 3 avoidance):**
```typescript
// All three early-return blocks (hoverIdx===null, !layer, non-spatial) must call:
highlightEditor.highlights.clear();
const svgRoot = editorAny.render.paper.canvas as Element;
cleanHBadges(svgRoot);
return;
```
Note: `editorAny.render.paper.canvas` access must only happen when `editorAny` is confirmed non-null (it is, since we passed the `!ketcherRef.current` guard at the top of the effect).

---

### `src/lib/highlightUtils.ts` — extend `case 'hAtoms'` with explicit-H bond lookup

**Analog:** `case 'atom'` in `buildSubHoverSpecs` (lines 293–305) — exact bond-iteration pattern

**Bond-iteration pattern from `case 'atom'` (lines 298–304):**
```typescript
// ANALOG — case 'atom': incident bond lookup via struct.bonds.forEach
case 'atom': {
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
```

**Current `case 'hAtoms'` (lines 314–322) — Phase 8 replaces with:**
```typescript
// CURRENT:
case 'hAtoms': {
  const kAtoms = (subHover.atoms ?? [])
    .map(c => auxMap[c])
    .filter((id): id is number => id !== undefined);
  if (kAtoms.length === 0) return [];
  const colorVar = hydroColor(subHover.count!) ?? 'var(--c-hydro-1)';
  const color = resolveVarFn(stripVar(colorVar));
  return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
}

// PHASE 8 EXTENSION — split into explicit-H vs implicit-H paths:
case 'hAtoms': {
  const canonAtoms = subHover.atoms ?? [];
  const heavyKAtoms: number[] = [];
  const explicitHKAtoms: number[] = [];
  const bondIds: number[] = [];

  for (const canon of canonAtoms) {
    const kId = auxMap[canon];
    if (kId === undefined) continue;
    if (hAtomPoolIds.includes(kId)) {
      // Explicit H atom in canvas — collect it, find bonded heavy atom and bond
      explicitHKAtoms.push(kId);
      struct.bonds.forEach((bond, bid) => {      // same forEach as case 'atom'
        if (bond.begin === kId || bond.end === kId) {
          const heavyId = bond.begin === kId ? bond.end : bond.begin;
          if (!heavyKAtoms.includes(heavyId)) heavyKAtoms.push(heavyId);
          bondIds.push(bid);
        }
      });
    } else {
      // Implicit H — highlight the heavy atom only (no bond)
      heavyKAtoms.push(kId);
    }
  }

  const allAtoms = [...heavyKAtoms, ...explicitHKAtoms];
  if (allAtoms.length === 0) return [];
  const colorVar = hydroColor(subHover.count!) ?? 'var(--c-hydro-1)';
  const color = resolveVarFn(stripVar(colorVar));
  return [{ atoms: allAtoms, bonds: bondIds, rgroupAttachmentPoints: [], color }];
}
```

No changes needed to `case 'mobileH'` — it is already correct (lines 324–331).

---

### `src/lib/__tests__/highlightUtils.test.ts` — new tests for explicit-H bond path in `case 'hAtoms'`

**Analog:** Existing test structure in the same file (lines 1–199) and the `makeMockStruct()` helper (lines 18–33).

**Test fixture pattern (lines 18–33) — copy `makeMockStruct` and add an explicit-H variant:**
```typescript
// ANALOG — existing makeMockStruct (lines 18–33)
function makeMockStruct(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);  // bond 0: atom 0 — atom 1
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
      }),
    },
  };
}

// NEW fixture for explicit-H test: atom 6 (pool ID 6) is an explicit H bonded to atom 0
function makeMockStructWithExplicitH(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
        cb({ begin: 0, end: 6 }, 6);   // explicit H (pool 6) bonded to atom 0
      }),
    },
  };
}
```

**Test case pattern (copy structure from existing `buildSubHoverSpecs` tests):**
```typescript
// ANALOG — pattern from any existing buildSubHoverSpecs test block
describe('buildSubHoverSpecs — case hAtoms (Phase 8 explicit-H path)', () => {
  it('implicit H (kId not in hAtomPoolIds): returns heavy atom pool ID, no bonds', () => {
    const struct = makeMockStruct();
    const result = buildSubHoverSpecs(
      { kind: 'hAtoms', atoms: [1], count: 1 },
      { 1: 0 },          // canonical 1 → pool 0 (heavy atom)
      { 1: 'C' },
      [],                // no explicit H pool IDs
      makeLayer({ type: 'h', atoms: [1] }),
      struct,
      resolveVarFn,
    );
    expect(result).toHaveLength(1);
    expect(result[0].atoms).toContain(0);
    expect(result[0].bonds).toHaveLength(0);
  });

  it('explicit H (kId in hAtomPoolIds): includes H atom, heavy atom, and bond', () => {
    const struct = makeMockStructWithExplicitH();
    // canonical 7 → pool 6 (explicit H); auxMap 1 → pool 0 (heavy C)
    const result = buildSubHoverSpecs(
      { kind: 'hAtoms', atoms: [7], count: 1 },
      { 7: 6 },          // canonical 7 → pool 6 (explicit H)
      {},
      [6],               // pool 6 IS in hAtomPoolIds
      makeLayer({ type: 'h', atoms: [7] }),
      struct,
      resolveVarFn,
    );
    expect(result).toHaveLength(1);
    expect(result[0].atoms).toContain(6);     // explicit H pool ID
    expect(result[0].atoms).toContain(0);     // bonded heavy atom
    expect(result[0].bonds).toContain(6);     // bond ID between them
  });
});
```

---

### `src/hooks/__tests__/useKetcherHighlights.test.ts` — new tests for `renderHBadges` and `cleanHBadges`

**Analog:** Existing `whiteAtomLabels` test block (lines 39–86) — exactly the right shape: JSDOM SVG, data attribute, style mutation.

**SVG test helper pattern (lines 39–44):**
```typescript
// ANALOG — makeAtomEl used by whiteAtomLabels tests
function makeAtomEl(atomId: number, label: string): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  el.setAttribute('data-atom-id', String(atomId));
  el.setAttribute('data-atomLabel', label);
  return el as unknown as SVGElement;
}
```

**New helper for badge tests — atom element wrapped in a `<g>` (needed for `getBBox` parent group pattern):**
```typescript
// NEW: makeAtomGroup — wraps atom el in <g> so renderHBadges can call .closest('g')
// Note: JSDOM does not implement getBBox() — must mock it on the group element.
function makeAtomGroup(atomId: number, x: number, y: number): SVGGElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('data-atom-id', String(atomId));
  // Mock getBBox on the group
  (g as any).getBBox = () => ({ x, y, width: 20, height: 16 });
  g.appendChild(textEl);
  return g;
}
```

**Test case pattern (copy describe/it structure from `whiteAtomLabels` block):**
```typescript
// ANALOG — mirrors whiteAtomLabels describe block structure (lines 46–86)
describe('renderHBadges', () => {
  it('injects <text data-h-badge="true"> for each atom in subHover.atoms', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.appendChild(makeAtomGroup(0, 100, 50));
    renderHBadges(
      svg,
      { kind: 'hAtoms', atoms: [1], count: 2 },
      { 1: 0 },   // canonical 1 → pool 0
      (name) => name,
    );
    const badges = svg.querySelectorAll('[data-h-badge]');
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe('H2');
  });

  it('skips atoms with no matching DOM element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(() => renderHBadges(
      svg,
      { kind: 'hAtoms', atoms: [99], count: 1 },
      { 99: 999 },
      (name) => name,
    )).not.toThrow();
    expect(svg.querySelectorAll('[data-h-badge]')).toHaveLength(0);
  });

  it('uses italic font-style and H? text for mobileH kind', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.appendChild(makeAtomGroup(0, 50, 50));
    renderHBadges(
      svg,
      { kind: 'mobileH', atoms: [1] },
      { 1: 0 },
      (name) => name,
    );
    const badge = svg.querySelector('[data-h-badge]');
    expect(badge?.textContent).toBe('H?');
    expect(badge?.getAttribute('font-style')).toBe('italic');
  });
});

describe('cleanHBadges', () => {
  it('removes all [data-h-badge] elements from svgRoot', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const badge1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badge1.setAttribute('data-h-badge', 'true');
    const badge2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badge2.setAttribute('data-h-badge', 'true');
    svg.append(badge1, badge2);
    cleanHBadges(svg);
    expect(svg.querySelectorAll('[data-h-badge]')).toHaveLength(0);
  });

  it('does not throw on empty svg root', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(() => cleanHBadges(svg)).not.toThrow();
  });
});
```

---

## Shared Patterns

### SVG DOM injection lifecycle
**Source:** `src/hooks/useKetcherHighlights.ts` — `whiteAtomLabels` (lines 40–51)
**Apply to:** `renderHBadges`, `cleanHBadges`
```typescript
// Pattern: querySelector by data attribute, guard on null, mutate or append
const el = svgRoot.querySelector(`[data-atom-id="${atomId}"]`);
if (!el) continue;
(el as SVGElement).style.fill = 'white';
```
Invariant: always called after `applyKetcherHighlights` returns, never before.

### Bond iteration (struct.bonds.forEach)
**Source:** `src/lib/highlightUtils.ts` — `case 'atom'` (lines 298–304)
**Apply to:** `case 'hAtoms'` explicit-H extension
```typescript
struct.bonds.forEach((bond, bid) => {
  if (kAtomIds.includes(bond.begin) || kAtomIds.includes(bond.end)) incidentBonds.push(bid);
});
// Bond callback signature: (bond: { begin: number; end: number }, id: number) => void
```

### Data-attribute cleanup
**Source:** `src/hooks/useKetcherHighlights.ts` — `whiteAtomLabels` approach; `data-white-label` pattern
**Apply to:** `cleanHBadges` uses `data-h-badge` for the same targeted removal
```typescript
// Pattern: remove all elements matching a data attribute selector
svgRoot.querySelectorAll('[data-h-badge]').forEach(el => el.remove());
```

### subHoverProps / setSubHover wiring
**Source:** `src/components/LayerText.tsx` lines 22–27
**Apply to:** `HLayerText` spans are already wired — no change needed. Shown here as context.
```typescript
function subHoverProps(hit: SubHover) {
  return {
    onMouseEnter: () => useInchiStore.getState().setSubHover(hit),
    onMouseLeave: () => useInchiStore.getState().setSubHover(null),
  };
}
```

### Test file: import + mock pattern
**Source:** `src/hooks/__tests__/useKetcherHighlights.test.ts` lines 1–12
**Apply to:** New tests in the same file import the new exported helpers alongside existing ones
```typescript
import { describe, it, expect, vi } from 'vitest';
import { applyKetcherHighlights, whiteAtomLabels, renderHBadges, cleanHBadges } from '../useKetcherHighlights';
import type { HighlightSpec } from '../../lib/highlightUtils';
```

---

## No Analog Found

None. All new code follows established in-codebase patterns exactly:

| Capability | Analog Location | Match |
|---|---|---|
| `renderHBadges` SVG injection | `whiteAtomLabels` (same file, lines 40–51) | exact |
| `cleanHBadges` data-attribute removal | `whiteAtomLabels` cleanup approach | exact |
| Explicit-H bond lookup | `case 'atom'` in `buildSubHoverSpecs` (lines 298–304) | exact |
| Badge test helpers | `makeAtomEl` in `useKetcherHighlights.test.ts` (lines 39–44) | exact |
| highlightUtils test fixtures | existing `makeMockStruct` + `makeLayer` pattern | exact |

---

## Key Constraints for Planner

1. **`cleanHBadges` must be called on ALL early-return paths** in `useKetcherHighlights`, not only in the sub-hover branch. This covers the hoverIdx=null path, the !layer path, and the non-spatial layer path (Pitfall 3 in RESEARCH.md).

2. **`renderHBadges` is called strictly after `applyKetcherHighlights`** — never before. `highlights.create()` synchronously redraws SVG; reading atom positions before this gives stale/zero coordinates (Pitfall 2 in RESEARCH.md).

3. **Assumption A1** (RESEARCH.md): `getBBox()` on `atomEl.closest('g')` for atom center. This is NOT verified against live Raphaël SVG. The first implementation task must include a console.log inspection step and adjust the position read strategy if needed.

4. **No new imports** are required in any file other than adding `SubHover` and `AuxMap` type imports to `useKetcherHighlights.ts` (if not already transitively available — they are currently used only in `highlightUtils.ts`).

5. **`case 'mobileH'` is unchanged** — only `case 'hAtoms'` receives the explicit-H bond extension.

6. **JSDOM does not implement `getBBox()`** — test helpers must mock it on the group element (as shown in the test pattern above).

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/lib/`, `src/lib/__tests__/`, `src/hooks/__tests__/`
**Files scanned:** 6 (useKetcherHighlights.ts, highlightUtils.ts, LayerText.tsx, parseInchi.ts, store.ts, useKetcherHighlights.test.ts, highlightUtils.test.ts)
**Pattern extraction date:** 2026-06-05
