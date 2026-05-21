# Phase 4: Hover-to-Highlight Integration - Research

**Researched:** 2026-05-21
**Domain:** Ketcher 3.12.0 `editor.highlights` API — translating Zustand hover state into canvas atom/bond highlight calls
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Version (`1S`), charge (`q`), proton (`p`) layers: Ketcher canvas stays completely unchanged — no highlights fired. Only the explanation card updates.
- **D-02:** The c-layer highlights the specific bonds described in the connection text (plus endpoint atoms), not just atoms. All other layers highlight atoms only (except t/b/m/s which also tint wedge bonds in the design handoff — but the Ketcher API exposes bond IDs so bond highlighting is available for those too).
- **D-03:** CSS vars must be resolved at runtime via `getComputedStyle(document.documentElement).getPropertyValue('--token-name').trim()`. Never hard-code hex/oklch values. Per-element, per-H-count, and parity colors all use CSS var token names from `layerInfo.ts`.
- **D-04:** Prefer atomic replace if the API supports it. Research confirmed (see below): no atomic replace — only `clear()` + `create()`. The `clear()`+`create()` pattern is the correct approach; single-frame flicker is acceptable.
- **D-05:** Sub-token hover (`subHover` non-null) fully suppresses layer-wide highlights. Only sub-token targeted atoms/bonds are highlighted at strong opacity.
- **D-06:** Highlight architecture at Claude's discretion — `useEffect` in App.tsx, standalone `useKetcherHighlights` hook, or Zustand subscriber. Key constraint: `ketcherRef` lives in App.tsx, never in the store.

### Claude's Discretion

- Exact file location for highlight logic (new hook file vs. co-located in App.tsx)
- How to expose `ketcherRef` to highlight logic if extracted to a hook
- Whether bond highlight IDs are passed directly or require a lookup — **resolved: use `struct.findBondId()`** (see Architecture Patterns below)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INCHI-03 | Hovering a layer chunk highlights the matching atoms and bonds in the Ketcher canvas and dims all other layer chunks | Ketcher `editor.highlights.create()` API verified in `ketcher-react` dist; dimming is already done by InchiSection.tsx via CSS class |
| INCHI-04 | Hovering a sub-token overrides the layer-wide highlight with a targeted highlight, suppressing the layer-wide fallthrough entirely | `subHover` state already set by LayerText.tsx; Phase 4 uses it to select the narrow atom set and call `clear()` + `create()` |
</phase_requirements>

---

## Summary

Phase 4 bridges the Zustand store (`hoverIdx`, `subHover`) to the Ketcher canvas highlight API. The Ketcher editor is accessed via `ketcherRef.current.editor`, which exposes a `highlights` property of type `Highlighter`. The `Highlighter` class has exactly two externally relevant methods: `create(...args: HighlightAttributes[])` and `clear()`. There is no atomic-replace method — the correct pattern is `clear()` followed by `create()`. Each call to `create()` accumulates highlights; `clear()` removes all of them at once.

Atom IDs used by `highlights.create()` are the Ketcher Pool integer keys, which are assigned sequentially starting from 0 when atoms are drawn. These are identical to the 0-based draw-order values stored in `auxMap` (canonical 1-based → Ketcher 0-based). Bond IDs are also Pool integer keys and must be resolved from atom-pair tuples using `ketcher.editor.render.ctab.molecule.findBondId(ketcherAtomId1, ketcherAtomId2)`.

For most layers, the existing `layer.atoms[]` array (canonical 1-based indices) is translated to Ketcher atom IDs via `auxMap[canonicalIdx]`. For the c-layer bonds, canonical atom pairs from `layer.bonds[]` are converted to Ketcher atom IDs via `auxMap`, then the Ketcher bond ID is found with `findBondId`. For m/s layers (enantiomer marker, stereo flag), the atom list must be sourced from the co-present `t` layer's atoms (since `m` and `s` carry no atom list themselves).

**Primary recommendation:** Implement a `useKetcherHighlights` hook that accepts `ketcherRef` and subscribes to the Zustand store. On any change to `hoverIdx` or `subHover`, it calls `clear()` + `create()` with the derived highlight spec.

---

## Standard Stack

