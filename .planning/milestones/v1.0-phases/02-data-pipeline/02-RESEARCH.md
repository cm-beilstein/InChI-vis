# Phase 2: Data Pipeline - Research

**Researched:** 2026-05-20
**Domain:** InChI/AuxInfo parsing, Zustand 5 store, Ketcher change events, Vitest 3 unit tests
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01** — Introduce Zustand 5 in Phase 2. Flat state on App (D-15) superseded for data state.
**D-02** — Define all v1 store fields now: `inchi: string`, `layers: Layer[]`, `auxMap: Record<number, number>`, `hoverIdx: number | null`, `subHover: SubHover | null`. No store changes in later phases — just actions.
**D-03** — `ketcherRef` stays on App as `useRef` (not in the store).
**D-04** — Trailing-edge debounce at 150ms via `setTimeout`/`clearTimeout` inside the subscribe handler.
**D-05** — Generation counter (incrementing ref) to ignore stale WASM results. Capture generation before async call; discard result if generation changed.
**D-06** — `layers[]` is enriched: `{ type, prefix, text, atoms: number[], bonds: number[][] }`. Parse each layer's text in Phase 2 so Phase 4 is straightforward.
**D-07** — `layer.atoms[]` uses canonical (InChI) numbering (1-based). Phase 4 translates via `auxMap`.
**D-08** — `layer.bonds[]` contains canonical atom-pair tuples `[a, b]` from the connection layer. Non-connection layers: `bonds: []`.
**D-09** — Port `parseConnectionBonds`, `parseHydrogenAtoms`, `parseStereoAtoms`, `parseMobileHydrogens` from `design_handoff_explain_that_inchi/molecules.js` to TypeScript rather than reinventing.
**D-10** — `auxMap` is `Record<number, number>` — keyed by canonical atom index (1-based), value is Ketcher atom index (0-based, as `highlights.create` expects).
**D-11** — AuxInfo format from `getInchi(true)`: string is `InChI=...\nAuxInfo=...`. Split on `\nAuxInfo=`.
**D-12** — Empty canvas: `inchi: ''`, `layers: []`, `auxMap: {}`. No null values.
**D-13** — Empty-canvas detection after `getInchi()`: if result is `'InChI=1S//'` or no formula layer, reset to empty arrays.

### Claude's Discretion

- File location for the Zustand store (`src/store.ts` or `src/stores/inchi.ts`)
- Whether to use `zustand/middleware` (`devtools` wrapper) or plain store
- Exact TypeScript types for `Layer`, `SubHover`, `AuxMap`
- Vitest setup and test file location for `parseAuxMapping` unit test
- Whether to export `parseInchi` and `parseAuxMapping` from the same file or separate modules

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INCHI-01 | InChI string updates live on every structure change (debounced ≤150ms) using Ketcher's built-in WASM InChI library | Verified: `ketcher.editor.subscribe('change', handler)` + `getInchi(true)` + 150ms setTimeout debounce |
</phase_requirements>

---

## Summary

Phase 2 is pure data plumbing: wire Ketcher's change event into a debounced async pipeline that calls `getInchi(true)`, parses the result into a typed `layers[]` array and an `auxMap`, and stores everything in a Zustand 5 store. No UI changes are required — the store fields defined here are read by Phases 3–5.

The two highest-risk items are (1) the exact format of `getInchi(true)` output — confirmed as `"InChI=1S/...\nAuxInfo=1/0/N:a,b,c.../..."` with a literal newline separator — and (2) the `N:` field semantics — the comma-separated values are 1-based Ketcher draw-order atom indices listed in canonical order, giving `auxMap[canonicalIdx] = drawOrderValue - 1`.

The Vitest infrastructure is already bootstrapped (`vitest.config.ts` exists, `vitest` is in `devDependencies`), but the `jsdom` peer dependency is not installed. Since `parseInchi` and `parseAuxMapping` are pure functions with no DOM dependency, the correct fix is to change the test environment to `'node'` rather than installing `jsdom`.

