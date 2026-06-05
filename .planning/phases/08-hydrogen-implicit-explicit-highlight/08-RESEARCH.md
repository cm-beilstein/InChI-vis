# Phase 8: Hydrogen Implicit & Explicit Highlight — Research

**Researched:** 2026-06-05
**Domain:** SVG badge injection, h-layer sub-token highlighting, explicit-H bond lookup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hovering a fixed-H sub-token renders an SVG `<text>` badge above each corresponding heavy atom showing the H count. Badge appears on hover-in and is removed on hover-out. Injected into the Ketcher SVG canvas using the existing `whiteAtomLabels()` / SVG-manipulation pattern in `useKetcherHighlights.ts`.
- **D-02:** Badge text format: `H` for count=1, `H2` for count=2, etc. Position: above the atom's center point, small font, h-layer accent color. Exact positioning and font size are at Claude's discretion.
- **D-03:** Badge is a separate SVG injection step after `highlights.create()`. Cleanup removes all badge elements by `data-h-badge="true"` attribute on mouse-out.
- **D-04:** The h-layer text is split into per-comma-group spans. Each group becomes its own independently hoverable `<span>` in the InchiSection strip via a `HLayerText` sub-token component.
- **D-05:** Sub-hover kinds: `{ kind: 'hAtoms', atoms: number[], count: number }` for fixed-H groups, `{ kind: 'mobileH', atoms: number[] }` for tautomeric groups.
- **D-06:** Whole-h-layer hover (no sub-token selected) retains current behavior. Sub-token hover overrides this.
- **D-07:** When a sub-token maps to an explicit H atom in the canvas, the highlight spec includes: H atom pool ID, heavy atom pool ID, and bond ID between them. Bond lookup uses `render.ctab.molecule.bonds`.
- **D-08:** Researcher must verify how to map an explicit H pool ID back to its bonded heavy atom and bond ID from the Ketcher render struct.
- **D-09:** Hovering `(H,3,4)` highlights all listed candidate atoms in `--c-hydro-mobile`. No animation.

### Claude's Discretion

- Exact SVG badge font size, vertical offset, and color (match existing atom label visual weight)
- Whether to extract badge injection into a named helper function (e.g. `renderHBadges()`)
- CSS class naming for the new `HLayerText` component spans

### Deferred Ideas (OUT OF SCOPE)

- Per-atom expansion of ranges (e.g. `1-6H` → 6 individually hoverable spans)
- Animated / dashed-border tautomer visualization
- Shareable URL (MAP-03)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INCHI-08 | Hydrogen Implicit & Explicit Highlight — h-layer sub-token granularity, SVG badge injection, explicit-H bond highlight, mobile-H tautomeric group highlight | All four capabilities confirmed in codebase: `HLayerText` + `SubHover` union already in place; badge injection pattern established by `whiteAtomLabels`; bond lookup pattern established by c-layer in `buildSubHoverSpecs`; the only new code is `renderHBadges`, `cleanHBadges`, and explicit-H bond extension to `case 'hAtoms'` |
</phase_requirements>

---

## Summary

Phase 8 is substantially more complete than a fresh phase. Reading the codebase reveals that the sub-token splitting, `SubHover` union extension, `buildSubHoverSpecs` cases for `hAtoms` and `mobileH`, and the `HLayerText` component are **all already implemented** in Phases 6–7. The 156 existing tests pass against this code. The explicit D-08 research flag is resolved below.

What Phase 8 actually needs to build is narrow:

1. **`renderHBadges` helper** — new function in `useKetcherHighlights.ts` that injects SVG `<text data-h-badge>` elements into Ketcher's canvas SVG after `highlights.create()`.
2. **`cleanHBadges` helper** — removes all `[data-h-badge]` elements; called on every hover-out and before badge re-injection.
3. **Explicit-H bond lookup** in `buildSubHoverSpecs` `case 'hAtoms'` — when a canonical atom maps to an explicit H pool ID (i.e., it is in `hAtomPoolIds`), find its bonded heavy atom and bond via `struct.bonds.forEach`.
4. **New tests** — unit tests for `renderHBadges`, `cleanHBadges`, badge lifecycle, and explicit-H bond path.