### Core (no new dependencies for this phase)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `ketcher-react` | 3.12.0 | `editor.highlights.create()` / `editor.highlights.clear()` API | [VERIFIED: ketcher-react dist/script/editor/highlighter.d.ts] |
| `zustand` | ^5.0.13 | `useInchiStore.subscribe()` or `useInchiStore()` selector hooks | [VERIFIED: src/store.ts] |

No new npm packages required. All functionality is already present in the installed dependencies.

**Installation:** None required.

---

## Architecture Patterns

### Verified Ketcher `highlights` API (3.12.0)

[VERIFIED: `/home/bsmue/code/InChI-vis/node_modules/ketcher-react/dist/script/editor/highlighter.d.ts`]

```typescript
type HighlightAttributes = {
  atoms: number[];          // Ketcher Pool keys (0-based draw-order indices)
  bonds: number[];          // Ketcher bond Pool keys
  rgroupAttachmentPoints: number[];
  color: string;            // Must be a concrete color string — CSS vars NOT accepted
};

class Highlighter {
  getAll(): { id: number; highlight: Highlight }[];
  create(...args: HighlightAttributes[]): void;  // ACCUMULATES — does NOT replace
  clear(): void;                                  // Removes all highlights atomically
}
```

**Access path:** `ketcherRef.current.editor.highlights`

**Critical behavior confirmed:**
- `create()` takes variadic `HighlightAttributes` — you can pass multiple in one call for different colors
- `create()` ADDS to existing highlights — does not replace. Call `clear()` first.
- `clear()` removes ALL highlights in a single action
- Invalid atoms/bonds (not present in struct) are silently filtered by `getValidInputOnly()`
- Color must be a resolved string — CSS var strings (`var(--c-formula)`) are NOT valid; must be resolved to `oklch(...)` or `#rrggbb` first

**Source:** `/home/bsmue/code/InChI-vis/node_modules/ketcher-react/dist/index.js` lines 24740–24805, `fromHighlightCreate` lines 31541–31551.

---

### Pattern 1: Atom ID Translation (canonical → Ketcher Pool key)

[VERIFIED: `src/lib/parseAuxMapping.ts` + Pool implementation in ketcher-core/dist/index.js]

```typescript
// auxMap: canonical 1-based → Ketcher 0-based draw-order (= Pool key)
// Pool keys are assigned sequentially from 0 as atoms are drawn.
// auxMap[canonicalIdx] is exactly the Pool key for highlights.create({ atoms: [...] })

function canonicalToKetcherAtoms(canonicalIndices: number[], auxMap: AuxMap): number[] {
  return canonicalIndices
    .map(c => auxMap[c])
    .filter((id): id is number => id !== undefined);
}
```

---

### Pattern 2: Bond ID Resolution (canonical atom pairs → Ketcher bond Pool key)

[VERIFIED: `ketcher-core/dist/domain/entities/struct.d.ts` `findBondId(begin, end): number | null` + index.js line 7360]

```typescript
// layer.bonds[] contains [canonicalA, canonicalB] pairs
// Both atom IDs must be converted to Ketcher Pool keys via auxMap first,
// then findBondId() returns the bond's Pool key (for highlights.create({ bonds: [...] }))

function canonicalBondsToKetcherBondIds(
  canonicalBondPairs: number[][],
  auxMap: AuxMap,
  struct: Struct        // ketcher.editor.render.ctab.molecule
): number[] {
  const ids: number[] = [];
  for (const [a, b] of canonicalBondPairs) {
    const kA = auxMap[a];
    const kB = auxMap[b];
    if (kA === undefined || kB === undefined) continue;
    const bondId = struct.findBondId(kA, kB);
    if (bondId !== null) ids.push(bondId);
  }
  return ids;
}

// Access the struct:
const struct = ketcherRef.current.editor.render.ctab.molecule;
```

---

### Pattern 3: CSS Variable Resolution at Runtime

[VERIFIED: standard browser API, confirmed requirement per D-03]

```typescript
// Colors MUST be resolved strings — Ketcher's highlight renderer does not
// interpret CSS variable strings. Resolve once and cache.
function resolveVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// Usage:
const formulaColor = resolveVar('--c-formula');       // e.g. "oklch(0.55 0.14 245)"
const connColor    = resolveVar('--c-conn');
const elementColor = (el: string) =>
  resolveVar(['C','H','N','O','S','P','F','Cl','Br','I'].includes(el)
    ? `--c-el-${el}` : '--c-formula');
```

---