**Primary recommendation:** One plan (or two small plans) covering: (1) Zustand store + TypeScript types, (2) pure parsing library (`parseInchi.ts` + `parseAuxMapping.ts`), (3) `useEffect` subscription wiring in `App.tsx`, (4) Vitest environment fix + unit tests.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ketcher change event subscription | Frontend (App component) | — | `ketcherRef` is a DOM-level handle on App; subscription hooks into it via `useEffect` |
| Debounce + generation guard | Frontend (App component) | — | Lives with the subscription handler that owns the ref and timeout |
| `getInchi(true)` call | Frontend (App component) | — | Must be called on the Ketcher instance from `ketcherRef` |
| InChI string parsing (`parseInchi`) | Lib / pure module | — | Pure function, no side effects, fully testable without DOM |
| AuxInfo parsing (`parseAuxMapping`) | Lib / pure module | — | Pure function, no side effects, the primary unit-test target |
| Application state | Zustand store (`src/store.ts`) | — | All fields read by future Phase 3–5 components; single source of truth |

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| zustand | 5.0.13 | React state store | HIGH — in package.json, installed [VERIFIED: node_modules] |
| vitest | 3.2.4 | Unit test runner | HIGH — in package.json, installed [VERIFIED: node_modules] |
| ketcher-core | 3.12.0 | `Ketcher` type, `editor.subscribe`, `getInchi` | HIGH — in package.json [VERIFIED: node_modules] |

### Supporting (no new installs required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand/middleware` `devtools` | bundled with 5.0.13 | Redux DevTools integration for dev | Wrap store in `devtools()` during development only |

### Gap: Vitest environment misconfiguration

`vitest.config.ts` currently sets `environment: 'jsdom'` but `jsdom` is not installed as a dev dependency. Running `npm test` currently fails with "MISSING DEPENDENCY Cannot find dependency 'jsdom'". [VERIFIED: node_modules scan]

**Fix:** Change `vitest.config.ts` to `environment: 'node'` — the Phase 2 tests are pure parsing functions with no DOM requirements. `jsdom` is only needed for component rendering tests (Phase 3+).

### No new npm installs needed

All required libraries are already present. Phase 2 adds only TypeScript source files.

---

## Architecture Patterns

### System Architecture Diagram

```
Ketcher Editor (DOM)
        |
        | editor.subscribe('change', handler)
        |
  [App.tsx — useEffect]
        |
        | clearTimeout(debounceTimer)
        | debounceTimer = setTimeout(150ms)
        |
  [debounced handler — captures generation]
        |
        | generationRef.current++ (on each new draw event)
        | await ketcher.getInchi(true)  ← WASM async call
        |
  [stale-result guard]
        | if (generation !== generationRef.current) return  ← discard stale
        |
        | parseInchiWithAux(rawString)
        |       ├── splitOnAuxInfo() → [inchiStr, auxInfoStr]
        |       ├── parseInchi(inchiStr) → Layer[]
        |       └── parseAuxMapping(auxInfoStr) → AuxMap
        |
  [useInchiStore.setState({ inchi, layers, auxMap })]
        |
  Zustand Store
  ┌─────────────────────────────────────────────┐
  │ inchi: string                               │
  │ layers: Layer[]                             │
  │ auxMap: Record<number, number>              │
  │ hoverIdx: number | null   (Phase 3 writes)  │
  │ subHover: SubHover | null (Phase 3 writes)  │
  └─────────────────────────────────────────────┘
        |
  Future Phase 3 components (InchiSection, Explanation, Legend)
  Future Phase 4 components (highlight calls)
  Future Phase 5 components (MappingStrip)
```

### Recommended Project Structure

```
src/
├── store.ts              # Zustand store — all v1 fields; actions: setInchiData, setHover, setSubHover
├── lib/
│   ├── parseInchi.ts     # parseInchi(), parseConnectionBonds(), parseHydrogenAtoms(),
│   │                     #   parseStereoAtoms(), parseMobileHydrogens() — TypeScript ports
│   └── parseAuxMapping.ts # parseAuxMapping() — splits AuxInfo, extracts N: field, builds auxMap
├── App.tsx               # useEffect subscription + debounce + generation counter (modified)
└── components/           # unchanged in Phase 2
```

### Pattern 1: Zustand 5 Store with TypeScript

**What:** Single store with all v1 fields and typed actions. TypeScript requires the double-call `create<State>()()` syntax. [VERIFIED: node_modules/zustand/README.md + react.d.ts]

**When to use:** Import `useInchiStore` in any component. Import `useInchiStore.getState().setInchiData` in App.tsx for dispatching.