**Primary recommendation:** Implement `renderHBadges`/`cleanHBadges` following the `whiteAtomLabels` template exactly. Implement explicit-H bond lookup following the `case 'atom'` bond-iteration pattern in `buildSubHoverSpecs`. Wire both into the `useKetcherHighlights` effect. Write tests first (Wave 0) targeting the new helpers.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| H-layer sub-token splitting | Frontend (React component) | — | `HLayerText` in `LayerText.tsx` already owns this; renders per-group `<span>` with `subHoverProps` |
| Sub-hover state dispatch | Frontend (Zustand store) | — | `setSubHover` is called from `subHoverProps` on `onMouseEnter`; store owns hover state |
| Highlight spec building | Pure lib (`highlightUtils.ts`) | — | `buildSubHoverSpecs` already has `hAtoms`/`mobileH` cases; explicit-H bond path extends `case 'hAtoms'` |
| SVG badge injection | Frontend hook (`useKetcherHighlights.ts`) | — | `whiteAtomLabels` pattern already established; `renderHBadges` follows same DOM-injection approach |
| Explicit-H bond lookup | Pure lib (`highlightUtils.ts`) | — | `struct.bonds.forEach` pattern already used in `case 'atom'`; extended here |
| Badge cleanup | Frontend hook | — | `cleanHBadges` called in same finally/hover-out path as existing cleanup |

---

## What Is Already Done (Confirmed by Codebase Scan)

This section is critical for the planner — do not create tasks to re-implement these.

### Already implemented (no changes needed)

| Component | Location | Status |
|-----------|----------|--------|
| `HLayerText` sub-token rendering | `src/components/LayerText.tsx` lines 230–396 | Complete — splits h-layer text into per-comma-group hoverable spans with correct multi-fragment offset handling |
| `SubHover` union — `hAtoms` variant | `src/lib/parseInchi.ts` line 33 | Complete — `{ kind: 'hAtoms'; atoms: number[]; count: number }` present |
| `SubHover` union — `mobileH` variant | `src/lib/parseInchi.ts` line 34 | Complete — `{ kind: 'mobileH'; atoms: number[] }` present |
| `buildSubHoverSpecs` `case 'hAtoms'` | `src/lib/highlightUtils.ts` lines 314–321 | Complete for atom-only highlight; explicit-H bond extension is new |
| `buildSubHoverSpecs` `case 'mobileH'` | `src/lib/highlightUtils.ts` lines 323–330 | Complete — maps atoms through auxMap, returns `--c-hydro-mobile` spec |
| CSS classes `hydro1`–`hydro4`, `hydroMobile` | `src/components/InchiSection.module.css` lines 122–126 | Complete |
| `hAtomPoolIds` collection in `App.tsx` | `src/App.tsx` lines 100–104 | Complete |
| `hAtomPoolIds` field in store | `src/store.ts` line 15 | Complete |
| `whiteAtomLabels` SVG injection helper | `src/hooks/useKetcherHighlights.ts` lines 40–51 | Complete — template for `renderHBadges` |

### What Phase 8 adds

| Item | File | Description |
|------|------|-------------|
| `renderHBadges(svgRoot, subHover, auxMap, resolveVar)` | `useKetcherHighlights.ts` | New helper: injects SVG `<text data-h-badge="true">` above each highlighted atom |
| `cleanHBadges(svgRoot)` | `useKetcherHighlights.ts` | New helper: removes all `[data-h-badge]` from SVG root |
| Explicit-H bond lookup in `case 'hAtoms'` | `highlightUtils.ts` | Extension of existing case: when a canonical atom's pool ID is in `hAtomPoolIds`, look up bonded heavy atom and bond via `struct.bonds.forEach` |
| Hook wiring | `useKetcherHighlights.ts` | Call `cleanHBadges` on every hover-out; call `renderHBadges` when `subHover?.kind === 'hAtoms'` or `'mobileH'` |
| New unit tests | `src/lib/__tests__/highlightUtils.test.ts` + `src/hooks/__tests__/useKetcherHighlights.test.ts` | Tests for badge injection, lifecycle, explicit-H bond path |

---

## Standard Stack