### Pattern 4: Clear + Create (stale highlight cleanup)

[VERIFIED: fromHighlightCreate/fromHighlightClear in ketcher-core/dist/index.js lines 31541–31559]

```typescript
// The correct pattern — no atomic replace available:
function applyHighlights(
  editor: Editor,
  specs: HighlightAttributes[]
): void {
  editor.highlights.clear();          // Remove all prior highlights
  if (specs.length > 0) {
    editor.highlights.create(...specs); // Add new highlights (variadic)
  }
}
```

`create()` accumulates; calling `create()` twice without `clear()` produces two independent highlight layers, both visible. Always `clear()` first.

---

### Pattern 5: Layer Highlight Derivation

Per canvas.jsx and D-01 through D-05, the full mapping from layer type to highlight spec:

| Layer | Canvas Action | Atom Source | Color Token | Bond Source |
|-------|---------------|-------------|-------------|-------------|
| `version` | **No highlight** | — | — | — |
| `q` | **No highlight** | — | — | — |
| `p` | **No highlight** | — | — | — |
| `formula` | Halo all heavy atoms | `layer.atoms[]` (all canonical, 1..N) | `elementColor(atomElements[canon])` per atom | — |
| `c` | Halo bond endpoints + highlight bonds | `layer.atoms[]` (from bond endpoint set) | `--c-conn` | `layer.bonds[]` via `findBondId` |
| `h` | Halo atoms per H-count shading | `parseHydrogenAtoms(layer.text)` keys | `hydroColor(count)` → `--c-hydro-{1..4}` or `--c-hydro-mobile` for mobile atoms | — |
| `t` | Halo stereo-center atoms by parity | `parseStereoParities(layer.text)` keys | `parityColor(sign)` → `--c-stereo-{plus|minus}` | — |
| `b` | Halo double-bond stereo atoms by parity | `parseStereoAtoms(layer.text)` | `parityColor(sign)` → `--c-stereo-{plus|minus}` | — |
| `m` | Halo all stereo-center atoms | Read from co-present `t` layer's `parseStereoAtoms()` | `--c-stereo` | — |
| `s` | Halo all stereo-center atoms | Same as `m` — co-present `t` layer | `--c-stereo` | — |
| `i` | **No canvas highlight** | — | — | — |

**Note on `i` layer:** canvas.jsx header comment explicitly groups `q/p/i` as "no canvas highlight (no spatial meaning here)". The enriched `layer.atoms[]` for `i` is always `[]`. Treat like `q`/`p`. [VERIFIED: canvas.jsx line 12]

**Note on `m`/`s` layers:** `layer.atoms[]` is `[]` because the m/s layers carry no atom list. To highlight stereocenters for m/s, find the `t` layer in `layers[]` and call `parseStereoAtoms(tLayer.text)`. If no `t` layer is present, skip highlighting. [VERIFIED: canvas.jsx lines 70–75 — stereoSet for m/s reads from `mol.atoms.filter(a => a.stereo)`; equivalent in our data model is reading from t-layer atoms]

---

### Pattern 6: Sub-token Highlight Rules