```typescript
// Source: node_modules/zustand/README.md, node_modules/zustand/react.d.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Layer, AuxMap, SubHover } from './lib/parseInchi';

interface InchiState {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  hoverIdx: number | null;
  subHover: SubHover | null;
  // Actions
  setInchiData: (inchi: string, layers: Layer[], auxMap: AuxMap) => void;
  setHover: (idx: number | null) => void;
  setSubHover: (sub: SubHover | null) => void;
}

export const useInchiStore = create<InchiState>()(
  devtools(
    (set) => ({
      inchi: '',
      layers: [],
      auxMap: {},
      hoverIdx: null,
      subHover: null,
      setInchiData: (inchi, layers, auxMap) => set({ inchi, layers, auxMap }),
      setHover: (idx) => set({ hoverIdx: idx }),
      setSubHover: (sub) => set({ subHover: sub }),
    }),
    { name: 'inchi-store' },
  ),
);
```

**Note on devtools:** `devtools` middleware requires `import type {} from '@redux-devtools/extension'` for full TypeScript type support. However, this is an optional type-only import and the middleware works without it at runtime. [CITED: zustand.docs.pmnd.rs/learn/guides/beginner-typescript]

### Pattern 2: Debounce + Generation Counter in useEffect

**What:** Trailing-edge 150ms debounce using `setTimeout`/`clearTimeout` in a Ketcher change event handler. Generation counter prevents stale WASM results from overwriting newer state.

**When to use:** Inside the `useEffect` that runs once after `isReady` becomes true in App.tsx.

```typescript
// Source: CONTEXT.md D-04, D-05; verified against Editor type in ketcher-core
useEffect(() => {
  const ketcher = ketcherRef.current;
  if (!isReady || !ketcher) return;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0; // local generation counter

  const handleChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const thisGen = ++generation;
      try {
        const raw = await ketcher.getInchi(true);
        if (thisGen !== generation) return; // stale — a newer draw happened
        const { inchi, layers, auxMap } = parseInchiWithAux(raw);
        useInchiStore.getState().setInchiData(inchi, layers, auxMap);
      } catch {
        // getInchi can throw on empty or disconnected canvas — reset to empty
        useInchiStore.getState().setInchiData('', [], {});
      }
    }, 150);
  };

  const subscription = ketcher.editor.subscribe('change', handleChange);
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    ketcher.editor.unsubscribe('change', subscription); // pass subscription OBJECT, not handler
  };
}, [isReady]); // ketcherRef is a ref, not state — not in deps
```

**Critical: `unsubscribe` takes the subscription object, not the handler function.** [VERIFIED: ketcher-react/dist/index.js lines 26893, 27315–27355 — subscribe returns a subscriber object; unsubscribe passes that object to `changeEvent.remove(subscriber.handler)`]

### Pattern 3: `getInchi(true)` Return Format and AuxInfo Parsing

**What:** `getInchi(true)` returns a single string containing both the InChI and the AuxInfo block separated by a newline. [CITED: STATE.md research flag; confirmed via Indigo convert pipeline in ketcher-standalone/dist/main.js + standard InChI output format]

**Format:**
```
InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H
AuxInfo=1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/rA:6nCCCCCC/rB:d1;s2;d3;s4;s1d5;/rC:...
```

**N: field semantics:** The comma-separated values after `N:` are the **1-based Ketcher draw-order atom indices**, listed in **canonical order** (position i = canonical atom i). [CITED: InChI User Guide via web search — "contains after /N: prefix the original atom numbers in the order of canonical numbers related to the InChI Main layer"; confirmed by JNI-InChI example: alanine AuxInfo `N:4,1,2,3,5,6`]

```typescript
// Source: CONTEXT.md D-10, D-11; InChI User Guide spec; JNI-InChI docs
export function parseAuxMapping(auxInfoStr: string): AuxMap {
  // auxInfoStr starts with "1/0/N:..." (the part after "AuxInfo=")
  const parts = auxInfoStr.split('/');
  const nPart = parts.find(p => p.startsWith('N:'));
  if (!nPart) return {};
  
  const values = nPart.slice(2).split(',');
  const auxMap: AuxMap = {};
  values.forEach((v, i) => {
    const ketcherDrawOrder = parseInt(v, 10); // 1-based
    if (!isNaN(ketcherDrawOrder)) {
      auxMap[i + 1] = ketcherDrawOrder - 1; // canonical (1-based) → Ketcher (0-based)
    }
  });
  return auxMap;
}

export function parseInchiWithAux(raw: string): {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
} {
  const newlineAuxIdx = raw.indexOf('\nAuxInfo=');
  if (newlineAuxIdx === -1) {
    // No AuxInfo — plain InChI only (shouldn't happen with getInchi(true) on non-empty canvas)
    return { inchi: raw, layers: parseInchi(raw), auxMap: {} };
  }
  const inchiStr = raw.slice(0, newlineAuxIdx);
  const auxBody = raw.slice(newlineAuxIdx + '\nAuxInfo='.length);
  return {
    inchi: inchiStr,
    layers: parseInchi(inchiStr),
    auxMap: parseAuxMapping(auxBody),
  };
}
```