No new packages required. Phase 8 uses only existing project dependencies.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React 18 | ^18.2 | Component rendering | Already installed |
| Zustand 5 | ^5.0.13 | Store — `subHover` state dispatch | Already installed |
| ketcher-core | 3.12.0 | `Ketcher` type, `render.ctab.molecule` struct | Already installed |
| Vitest | 3.x | Unit testing | Already installed |

[VERIFIED: codebase scan — all dependencies present in `package.json` and `node_modules`]

---

## Package Legitimacy Audit

No new packages are installed in Phase 8. This section is not applicable.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User hovers h-layer sub-token
           |
           v
HLayerText span (onMouseEnter)
    --> setSubHover({ kind:'hAtoms'|'mobileH', atoms, count })
           |
           v
useKetcherHighlights (useEffect, subHover dep changes)
    --> buildHighlightSpecs(layer, subHover, ...)
           |
           +-- buildSubHoverSpecs case 'hAtoms'
           |     --> map canonical atoms through auxMap --> kAtoms
           |     --> [NEW] if any kAtom in hAtomPoolIds:
           |           struct.bonds.forEach --> find bonded heavy atom + bond ID
           |           include in spec
           |     --> return HighlightSpec[]
           |
           +-- buildSubHoverSpecs case 'mobileH'
                 --> map atoms through auxMap --> kAtoms
                 --> return HighlightSpec with --c-hydro-mobile
           |
           v
applyKetcherHighlights(editor, specs)
    --> editor.highlights.clear()
    --> editor.highlights.create(...specs)
           |
           v
whiteAtomLabels(svgRoot, specs)  [existing]
           |
           v
[NEW] cleanHBadges(svgRoot)
    --> remove all [data-h-badge] from svgRoot
           |
           v
[NEW] renderHBadges(svgRoot, subHover, auxMap, resolveVar)
    --> for each atom in subHover.atoms:
          find SVG atom element via [data-atom-id="<poolId>"]
          read atom x,y from element position
          create SVG <text data-h-badge="true">
          set x=atomX, y=atomY+20, fill=resolveVar(--c-hydro-{count})
          append to svgRoot

User hover-out
    --> setSubHover(null)
    --> useKetcherHighlights effect fires
    --> editor.highlights.clear()
    --> [NEW] cleanHBadges(svgRoot)  <-- removes badges
```

### Recommended Project Structure

No new files are needed. All changes are within existing files:

```
src/
├── lib/
│   └── highlightUtils.ts     # extend case 'hAtoms' with explicit-H bond lookup
├── hooks/
│   └── useKetcherHighlights.ts  # add renderHBadges, cleanHBadges, wire into effect
└── lib/__tests__/
    └── highlightUtils.test.ts   # new tests for explicit-H bond path
src/hooks/__tests__/
    └── useKetcherHighlights.test.ts  # new tests for badge helpers
```

### Pattern 1: SVG Badge Injection (from `whiteAtomLabels` template)

**What:** After `highlights.create()` synchronously redraws highlighted atoms, inject SVG `<text>` elements above each atom using its DOM position.

**When to use:** Any time `subHover.kind === 'hAtoms'` or `'mobileH'`

**Key DOM contract** [VERIFIED: codebase scan of `useKetcherHighlights.ts` lines 40–51]:
- SVG root: `editorAny.render.paper.canvas`
- Atom element selector: `[data-atom-id="${poolId}"]`
- Atom element also carries `data-atomLabel` attribute
- `highlights.create()` calls `editor.update()` synchronously, recreating SVG elements

**Position strategy:** The atom's center `x` and `y` coordinates in the Ketcher SVG are readable from the Raphaël SVG element's `getBBox()` or from the `cx`/`cy` attributes of the enclosing group. The design handoff uses `atom.x, atom.y + 20` — in the live Ketcher SVG, the atom group element position can be read via `el.parentElement.getBBox()` or the transform attribute. The `whiteAtomLabels` pattern sets `style.fill` on the element found by `[data-atom-id]`; for badges we need x/y — use `el.getBoundingClientRect()` relative to SVG root, or read SVG element's `x`/`y` attributes if Raphaël sets them. [ASSUMED — exact attribute structure of Raphaël SVG atom group needs empirical verification; the planner should flag this as a research-validate step]

**Template code** [Source: `src/hooks/useKetcherHighlights.ts` whiteAtomLabels pattern]:
```typescript
export function renderHBadges(
  svgRoot: Element,
  subHover: SubHover,
  auxMap: AuxMap,
  resolveVarFn: (name: string) => string,
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const isMobile = subHover.kind === 'mobileH';
  const count = subHover.kind === 'hAtoms' ? subHover.count ?? 1 : null;
  const colorVar = isMobile ? '--c-hydro-mobile'
    : `--c-hydro-${Math.min(count!, 4)}`;
  const fill = resolveVarFn(colorVar);

  for (const canonAtom of subHover.atoms ?? []) {
    const poolId = auxMap[canonAtom];
    if (poolId === undefined) continue;
    const atomEl = svgRoot.querySelector(`[data-atom-id="${poolId}"]`);
    if (!atomEl) continue;
    // Read position — empirically verify correct attribute/method
    const bbox = (atomEl as SVGGraphicsElement).getBoundingClientRect?.();
    // ... inject <text data-h-badge="true"> at computed position
  }
}