When `subHover` is non-null, skip the layer-wide logic entirely. Only atoms/bonds matching the sub-token are highlighted. All use strong opacity (the same `color` value — Ketcher's API does not have an opacity parameter; the CSS halo opacity is a visual effect of the design handoff SVG approach, not the Ketcher API). [VERIFIED: canvas.jsx `subHaloFor()` lines 22–38]

| `subHover.kind` | Atom target | Bond target | Color |
|-----------------|-------------|-------------|-------|
| `element` | `atomElements[canon] === subHover.el` for all atoms in formula layer | — | `elementColor(subHover.el)` |
| `atom` | `auxMap[subHover.canonical]` | Bonds incident to `subHover.canonical` (need all bond IDs where bond.begin or bond.end equals ketcherAtomId) | `--c-conn` |
| `stereo` | `auxMap[subHover.atom]` | — | `parityColor(subHover.sign)` |
| `hAtoms` | `subHover.atoms[]` mapped via `auxMap` | — | `hydroColor(subHover.count)` |
| `mobileH` | `subHover.atoms[]` mapped via `auxMap` | — | `--c-hydro-mobile` |

**For `kind: 'atom'` incident bonds:** Use `struct.bonds.forEach((bond, bid) => ...)` checking `bond.begin === ketcherAtomId || bond.end === ketcherAtomId`. The `findBondId` method only works for a specific pair; to find all incident bonds, iterate the bonds pool. [VERIFIED: bond structure from ketcher-core dist/index.js line 28741–28742 showing `bond.begin` / `bond.end`]

---

### Pattern 7: `useKetcherHighlights` Hook Architecture (Recommended)

[ASSUMED — architecture at Claude's discretion per D-06]

```typescript
// src/hooks/useKetcherHighlights.ts
import { useEffect } from 'react';
import { useInchiStore } from '../store';
import type { Ketcher } from 'ketcher-core';

export function useKetcherHighlights(
  ketcherRef: React.RefObject<Ketcher | null>,
  isReady: boolean
): void {
  const hoverIdx = useInchiStore(s => s.hoverIdx);
  const subHover = useInchiStore(s => s.subHover);
  const layers   = useInchiStore(s => s.layers);
  const auxMap   = useInchiStore(s => s.auxMap);
  const atomElements = useInchiStore(s => s.atomElements);

  useEffect(() => {
    if (!isReady || !ketcherRef.current) return;
    const editor = ketcherRef.current.editor;

    // Always clear first (no atomic replace in Ketcher 3.12.0)
    editor.highlights.clear();

    if (hoverIdx === null) return; // idle — clear only

    const layer = layers[hoverIdx];
    if (!layer) return;

    // Non-spatial layers: no canvas highlight (D-01)
    if (['version', 'q', 'p', 'i'].includes(layer.type)) return;

    const specs = buildHighlightSpecs(layer, subHover, auxMap, atomElements, layers, editor);
    if (specs.length > 0) {
      editor.highlights.create(...specs);
    }
  }, [hoverIdx, subHover, layers, auxMap, atomElements, isReady]);
}
```

**Called in App.tsx:** `useKetcherHighlights(ketcherRef, isReady)` — `ketcherRef` stays in App.tsx, hook only reads it.

---

### Recommended Project Structure (Phase 4 additions)

```
src/
├── hooks/
│   └── useKetcherHighlights.ts   # New — highlight bridge hook
├── lib/
│   └── highlightUtils.ts         # New — buildHighlightSpecs(), resolveColor(), findIncidentBonds()
├── App.tsx                       # Modified — add useKetcherHighlights call
└── (all other files unchanged)
```

---

### Anti-Patterns to Avoid

- **Pass CSS var strings directly to `highlights.create()`:** Ketcher's renderer does not resolve CSS variables. Pass resolved color strings from `getComputedStyle()` only.
- **Call `create()` without `clear()` first:** Each `create()` call adds to the pool. Without `clear()`, switching hover layers accumulates multiple highlight sets simultaneously.
- **Re-use a cached color if CSS variables change:** Resolve CSS vars fresh each time highlights are applied (colors could change if a theme switch is added in Phase 6).
- **Use `useInchiStore.subscribe()` outside React for this hook:** A React `useEffect` with selector-based dependencies is cleaner and correctly ties cleanup to component lifecycle. Zustand subscribe outside React is appropriate for non-React callers, but here the hook IS a React hook.
- **Forget the `isReady` guard:** Ketcher's `editor.highlights` is only safe to call after `onInit` fires. Always gate on `isReady`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atom color lookup | Custom color map | `elementColor()`, `hydroColor()`, `parityColor()` from `src/lib/layerInfo.ts` | Already ported verbatim from design handoff; covers all known elements and edge cases |
| Bond lookup from atom pair | O(n) bond scan | `struct.findBondId(begin, end)` | Built-in bidirectional lookup (`bond.begin===a && bond.end===b || vice versa`) |
| CSS var resolution | Hard-coded hex values | `getComputedStyle(document.documentElement).getPropertyValue(name).trim()` | Keeps color system single-source-of-truth in styles.css |

---

## Common Pitfalls

### Pitfall 1: CSS Variable Strings Passed to Ketcher

**What goes wrong:** `editor.highlights.create({ atoms: [...], color: 'var(--c-formula)' })` silently produces no visible highlight (or a black highlight) because Ketcher's canvas renderer interprets the color as a literal CSS string, not a computed value.

**Why it happens:** The Ketcher Raphael/SVG renderer sets fill/stroke directly, not through the DOM's CSS cascade.

**How to avoid:** Always call `getComputedStyle(document.documentElement).getPropertyValue('--c-formula').trim()` before passing the color. Wrap in a `resolveVar()` utility.

**Warning signs:** Highlights are called without error but atoms show no visible color change.

---

### Pitfall 2: Accumulating Stale Highlights

**What goes wrong:** Rapidly mousing over layers leaves multiple highlight sets — previous layers remain highlighted alongside the new one.

**Why it happens:** `create()` accumulates; it does not replace.

**How to avoid:** Always call `editor.highlights.clear()` at the top of the `useEffect`, before any `create()` call. Even when transitioning to a no-highlight state (non-spatial layer, or `hoverIdx === null`), call `clear()` to remove any prior highlights.

**Warning signs:** ROADMAP success criterion 4 fails — stale highlights accumulate on rapid hover switching.

---

### Pitfall 3: `m`/`s` Layer Has No Atoms

**What goes wrong:** `layers[hoverIdx].atoms` is `[]` for `m` and `s` layer types because `enrichLayers` in `parseInchi.ts` does not populate them (those layers have no atom list in their text).

**Why it happens:** The `m` layer text is just `"0"` or `"1"`; the `s` layer text is just `"1"`, `"2"`, or `"3"`. Neither encodes atom indices.

**How to avoid:** For `m` and `s` layers, find the `t` layer in `layers[]` and call `parseStereoAtoms(tLayer.text)` to get the stereo-center atom list. If no `t` layer exists (no stereocenters), skip highlighting.

**Warning signs:** No canvas highlight when hovering `m` or `s` layer, even though stereocenters are visible.

---

### Pitfall 4: Incorrect `auxMap` Key Type

**What goes wrong:** TypeScript may treat `auxMap[canonicalIdx]` as `number | undefined` when canonical indices are not in the map (e.g., for an empty molecule or mismatched state).

**Why it happens:** `AuxMap = Record<number, number>` — all keys are present only for the current molecule. Stale hover state after molecule re-draw could reference outdated canonical indices.

**How to avoid:** Always filter: `canonicalIndices.map(c => auxMap[c]).filter((id): id is number => id !== undefined)`.

**Warning signs:** Runtime errors or empty highlight arrays when switching molecules quickly.

---

### Pitfall 5: Bond Pool Keys vs. Atom Pool Keys

**What goes wrong:** Confusing atom Pool keys with bond Pool keys. `layer.bonds[]` contains `[canonicalAtomA, canonicalAtomB]` tuples — NOT bond IDs. Those atom indices must be converted to Ketcher atom IDs via `auxMap`, then to a bond ID via `findBondId()`.

**Why it happens:** The naming `layer.bonds[]` sounds like it contains bond IDs, but it contains canonical atom pairs.

**How to avoid:** Always apply the two-step conversion: `canonicalPair → ketcherAtomIds → findBondId()`.

**Warning signs:** No bonds highlighted in the c-layer, or wrong bonds highlighted.

---

### Pitfall 6: `formula` Layer Sub-token `element` — Need `atomElements` Not Just `layer.atoms`

**What goes wrong:** For `subHover.kind === 'element'`, the target atoms are those where `atomElements[canonical] === subHover.el`. The `layer.atoms[]` for the formula layer is `[1..N]` (all atoms), but only a subset have the hovered element symbol.

**How to avoid:** Filter `layer.atoms[]` using `atomElements` from the store. Example: `layer.atoms.filter(c => atomElements[c] === subHover.el)`.

---

## Code Examples

### Complete `buildHighlightSpecs` Logic Skeleton

```typescript
// Source: derived from canvas.jsx subHaloFor() lines 22-38 and layer-wide logic lines 82-115
import type { Layer, SubHover, AuxMap } from '../lib/parseInchi';
import { elementColor, hydroColor, parityColor, parseStereoParities, parseStereoAtoms, parseHydrogenAtoms, parseMobileHydrogens } from '../lib/layerInfo';

type HighlightSpec = { atoms: number[]; bonds: number[]; rgroupAttachmentPoints: number[]; color: string };

function resolveVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildHighlightSpecs(
  layer: Layer,
  subHover: SubHover | null,
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  layers: Layer[],
  editor: Editor  // ketcher.editor
): HighlightSpec[] {
  const struct = editor.render.ctab.molecule;
  const toK = (canonicals: number[]): number[] =>
    canonicals.map(c => auxMap[c]).filter((id): id is number => id !== undefined);

  // Sub-hover mode: only targeted atoms, layer-wide suppressed (D-05)
  if (subHover) {
    return buildSubHoverSpecs(subHover, auxMap, atomElements, layer, struct);
  }

  // Layer-wide mode
  switch (layer.type) {
    case 'formula': {
      // Per-element coloring: group atoms by element, one HighlightSpec per color
      const byColor = new Map<string, number[]>();
      for (const canon of layer.atoms) {
        const el = atomElements[canon];
        const color = resolveVar(elementColor(el ?? '').replace('var(', '').replace(')', ''));
        if (!byColor.has(color)) byColor.set(color, []);
        byColor.get(color)!.push(auxMap[canon] ?? -1);
      }
      return [...byColor.entries()]
        .filter(([, atoms]) => atoms.some(id => id >= 0))
        .map(([color, atoms]) => ({ atoms: atoms.filter(id => id >= 0), bonds: [], rgroupAttachmentPoints: [], color }));
    }

    case 'c': {
      const kAtoms = toK(layer.atoms);
      const kBonds: number[] = [];
      for (const [a, b] of layer.bonds) {
        const kA = auxMap[a], kB = auxMap[b];
        if (kA !== undefined && kB !== undefined) {
          const bid = struct.findBondId(kA, kB);
          if (bid !== null) kBonds.push(bid);
        }
      }
      return [{ atoms: kAtoms, bonds: kBonds, rgroupAttachmentPoints: [], color: resolveVar('--c-conn') }];
    }

    case 'h': {
      const hCounts = parseHydrogenAtoms(layer.text);
      const mobile = new Set(parseMobileHydrogens(layer.text));
      const byColor = new Map<string, number[]>();
      for (const [canonStr, count] of Object.entries(hCounts)) {
        const canon = Number(canonStr);
        const colorVar = hydroColor(count);
        if (!colorVar) continue;
        const color = resolveVar(colorVar.replace('var(', '').replace(')', ''));
        if (!byColor.has(color)) byColor.set(color, []);
        const kid = auxMap[canon];
        if (kid !== undefined) byColor.get(color)!.push(kid);
      }
      const mobileColor = resolveVar('--c-hydro-mobile');
      const mobileAtoms: number[] = [];
      for (const canon of mobile) {
        const kid = auxMap[canon];
        if (kid !== undefined) mobileAtoms.push(kid);
      }
      const specs = [...byColor.entries()].map(([color, atoms]) => ({ atoms, bonds: [], rgroupAttachmentPoints: [], color }));
      if (mobileAtoms.length > 0) specs.push({ atoms: mobileAtoms, bonds: [], rgroupAttachmentPoints: [], color: mobileColor });
      return specs;
    }

    case 't': {
      const parities = parseStereoParities(layer.text);
      const plusAtoms: number[] = [], minusAtoms: number[] = [];
      for (const [canonStr, sign] of Object.entries(parities)) {
        const kid = auxMap[Number(canonStr)];
        if (kid === undefined) continue;
        (sign === '+' ? plusAtoms : minusAtoms).push(kid);
      }
      const specs: HighlightSpec[] = [];
      if (plusAtoms.length > 0) specs.push({ atoms: plusAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar('--c-stereo-plus') });
      if (minusAtoms.length > 0) specs.push({ atoms: minusAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar('--c-stereo-minus') });
      return specs;
    }

    case 'b': {
      // Same parity coloring as t-layer but for double-bond stereo atoms
      const parities = parseStereoParities(layer.text);
      const plusAtoms: number[] = [], minusAtoms: number[] = [];
      for (const [canonStr, sign] of Object.entries(parities)) {
        const kid = auxMap[Number(canonStr)];
        if (kid === undefined) continue;
        (sign === '+' ? plusAtoms : minusAtoms).push(kid);
      }
      const specs: HighlightSpec[] = [];
      if (plusAtoms.length > 0) specs.push({ atoms: plusAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar('--c-stereo-plus') });
      if (minusAtoms.length > 0) specs.push({ atoms: minusAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar('--c-stereo-minus') });
      return specs;
    }

    case 'm':
    case 's': {
      // Stereo-center atoms come from the co-present t-layer (m/s have no atom list of their own)
      const tLayer = layers.find(l => l.type === 't');
      if (!tLayer) return [];
      const stereoAtoms = parseStereoAtoms(tLayer.text);
      const kAtoms = toK(stereoAtoms);
      return kAtoms.length > 0
        ? [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar('--c-stereo') }]
        : [];
    }

    default:
      return []; // version, q, p, i — no canvas highlight
  }
}
```

### Sub-hover Specs Builder

```typescript
// Source: canvas.jsx subHaloFor() lines 22-38 and bond incident check lines 138-145
function buildSubHoverSpecs(
  subHover: SubHover,
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  layer: Layer,
  struct: ReturnType<typeof editor.render.ctab.molecule>
): HighlightSpec[] {
  switch (subHover.kind) {
    case 'element': {
      const el = subHover.el!;
      const matching = layer.atoms
        .filter(c => atomElements[c] === el)
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);
      const colorVar = elementColor(el).replace('var(', '').replace(')', '');
      return matching.length > 0
        ? [{ atoms: matching, bonds: [], rgroupAttachmentPoints: [], color: resolveVar(colorVar) }]
        : [];
    }

    case 'atom': {
      const kAtomId = auxMap[subHover.canonical!];
      if (kAtomId === undefined) return [];
      // Find all bonds incident to this atom
      const incidentBonds: number[] = [];
      struct.bonds.forEach((bond, bid) => {
        if (bond.begin === kAtomId || bond.end === kAtomId) incidentBonds.push(bid);
      });
      return [{ atoms: [kAtomId], bonds: incidentBonds, rgroupAttachmentPoints: [], color: resolveVar('--c-conn') }];
    }

    case 'stereo': {
      const kAtomId = auxMap[subHover.atom!];
      if (kAtomId === undefined) return [];
      const colorVar = parityColor(subHover.sign!).replace('var(', '').replace(')', '');
      return [{ atoms: [kAtomId], bonds: [], rgroupAttachmentPoints: [], color: resolveVar(colorVar) }];
    }

    case 'hAtoms': {
      const kAtoms = (subHover.atoms ?? []).map(c => auxMap[c]).filter((id): id is number => id !== undefined);
      const colorVar = (hydroColor(subHover.count!) ?? 'var(--c-hydro-1)').replace('var(', '').replace(')', '');
      return kAtoms.length > 0
        ? [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar(colorVar) }]
        : [];
    }

    case 'mobileH': {
      const kAtoms = (subHover.atoms ?? []).map(c => auxMap[c]).filter((id): id is number => id !== undefined);
      return kAtoms.length > 0
        ? [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVar('--c-hydro-mobile') }]
        : [];
    }

    default:
      return [];
  }
}
```

---

## Runtime State Inventory

Not applicable — this is a greenfield phase adding new logic. No rename/refactor/migration work involved.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | For `m`/`s` layers, using the co-present `t` layer's atoms is the correct equivalent of canvas.jsx's `mol.atoms.filter(a => a.stereo)` | Architecture Patterns Pattern 5 | If a molecule has stereocenters from `s` without a `t` layer, no atoms are highlighted — but this is an edge case the original design handoff also handles imperfectly |
| A2 | `useKetcherHighlights` as a React hook with `useEffect` is the appropriate architecture | Pattern 7 | Acceptable alternative: Zustand subscriber outside React. Either works; hook is cleaner for testing. |

**If this table is empty:** Not the case — A1 and A2 require planner awareness.

---

## Open Questions

1. **`i` (isotope) layer — canvas.jsx vs. UI-SPEC inconsistency**
   - What we know: canvas.jsx groups `q/p/i` as "no canvas highlight (no spatial meaning here)". The UI-SPEC table lists `i` as "Halo isotope-labeled atoms" with `var(--c-isotope)`. However, `enrichLayers` in parseInchi.ts returns `atoms: []` for `i` layers because they have no atom list parsing implemented.
   - What's unclear: Whether Phase 4 should implement isotope atom parsing and highlighting, or treat `i` as no-highlight per canvas.jsx.
   - Recommendation: Follow canvas.jsx (the explicit behavioral spec, per D-02) — treat `i` as no canvas highlight. If isotope highlighting is desired, that's a separate enrichment task in `parseInchi.ts` that would need a companion plan.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies beyond the project's own installed packages (ketcher-react 3.12.0 already in node_modules; no new installs needed).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INCHI-03 | Layer hover clears old highlights and fires new ones for the correct atoms | unit | `npx vitest run src/hooks/__tests__/useKetcherHighlights.test.ts -x` | ❌ Wave 0 |
| INCHI-03 | Formula layer: atoms grouped by element, per-element color applied | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-03 | c-layer: atoms from bond endpoints + bond IDs from findBondId | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-03 | h-layer: atoms grouped by H-count with correct color | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-03 | m/s layer: atoms sourced from co-present t-layer | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-03 | Non-spatial layers (version, q, p, i): returns empty specs | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-04 | subHover element kind: only atoms of matching element highlighted | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-04 | subHover atom kind: atom + all incident bonds highlighted | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |
| INCHI-04 | subHover stereo/hAtoms/mobileH kinds: correct atoms + colors | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ Wave 0 |

**Note:** `useKetcherHighlights` tests require mocking `ketcherRef` and the store. The highlight logic itself (`buildHighlightSpecs`, `buildSubHoverSpecs`) is pure and easily unit-testable in Node — extract to `highlightUtils.ts` for full unit coverage.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/highlightUtils.test.ts` — covers `buildHighlightSpecs` for all layer types (INCHI-03, INCHI-04)
- [ ] `src/hooks/__tests__/useKetcherHighlights.test.ts` — covers hook lifecycle (clear on leave, guard on isReady)
- [ ] `src/lib/highlightUtils.ts` — extract pure functions so they are testable in Node (no browser globals needed for the logic)

*(Existing test infrastructure: `vitest.config.ts` present, `environment: 'node'` configured, existing test files prove the pattern)*

---

## Security Domain

Phase 4 adds no new input surfaces, no API calls, no user-provided data processed into the DOM. The only new operation is passing resolved CSS color strings and integer atom/bond indices to `editor.highlights.create()`. No ASVS categories are materially affected.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | No — all inputs are derived from already-parsed InChI data (store values), not raw user text | — |
| V6 Cryptography | No | — |
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |

---

## Sources

### Primary (HIGH confidence)

- `ketcher-react@3.12.0` dist files — `dist/script/editor/highlighter.d.ts`: `Highlighter.create()` / `Highlighter.clear()` signatures
- `ketcher-react@3.12.0` dist files — `dist/index.js` lines 24740–24805: `Highlighter` implementation, `getValidInputOnly` atom/bond validation
- `ketcher-core@3.12.0` dist files — `dist/application/editor/operations/highlight.d.ts`: `HighlightAdd`, `HighlightDelete`, `HighlightUpdate` operations
- `ketcher-core@3.12.0` dist files — `dist/domain/entities/highlight.d.ts`: `HighlightAttributes` shape
- `ketcher-core@3.12.0` dist files — `dist/index.js` lines 31541–31559: `fromHighlightCreate` / `fromHighlightClear` — confirmed ACCUMULATE / CLEAR-ALL behavior
- `ketcher-core@3.12.0` dist files — `dist/domain/entities/pool.d.ts` + index.js line 6741: Pool auto-increment key assignment from 0
- `ketcher-core@3.12.0` dist files — `dist/domain/entities/struct.d.ts` line 82: `findBondId(begin, end): number | null`
- `design_handoff_explain_that_inchi/canvas.jsx` — behavioral spec for all layer types, sub-hover logic
- `src/store.ts`, `src/App.tsx`, `src/lib/parseInchi.ts`, `src/lib/layerInfo.ts` — confirmed existing data shapes

### Secondary (MEDIUM confidence)

- Pool key assignment verified via constructor in index.js line 6750 (`nextId: 0`) and `add()` line 6756 (`var id = this.nextId++`)

---

## Metadata

**Confidence breakdown:**

- Ketcher highlights API: HIGH — verified directly from installed 3.12.0 dist files
- Atom/bond ID translation: HIGH — verified Pool implementation and auxMap contract
- clear+create pattern: HIGH — verified fromHighlightCreate / fromHighlightClear source
- Layer-to-highlight mapping: HIGH — canvas.jsx is the behavioral spec; verified against parseInchi.ts data shapes
- Hook architecture (D-06): MEDIUM (ASSUMED A2) — pattern is sound but specific file organization is at Claude's discretion

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (ketcher-react 3.12.0 is pinned; API will not change without a package version bump)