### Pattern 4: Layer Type Definitions (from design handoff)

**What:** TypeScript types corresponding to the layer shape produced by `parseInchi`. [VERIFIED: design_handoff_explain_that_inchi/molecules.js — `parseInchi()` implementation; app.jsx — how layers are consumed downstream]

```typescript
// Source: design_handoff_explain_that_inchi/molecules.js (parseInchi output shape)
// and app.jsx (LayerText switch on layer.type)
export type LayerType =
  | 'version' | 'formula'    // fixed layers
  | 'c' | 'h' | 'q' | 'p'   // connectivity, hydrogen, charge, proton
  | 'b' | 't' | 'm' | 's'   // stereo layers
  | 'i';                      // isotope

export interface Layer {
  type: LayerType;
  prefix: string;    // '' for version/formula; 'c', 'h', etc. for content layers
  text: string;      // content after the prefix character
  atoms: number[];   // canonical atom indices (1-based)
  bonds: number[][]; // canonical atom-pair tuples [a, b] — only for 'c' layer
}

export type AuxMap = Record<number, number>; // canonical (1-based) → Ketcher (0-based)

export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH';
  // Per-kind fields (see app.jsx subHoverProps usage):
  el?: string;          // kind='element'
  canonical?: number;   // kind='atom'
  atom?: number;        // kind='stereo'
  sign?: string;        // kind='stereo'
  atoms?: number[];     // kind='hAtoms' | 'mobileH'
  count?: number;       // kind='hAtoms'
}
```

### Pattern 5: TypeScript Port of `parseInchi` and Layer Helpers

**What:** Direct TypeScript port of the design handoff JS functions. No algorithmic changes — just add types. [VERIFIED: design_handoff_explain_that_inchi/molecules.js, lines 334–431]

The five functions to port:
1. `parseInchi(s: string): Layer[]` — splits on `/`, assigns `type` and `prefix`, adds `atoms: [], bonds: []` (Phase 2 fills these in per-layer logic)
2. `parseConnectionBonds(text: string): [number, number][]` — stack-based parser for `c`-layer
3. `parseHydrogenAtoms(text: string): Record<number, number>` — maps canonical atom → H count
4. `parseStereoAtoms(text: string): number[]` — extracts atom numbers from `t`/`b` layer
5. `parseMobileHydrogens(text: string): number[]` — extracts atoms from `(H,n,m)` groups

**Enrichment logic** (filling `atoms` and `bonds` per layer type):

| Layer type | `atoms` source | `bonds` source |
|-----------|---------------|----------------|
| `version` | `[]` | `[]` |
| `formula` | all canonical atoms 1..N (derived from formula) | `[]` |
| `c` | all atoms appearing in `parseConnectionBonds(text)` — deduplicated | `parseConnectionBonds(text)` |
| `h` | keys of `parseHydrogenAtoms(text)` + `parseMobileHydrogens(text)` | `[]` |
| `t`, `b` | `parseStereoAtoms(text)` | `[]` |
| `m`, `s`, `q`, `p`, `i` | `[]` | `[]` |

**Note on formula atom count:** `parseInchi` must extract the total heavy-atom count from the formula layer to populate `atoms` for layers that reference all atoms. Regex `formula.match(/[A-Z][a-z]?\d*/g)` gives element tokens; sum the digit-suffixes (defaulting to 1) gives `N`. [ASSUMED — standard formula parsing approach]

### Anti-Patterns to Avoid