export function cleanHBadges(svgRoot: Element): void {
  svgRoot.querySelectorAll('[data-h-badge]').forEach(el => el.remove());
}
```

### Pattern 2: Explicit-H Bond Lookup (from `case 'atom'` template)

**What:** When a `hAtoms` sub-hover contains a canonical atom whose pool ID is in `hAtomPoolIds`, the atom IS an explicit H drawn in the canvas. In that case, include the H atom's pool ID, the bonded heavy atom's pool ID, and the bond ID between them.

**When to use:** Inside `buildSubHoverSpecs` `case 'hAtoms'`, after mapping canonicals through auxMap.

**Verified pattern** [Source: `src/lib/highlightUtils.ts` lines 298–304, `case 'atom'` bond lookup]:
```typescript
// From existing case 'atom' — identical pattern:
struct.bonds.forEach((bond, bid) => {
  if (kAtomIds.includes(bond.begin) || kAtomIds.includes(bond.end)) {
    incidentBonds.push(bid);
  }
});
```

**Adaptation for explicit-H** (D-07, D-08):
```typescript
case 'hAtoms': {
  const canonAtoms = subHover.atoms ?? [];
  const heavyKAtoms: number[] = [];
  const explicitHKAtoms: number[] = [];
  const bondIds: number[] = [];

  for (const canon of canonAtoms) {
    const kId = auxMap[canon];
    if (kId === undefined) continue;

    if (hAtomPoolIds.includes(kId)) {
      // Explicit H atom — find bonded heavy atom and bond
      explicitHKAtoms.push(kId);
      struct.bonds.forEach((bond, bid) => {
        if (bond.begin === kId || bond.end === kId) {
          const heavyId = bond.begin === kId ? bond.end : bond.begin;
          if (!heavyKAtoms.includes(heavyId)) heavyKAtoms.push(heavyId);
          bondIds.push(bid);
        }
      });
    } else {
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

[VERIFIED: pattern confirmed from existing `buildSubHoverSpecs` code in `highlightUtils.ts`; `struct.bonds.forEach` callback signature `(bond: { begin: number; end: number }, id: number)` confirmed at line 29 of same file]

### Anti-Patterns to Avoid

- **Reading atom position before `highlights.create()`:** The SVG is recreated synchronously on `highlights.create()`. Always inject badges after the create call, not before. [VERIFIED: `whiteAtomLabels` already follows this rule]
- **Forgetting `cleanHBadges` on the hover-out path:** If the h-layer chip is hovered but no sub-token is hovered, `subHover` is null. The hook's early `hoverIdx === null` return path must also call `cleanHBadges`. Use a `finally` block or ensure cleanup runs on all paths.
- **Including `ketcherRef` in `useEffect` deps:** The ref is stable — adding it causes a double-subscription bug. [VERIFIED: existing comment in `useKetcherHighlights.ts` line 112]
- **`hAtomPoolIds.includes(kId)` O(n) in loop:** For large molecules with many explicit H atoms, this could be slow. In practice, explicit H drawings are rare in skeletal formulas — this is not a real concern for v1.

---

## D-08 Research Flag — Resolved

**Decision D-08 flagged:** "The researcher must verify how to reliably map an explicit H pool ID back to its bonded heavy atom and bond ID from the Ketcher render struct."

**Resolution:** [VERIFIED: codebase scan of `highlightUtils.ts` and `App.tsx`]

The pattern already exists for c-layer bond lookup. The `struct` parameter (typed as `StructLike`) exposes `bonds.forEach(cb: (bond: {begin: number; end: number}, id: number) => void)`. This is used in `case 'atom'` (lines 299–303) to find incident bonds by checking `bond.begin` or `bond.end` against a set of known pool IDs.

For explicit-H lookup:
- `hAtomPoolIds` is the list of explicit H atom pool IDs (from `App.tsx` line 100–104)
- When a canonical atom's pool ID is in `hAtomPoolIds`, iterate `struct.bonds` to find the bond where `bond.begin === hPoolId || bond.end === hPoolId`
- The other endpoint of that bond is the bonded heavy atom pool ID
- `bid` is the bond ID

This requires no new Ketcher API — it uses the same `struct.bonds.forEach` already tested in the c-layer.

**Confidence:** HIGH — pattern confirmed from two existing usages in production code.

---

## SVG Badge Position — Key Detail

The design handoff (`canvas.jsx` lines 196–246) positions badges at `x={atom.x}, y={atom.y + 20}` using the React SVG coordinate system. In the live Ketcher SVG (Raphaël-rendered), atom coordinates are encoded differently.

**Recommended approach** (matching `whiteAtomLabels` access pattern):
1. Find the atom's primary SVG element via `svgRoot.querySelector('[data-atom-id="${poolId}"]')`
2. Call `(el as SVGGraphicsElement).getBBox()` on it or its parent group to get center coordinates in SVG user space
3. Apply `y + 20` offset (as in design handoff)

**Alternative** (simpler): Read the element's `x` and `y` SVG attributes if Raphaël sets them on the text element. The `whiteAtomLabels` function only sets `style.fill` — it does not need coordinates. Badge injection is the first time we need atom positions from the SVG DOM.

[ASSUMED — the exact attribute or method to read atom center (x,y) from the Raphaël SVG needs empirical verification during implementation. Plan should include a single-step validate-and-adjust task.]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sub-token splitting | Custom h-layer parser | `HLayerText` in `LayerText.tsx` | Already implemented with multi-fragment offset support |
| Sub-hover state | Custom event system | Zustand `setSubHover` via `subHoverProps` | Already wired in `LayerText.tsx` |
| Atom highlight spec | Custom spec builder | `buildSubHoverSpecs` | Already handles `hAtoms`/`mobileH`; only extend |
| SVG badge cleanup | CSS animation or display:none | `cleanHBadges` with `[data-h-badge]` selector | Consistent with `whiteAtomLabels` cleanup approach; tested pattern |
| H count badge text | Unicode subscripts (H₂) | ASCII digits (`H2`) | SVG `<text>` elements; design handoff uses plain ASCII |

---

## Common Pitfalls

### Pitfall 1: Badge Persistence Across Hover Events

**What goes wrong:** Badge `<text>` elements remain in SVG after hover-out because `highlights.clear()` does NOT remove injected elements — it only re-renders the Ketcher molecule structure.

**Why it happens:** `highlights.clear()` calls `editor.update()` which recreates Ketcher's own SVG elements, but externally injected elements (the badges) survive unless explicitly removed.

**How to avoid:** Always call `cleanHBadges(svgRoot)` before calling `renderHBadges` and on every hover-out path. Use a `data-h-badge="true"` attribute for targeted removal.

**Warning signs:** Badges persist after moving mouse off the sub-token. Test by rapidly hovering different sub-tokens.

### Pitfall 2: Reading SVG Position Before `highlights.create()`

**What goes wrong:** Badge positioned incorrectly or at origin (0,0) because atom elements were read before the SVG was redrawn.

**Why it happens:** `highlights.create()` calls `editor.update()` synchronously, recreating all highlighted atom SVG elements. Reading coordinates before this call means reading stale or non-existent elements.

**How to avoid:** Call `renderHBadges` strictly after `applyKetcherHighlights` returns (it's synchronous). Same rule as `whiteAtomLabels`.

**Warning signs:** Badges appear at (0,0) or offset from actual atom positions.

### Pitfall 3: Badge Not Removed on Layer-Level Hover (No Sub-Token)

**What goes wrong:** User hovers into h-layer chip, then out to another layer. Badges from the last sub-token hover persist because the hook's `hoverIdx !== null` path doesn't call `cleanHBadges`.

**Why it happens:** `cleanHBadges` is only called in the subHover path, not in the general highlight clearing path.

**How to avoid:** Call `cleanHBadges(svgRoot)` at the top of every code path inside the `useEffect` that calls `highlights.clear()`, not just the sub-token path.

### Pitfall 4: Explicit-H Detection on Multi-Fragment Molecules

**What goes wrong:** `hAtomPoolIds.includes(kId)` misses explicit H atoms in non-first fragments because `hAtomPoolIds` is collected from all atoms with `label === 'H'` in `App.tsx`. This should work correctly since pool IDs are unique per session.

**Why it happens:** Not actually a pitfall — the collection in `App.tsx` lines 100–104 uses `forEach` over all molecule atoms, so all explicit H pool IDs are captured regardless of fragment.

**Confidence:** HIGH — verified from `App.tsx` implementation.

---

## Code Examples

### Badge Injection (new `renderHBadges`)

```typescript
// Source: pattern from whiteAtomLabels (src/hooks/useKetcherHighlights.ts lines 40-51)
// and design handoff canvas.jsx lines 196-246

export function renderHBadges(
  svgRoot: Element,
  subHover: SubHover,
  auxMap: AuxMap,
  resolveVarFn: (name: string) => string,
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const isMobile = subHover.kind === 'mobileH';
  const count = subHover.kind === 'hAtoms' ? (subHover.count ?? 1) : null;
  const colorVar = isMobile ? '--c-hydro-mobile'
    : `--c-hydro-${Math.min(count!, 4)}`;
  const fill = resolveVarFn(colorVar);
  const text = isMobile ? 'H?' : count === 1 ? 'H' : `H${count}`;

  for (const canonAtom of subHover.atoms ?? []) {
    const poolId = auxMap[canonAtom];
    if (poolId === undefined) continue;
    const atomEl = svgRoot.querySelector(`[data-atom-id="${poolId}"]`);
    if (!atomEl) continue;

    // Read atom SVG center via parent group bounding box
    const parentGroup = atomEl.closest('g') ?? atomEl;
    const bbox = (parentGroup as SVGGraphicsElement).getBBox?.();
    if (!bbox) continue;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const badge = document.createElementNS(ns, 'text');
    badge.setAttribute('data-h-badge', 'true');
    badge.setAttribute('x', String(cx));
    badge.setAttribute('y', String(cy + 20));
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

export function cleanHBadges(svgRoot: Element): void {
  svgRoot.querySelectorAll('[data-h-badge]').forEach(el => el.remove());
}
```

### Hook Integration

```typescript
// Extension of useKetcherHighlights effect (src/hooks/useKetcherHighlights.ts)
// After applyKetcherHighlights:

const svgRoot = editorAny.render.paper.canvas as Element;
whiteAtomLabels(svgRoot, specs);
// NEW: clear any previous badges, then inject fresh ones if h-layer sub-token active
cleanHBadges(svgRoot);
if (subHover && (subHover.kind === 'hAtoms' || subHover.kind === 'mobileH') && specs.length > 0) {
  renderHBadges(svgRoot, subHover, auxMap, resolveVar);
}

// In the early-return (hoverIdx === null) path and non-spatial layer path:
highlightEditor.highlights.clear();
cleanHBadges(svgRoot);  // NEW: always clean on any clear
return;
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Phase 8 was described as adding `HLayerText`, `SubHover` extension | These already exist from Phases 6–7 | Phase 8 scope is narrowed to badge injection + explicit-H bond path only |
| h-layer hover was all-atoms-at-once | Sub-token granularity now in `HLayerText` | Per-group canonical offsetting already handles multi-fragment |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Atom center (x,y) in Ketcher SVG is readable via `getBBox()` on the parent `<g>` element of `[data-atom-id]` | Code Examples — Badge Injection | If Raphaël encodes position differently, badge will appear at wrong position; needs empirical verification during Wave 0 or Plan 01 |

---

## Open Questions

1. **Atom SVG position read strategy**
   - What we know: `whiteAtomLabels` finds `[data-atom-id]` elements reliably; `highlights.create()` is synchronous
   - What's unclear: Whether `getBBox()` on the parent group or reading `x`/`y` SVG attributes gives the atom center in SVG user-space coordinates
   - Recommendation: In Wave 0 or the first task of Plan 01, add a `console.log` to inspect the live SVG structure of an atom element during highlight; verify and update `renderHBadges` accordingly before writing the main implementation

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — Phase 8 adds no new tools, services, or CLIs).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` (no separate full-suite command) |

Current baseline: 156 tests passing across 11 test files. Phase 8 must keep this baseline green.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INCHI-08-a | `renderHBadges` injects `<text data-h-badge>` elements above each atom | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| INCHI-08-b | `cleanHBadges` removes all `[data-h-badge]` from SVG root | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| INCHI-08-c | Badge lifecycle: inject on subHover set, remove on hover-out | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| INCHI-08-d | `case 'hAtoms'` with explicit H: spec includes H pool ID, heavy atom pool ID, bond ID | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| INCHI-08-e | `case 'hAtoms'` without explicit H (implicit): spec includes heavy atom pool IDs, no bond IDs | unit (regression) | `npm test -- --reporter=verbose` | ✅ existing test at highlightUtils.test.ts |
| INCHI-08-f | `case 'mobileH'`: spec returns correct atoms in `--c-hydro-mobile` | unit (regression) | `npm test -- --reporter=verbose` | ✅ existing test at highlightUtils.test.ts |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green (156 + new tests) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/__tests__/useKetcherHighlights.test.ts` — add tests for `renderHBadges` and `cleanHBadges` (badge text content, data attribute, position calculation, mobile vs fixed-H text)
- [ ] `src/lib/__tests__/highlightUtils.test.ts` — add tests for `case 'hAtoms'` with explicit H in `hAtomPoolIds` (bond lookup path)

---

## Security Domain

Phase 8 adds no authentication, session management, user input processing, or network requests. It is a pure UI/DOM manipulation phase.

ASVS: not applicable — no new input surfaces, no data persistence, no cryptography.

---

## Sources

### Primary (HIGH confidence)

- `src/components/LayerText.tsx` — confirmed `HLayerText` fully implemented with sub-token splitting, `hAtoms`/`mobileH` dispatch
- `src/lib/highlightUtils.ts` — confirmed `buildSubHoverSpecs` cases for `hAtoms`/`mobileH` exist; `struct.bonds.forEach` bond lookup pattern at lines 298–304
- `src/hooks/useKetcherHighlights.ts` — confirmed `whiteAtomLabels` pattern for SVG injection; confirmed cleanup-by-attribute approach
- `src/lib/parseInchi.ts` — confirmed `SubHover` union has `hAtoms` and `mobileH` variants
- `src/store.ts` — confirmed `hAtomPoolIds` field present
- `src/App.tsx` lines 100–104 — confirmed explicit H pool ID collection loop
- `design_handoff_explain_that_inchi/canvas.jsx` lines 196–246 — badge position `y+20`, mobile `H?` italic, fixed-H `H{count}` ASCII text
- `vitest.config.ts` — confirmed test runner, environments, 156 passing tests

### Secondary (MEDIUM confidence)

- `08-UI-SPEC.md` — approved design contract; badge spec: 12px font, weight 500, text-anchor middle, dominant-baseline central, pointer-events none

### Tertiary (LOW confidence)

- A1 in Assumptions Log: `getBBox()` on parent group for atom position — not verified against live Raphaël SVG; needs empirical check during implementation

---

## Metadata

**Confidence breakdown:**
- What is already done: HIGH — confirmed by reading all referenced source files
- What needs building: HIGH — scope is narrow and patterns are established
- SVG badge position: LOW (A1) — needs empirical verification during implementation

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stable project; ketcher@3.12.0 pinned; no moving parts)