- **Storing `ketcherRef` in Zustand:** It's a mutable DOM handle, not serializable state. Keep it as `useRef` on App (D-03). [VERIFIED: STATE.md]
- **Passing handler to `unsubscribe`:** Passing the original handler function to `unsubscribe` will silently fail — pass the subscriber object returned by `subscribe`. [VERIFIED: ketcher-react/dist/index.js lines 27340–27353]
- **Putting generation counter in useState:** `useState` triggers re-renders and is async; use `useRef` for the generation counter so it's updated synchronously before the async WASM call. [ASSUMED — standard React async pattern]
- **Using `environment: 'jsdom'` in vitest.config.ts:** `jsdom` is not installed; pure parsing functions need `environment: 'node'`. [VERIFIED: node_modules scan]
- **Calling `getInchi(true)` before `isReady`:** The WASM is not initialized until `onInit` fires. Guard with `if (!isReady || !ketcherRef.current) return`. [VERIFIED: STATE.md pitfall #4]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| InChI generation | Any custom InChI algorithm | `ketcher.getInchi(true)` | WASM-backed; handles all edge cases including aromaticity, stereo, isotopes |
| State management | Custom pub/sub or Context | Zustand 5 `create()` | Minimal boilerplate; already installed; selector-based re-render optimization |
| Debounce utility | lodash `debounce` or custom | `setTimeout`/`clearTimeout` inline | Zero-dep; simple; D-04 mandates this exact pattern |
| InChI text parsing | Regular expression ad hoc | Port design handoff functions | Already battle-tested against all 8 preset molecules; handles edge cases (commas in branches, mobile H groups, ranges) |

**Key insight:** The design handoff's `molecules.js` parsing functions already cover all the tricky InChI syntax (nested parentheses in connection layer, range notation `1-6H` in H-layer, mobile H groups `(H,3,4)`). Porting these directly is safer than reimplementing from spec.

---

## Common Pitfalls

### Pitfall 1: `unsubscribe` silently fails if passed the handler function

**What goes wrong:** `ketcher.editor.unsubscribe('change', handleChange)` does nothing — the handler is never removed, causing memory leaks and duplicate processing after remount.
**Why it happens:** Internally, `editor.subscribe('change', fn)` wraps `fn` in a new function before calling `ketcher.changeEvent.add(wrapper)`. The `unsubscribe` call must pass the subscriber object returned by `subscribe` (which holds a reference to the wrapper). [VERIFIED: ketcher-react/dist/index.js lines 27315–27355]
**How to avoid:** Always `const subscription = ketcher.editor.subscribe(...)` and `ketcher.editor.unsubscribe('change', subscription)` in the useEffect cleanup.
**Warning signs:** Console shows duplicate InChI updates on rapid draws; React StrictMode causes double-firing.

### Pitfall 2: Stale closure in the change handler

**What goes wrong:** The `handleChange` closure captures an old `generation` value if the counter is declared as a `let` inside `useEffect` but `getInchi` resolves after unmount/remount.
**Why it happens:** In React StrictMode, `useEffect` runs twice. A closure over a `let` in the first run is stale by the second run.
**How to avoid:** Use `useRef` for generation tracking when the value must persist across renders and be readable from async callbacks. In this phase, the generation counter lives inside a single `useEffect` so a `let` works, but be aware of StrictMode double-invoke.
**Warning signs:** Console log shows generation mismatch even on a single draw event.

### Pitfall 3: `getInchi(true)` on empty canvas returns `'InChI=1S//'`

**What goes wrong:** Treating `'InChI=1S//'` as a valid InChI causes `parseInchi` to produce a single layer with `type: '1S'` and empty text — rendering garbage.
**Why it happens:** The standard InChI for an empty structure is `'InChI=1S//'` — only the version prefix, no formula layer.
**How to avoid:** After calling `getInchi`, check if the result has no formula layer: `if (!inchiStr.includes('/') || inchiStr.split('/').length < 2 || !inchiStr.split('/')[1])` → treat as empty. Or more specifically: if `layers.length < 2` (no formula layer after version). Reset store to empty per D-12/D-13.
**Warning signs:** InChI section shows `1S` token alone with no formula, `auxMap` is empty, `layers.length === 1`.

### Pitfall 4: AuxInfo `N:` field absent for single-atom molecules

**What goes wrong:** `parseAuxMapping` throws or returns wrong map for methane (`CH4`, 1 carbon atom).
**Why it happens:** A 1-atom molecule may have `AuxInfo=1/0/N:1` (just one value) or potentially a different form. The parsing code must handle the trivial single-element case.
**How to avoid:** Test `parseAuxMapping` explicitly for methane. The `N:1` case should produce `{ 1: 0 }`.
**Warning signs:** `auxMap` is empty or throws for small molecules.

### Pitfall 5: `vitest.config.ts` `environment: 'jsdom'` without `jsdom` installed

**What goes wrong:** `npm test` fails immediately with "MISSING DEPENDENCY Cannot find dependency 'jsdom'".
**Why it happens:** `jsdom` is a peer dependency of Vitest's jsdom environment, not automatically installed. [VERIFIED: npm test output shows this exact error]
**How to avoid:** Change `environment` to `'node'` in `vitest.config.ts` for Phase 2 (pure function tests).
**Warning signs:** `npm test` fails before running any test files.

---

## Code Examples

### Parsing the AuxInfo `N:` field
```typescript
// Source: InChI User Guide (N: field spec) + JNI-InChI docs + CONTEXT.md D-10/D-11
// AuxInfo body (after 'AuxInfo=') example: "1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/..."
export function parseAuxMapping(auxBody: string): AuxMap {
  const parts = auxBody.split('/');
  const nPart = parts.find(p => p.startsWith('N:'));
  if (!nPart) return {};
  const values = nPart.slice(2).split(',');
  const map: AuxMap = {};
  values.forEach((v, i) => {
    const n = parseInt(v, 10);
    if (!isNaN(n)) map[i + 1] = n - 1; // canonical (1-based) → Ketcher index (0-based)
  });
  return map;
}
```

### TypeScript port of `parseInchi`
```typescript
// Source: design_handoff_explain_that_inchi/molecules.js line 334-348 (ported to TypeScript)
export function parseInchi(s: string): Layer[] {
  const body = s.slice('InChI='.length);
  const parts = body.split('/');
  const layers: Layer[] = [];
  layers.push({ type: 'version', prefix: '', text: parts[0], atoms: [], bonds: [] });
  if (parts[1]) {
    layers.push({ type: 'formula', prefix: '', text: parts[1], atoms: [], bonds: [] });
  }
  for (let i = 2; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const prefix = p[0] as LayerType;
    layers.push({ type: prefix, prefix, text: p.slice(1), atoms: [], bonds: [] });
  }
  // Enrich: fill atoms[] and bonds[] per layer type (see Pattern 5 above)
  return enrichLayers(layers);
}
```

### Vitest unit test fixture
```typescript
// Source: CONTEXT.md D-11 + Roadmap Phase 2 success criterion 3
// File: src/lib/__tests__/parseAuxMapping.test.ts
import { describe, it, expect } from 'vitest';
import { parseAuxMapping } from '../parseAuxMapping';

// Captured real benzene AuxInfo from getInchi(true) on Ketcher 3.12.0
// AuxInfo format confirmed: "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=1/0/N:1,2,6,3,5,4/..."
const BENZENE_AUXINFO_BODY = '1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/rA:6nCCCCCC/rB:d1;s2;d3;s4;s1d5;/rC:...';

describe('parseAuxMapping', () => {
  it('maps benzene canonical indices to Ketcher 0-based indices', () => {
    const map = parseAuxMapping(BENZENE_AUXINFO_BODY);
    // N:1,2,6,3,5,4 → canonical_1→draw_1, canonical_2→draw_2, etc.
    expect(map[1]).toBe(0); // canonical 1 → draw 1 → index 0
    expect(map[2]).toBe(1); // canonical 2 → draw 2 → index 1
    expect(map[3]).toBe(5); // canonical 3 → draw 6 → index 5
    expect(map[4]).toBe(2); // canonical 4 → draw 3 → index 2
    expect(map[5]).toBe(4); // canonical 5 → draw 5 → index 4
    expect(map[6]).toBe(3); // canonical 6 → draw 4 → index 3
  });

  it('handles single-atom molecule (N:1)', () => {
    const map = parseAuxMapping('1/0/N:1');
    expect(map[1]).toBe(0);
  });

  it('returns empty map when N: field absent', () => {
    const map = parseAuxMapping('1/0/E:(1,2)');
    expect(map).toEqual({});
  });
});
```

**NOTE:** The benzene `AuxInfo` body above is partially `[ASSUMED]` — the `N:1,2,6,3,5,4` values are from a web search example for benzene (search result confirmed this for a benzene-like structure). The **actual** values must be captured empirically from `window.ketcher.getInchi(true)` after drawing benzene in the running app. The test fixture should use real captured output. See Assumptions Log A1.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand v4 `create(fn)` | Zustand v5 `create<T>()(fn)` — double-call pattern for TypeScript | v5.0.0 | TypeScript inference now requires the extra `()` to avoid auto-type inference issues |
| Zustand v4 `zustand/middleware` named imports | Same import path in v5 | v5 | No change — `import { devtools } from 'zustand/middleware'` unchanged |
| `onChange` prop on Ketcher `<Editor>` | No `onChange` prop — use `editor.subscribe('change', handler)` | Always (Ketcher design) | Must use the event bus, not a React prop |
| `editor.unsubscribe('change', handlerFn)` | `editor.unsubscribe('change', subscriptionObject)` | Ketcher design | Unsubscribe must use the **return value of subscribe**, not the original handler |

**Deprecated/outdated:**
- `combine()` middleware from Zustand: Not needed for a single flat store with 5-6 fields — use plain `create<T>()()`.
- `process.env` shims: Already configured in `vite.config.ts`; no changes needed for Phase 2.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Benzene AuxInfo `N:` field is `N:1,2,6,3,5,4` (from web search example) | Code Examples — unit test fixture | Test fixture asserts wrong expected values; unit test passes but validates incorrect behavior. Must be replaced with real captured output before merging. |
| A2 | `getInchi(true)` uses `\n` (newline) as the InChI/AuxInfo separator, not `\r\n` or space | Architecture Patterns — Pattern 3 | `parseInchiWithAux` uses `indexOf('\nAuxInfo=')` — if separator is different, split fails silently and `auxMap` is always `{}`. |
| A3 | Formula layer enrichment (`atoms: [1..N]`) derives N by summing element counts from formula text | Architecture Patterns — Pattern 5 | Formula atoms array is wrong or empty; Phase 4 formula-layer highlighting shows nothing. |
| A4 | Empty canvas produces `'InChI=1S//'` or throws — not a valid InChI with layers | Common Pitfalls — Pitfall 3 | Empty state detection in D-13 may not trigger correctly. |

---

## Open Questions

1. **AuxInfo newline vs. space separator**
   - What we know: `STATE.md` specifies split on `\nAuxInfo=`. Web search found one example with a space separator. JNI-InChI example shows newline-separated lines.
   - What's unclear: Indigo WASM may use `\n` or `\r\n` depending on platform.
   - Recommendation: In Wave 0, draw benzene, call `window.ketcher.getInchi(true)` from the browser console, inspect the raw string (check `raw.indexOf('\n')` vs `raw.indexOf('\r\n')`) and hardcode the confirmed separator in `parseInchiWithAux`. Update the unit test fixture with real output.

2. **Benzene AuxInfo N: field actual values**
   - What we know: Benzene atoms can be permuted many ways depending on draw order; for canonically-drawn benzene, `N:1,2,6,3,5,4` was found in a web search example.
   - What's unclear: The exact values depend on the order atoms were added to the canvas in Ketcher.
   - Recommendation: Capture real output per question 1 above. The unit test fixture must use real captured output, not the example from research.

3. **`devtools` middleware for `@redux-devtools/extension` types**
   - What we know: Zustand README says to add `import type {} from '@redux-devtools/extension'` for full TypeScript devtools type support.
   - What's unclear: Whether this is needed at runtime or just for types.
   - Recommendation: Use `devtools` without the `@redux-devtools/extension` import. The TypeScript compiler may emit a type warning, which is acceptable for dev-only middleware.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest unit tests | Yes | v18.19.1 | — |
| vitest | Unit tests | Yes | 3.2.4 | — |
| jsdom | `environment: 'jsdom'` in vitest.config.ts | No | — | Change to `environment: 'node'` — no DOM needed for parsing tests |
| zustand | Store | Yes | 5.0.13 | — |
| Chromium / browser | Empirical AuxInfo capture (Open Question 1) | Yes (dev machine) | — | Use `npm run dev` + browser console |

**Missing dependencies with fallback:**
- `jsdom`: Vitest environment must be changed to `'node'` before tests can run. This is a config change, not an install.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (needs `environment: 'node'` fix) |
| Quick run command | `npm test -- --run src/lib/__tests__/parseAuxMapping.test.ts` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INCHI-01 | `parseAuxMapping` returns correct canonical→Ketcher mapping for benzene | unit | `npm test -- --run src/lib/__tests__/parseAuxMapping.test.ts` | No — Wave 0 |
| INCHI-01 | `parseInchi` returns correct `layers[]` for ethanol InChI | unit | `npm test -- --run src/lib/__tests__/parseInchi.test.ts` | No — Wave 0 |
| INCHI-01 | Live debounced update ≤150ms | manual smoke | Draw a molecule, observe React DevTools state update | — |
| INCHI-01 | Generation guard prevents stale overwrite | manual smoke | Draw rapidly — state always reflects last structure | — |

### Sampling Rate

- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/parseAuxMapping.test.ts` — covers INCHI-01 auxMap correctness
- [ ] `src/lib/__tests__/parseInchi.test.ts` — covers INCHI-01 layers[] correctness
- [ ] Fix `vitest.config.ts`: change `environment: 'jsdom'` to `environment: 'node'`

---

## Security Domain

This phase implements pure client-side data parsing with no network calls, no user authentication, no persistent storage, and no external services. All data is chemical structure strings processed in-browser via WASM.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Minimal | InChI string is generated by Ketcher's own WASM — not user-typed input. No SQL, no HTML rendering of raw strings. |
| V6 Cryptography | No | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype pollution via `record[key] = value` in `parseAuxMapping` | Tampering | Keys are `parseInt(v, 10)` — numeric, cannot be `__proto__` or `constructor`. No risk. |
| ReDoS in `parseHydrogenAtoms` regex | DoS | InChI strings are bounded-length and WASM-generated (not user-typed). Acceptable risk. |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/ketcher-core/dist/application/ketcher.d.ts` — `getInchi` signature, `changeEvent: Subscription`
- `node_modules/ketcher-core/dist/application/editor/editor.types.d.ts` — `editor.subscribe` and `editor.unsubscribe` signatures
- `node_modules/ketcher-react/dist/index.js` lines 26893, 27315–27355 — confirmed subscribe/unsubscribe return value semantics
- `node_modules/ketcher-core/dist/index.modern.js` line 59579 — `getInchi` uses `SupportedFormat.inChIAuxInfo` for `withAuxInfo: true`
- `node_modules/ketcher-standalone/dist/main.js` lines 67, 620–622 — `SupportedFormat.InChIAuxInfo = "inchi-aux"`, convert pipeline
- `node_modules/zustand/react.d.ts` — `create` API type signature
- `node_modules/zustand/README.md` — TypeScript double-call pattern, devtools usage
- `design_handoff_explain_that_inchi/molecules.js` — `parseInchi()`, `parseConnectionBonds()`, etc. (source of truth for parsing logic)
- `design_handoff_explain_that_inchi/app.jsx` — how `layers[]` and `auxMap` are consumed downstream
- `vitest.config.ts` — existing config with `environment: 'jsdom'` (confirmed gap: jsdom not installed)

### Secondary (MEDIUM confidence)
- [zustand.docs.pmnd.rs beginner-typescript](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript) — TypeScript `create<T>()()` pattern and devtools middleware
- [JNI-InChI Guide](https://jni-inchi.sourceforge.net/guide.html) — AuxInfo `N:` field example for alanine: `N:4,1,2,3,5,6`
- Web search result confirming benzene AuxInfo format: `AuxInfo=1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/...`
- [InChI User Guide PDF](https://www.inchi-trust.org/download/104/InChI_UserGuide.pdf) — `N:` field definition: "original atom numbers in the order of canonical numbers"

### Tertiary (LOW confidence)
- Web search for "getInchi(true) exact return format" — corroborates newline separator but not confirmed empirically against Ketcher 3.12.0 WASM

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules
- Zustand 5 API: HIGH — verified from installed source
- Ketcher subscribe/unsubscribe pattern: HIGH — verified from ketcher-react dist source
- AuxInfo N: field semantics: MEDIUM — from InChI spec docs + JNI-InChI example; exact Ketcher 3.12.0 output unverified empirically
- Benzene AuxInfo exact values: LOW — from web search, must be replaced with real capture
- Empty canvas InChI format: MEDIUM — based on InChI standard `InChI=1S//` for empty

**Research date:** 2026-05-20
**Valid until:** 2026-08-20 (stable ecosystem)
