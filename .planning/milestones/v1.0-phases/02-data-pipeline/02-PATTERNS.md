# Phase 2: Data Pipeline - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 6 new/modified files
**Analogs found:** 5 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/store.ts` | store | event-driven | `src/App.tsx` (flat useState) | partial — same state fields, different mechanism |
| `src/lib/parseInchi.ts` | utility | transform | `design_handoff_explain_that_inchi/molecules.js` lines 334–422 | exact — direct TypeScript port target |
| `src/lib/parseAuxMapping.ts` | utility | transform | `design_handoff_explain_that_inchi/molecules.js` lines 334–422 | exact — derived from same source |
| `src/lib/__tests__/parseAuxMapping.test.ts` | test | transform | none (no existing tests) | none |
| `src/lib/__tests__/parseInchi.test.ts` | test | transform | none (no existing tests) | none |
| `src/App.tsx` (modified) | component | event-driven | `src/App.tsx` (existing) | exact — same file, additive change |
| `vitest.config.ts` (modified) | config | — | `vitest.config.ts` (existing) | exact — same file, one-line fix |

## Pattern Assignments

### `src/store.ts` (store, event-driven)

**Analog:** `src/App.tsx` — the existing flat `useState` pattern holds all state fields that migrate into the store. The store replaces them with a Zustand slice.

**Imports pattern** — mirror the TypeScript import style from `src/App.tsx` (lines 1–5), extended with Zustand:
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Layer, AuxMap, SubHover } from './lib/parseInchi';
```

**Core Zustand 5 TypeScript pattern** — Zustand 5 requires the double-call `create<State>()()` syntax. The inner call passes the initialiser; the outer call binds the TypeScript generic:
```typescript
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

**State interface pattern** — define all v1 fields in a single `interface`; include action signatures:
```typescript
interface InchiState {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  hoverIdx: number | null;
  subHover: SubHover | null;
  setInchiData: (inchi: string, layers: Layer[], auxMap: AuxMap) => void;
  setHover: (idx: number | null) => void;
  setSubHover: (sub: SubHover | null) => void;
}
```

**Usage pattern from components** (future Phase 3 pattern — document for the planner):
```typescript
// Selector-based read — component re-renders only when this slice changes
const layers = useInchiStore(state => state.layers);
// Dispatch from App.tsx without subscribing to store changes:
useInchiStore.getState().setInchiData(inchi, layers, auxMap);
```

---

### `src/lib/parseInchi.ts` (utility, transform)

**Analog:** `design_handoff_explain_that_inchi/molecules.js` lines 334–431 — these are the exact JS functions to port to TypeScript. No algorithmic changes; add types only.

**Type definitions** — export all shared types from this file so `parseAuxMapping.ts` and the store can import them:
```typescript
export type LayerType =
  | 'version' | 'formula'
  | 'c' | 'h' | 'q' | 'p'
  | 'b' | 't' | 'm' | 's'
  | 'i';

export interface Layer {
  type: LayerType;
  prefix: string;
  text: string;
  atoms: number[];   // canonical 1-based indices
  bonds: number[][]; // [a, b] pairs, only for 'c' layer
}

export type AuxMap = Record<number, number>;

export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH';
  el?: string;
  canonical?: number;
  atom?: number;
  sign?: string;
  atoms?: number[];
  count?: number;
}
```

**`parseInchi` core pattern** — port of `molecules.js` lines 334–348. The TypeScript version must type the prefix as `LayerType` and append enrichment:
```typescript
// Analog: design_handoff_explain_that_inchi/molecules.js lines 334–348
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
  return enrichLayers(layers);
}
```

**`parseConnectionBonds` port** — from `molecules.js` lines 352–378. Stack-based parser for branch notation like `1-2(4)3`:
```typescript
// Analog: design_handoff_explain_that_inchi/molecules.js lines 352–378
export function parseConnectionBonds(text: string): [number, number][] {
  const bonds: [number, number][] = [];
  const stack: (number | null)[] = [];
  let i = 0;
  let last: number | null = null;
  while (i < text.length) {
    const c = text[i];
    if (c === '(') { stack.push(last); i++; }
    else if (c === ')') { last = stack.pop() ?? null; i++; }
    else if (c === '-') { i++; }
    else if (c === ',') {
      if (stack.length) last = stack[stack.length - 1] as number | null;
      i++;
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < text.length && /\d/.test(text[j])) j++;
      const n = parseInt(text.slice(i, j), 10);
      if (last != null) bonds.push([last, n]);
      last = n;
      i = j;
    } else { i++; }
  }
  return bonds;
}
```

**`parseHydrogenAtoms` port** — from `molecules.js` lines 381–404. Returns `Record<number, number>` mapping canonical atom to H count:
```typescript
// Analog: design_handoff_explain_that_inchi/molecules.js lines 381–404
export function parseHydrogenAtoms(text: string): Record<number, number> {
  const out: Record<number, number> = {};
  const cleaned = text.replace(/\([^)]*\)/g, '');
  const re = /([\d,\-]+)H(\d*)(?=,|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const count = m[2] ? parseInt(m[2], 10) : 1;
    for (const range of m[1].split(',')) {
      if (!range) continue;
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(n => parseInt(n, 10));
        for (let k = a; k <= b; k++) out[k] = count;
      } else {
        out[parseInt(range, 10)] = count;
      }
    }
  }
  return out;
}
```

**`parseMobileHydrogens` port** — from `molecules.js` lines 407–415:
```typescript
// Analog: design_handoff_explain_that_inchi/molecules.js lines 407–415
export function parseMobileHydrogens(text: string): number[] {
  const groups: number[] = [];
  const re = /\(H\d*,([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    groups.push(...m[1].split(',').map(n => parseInt(n, 10)));
  }
  return groups;
}
```

**`parseStereoAtoms` port** — from `molecules.js` lines 418–421:
```typescript
// Analog: design_handoff_explain_that_inchi/molecules.js lines 418–421
export function parseStereoAtoms(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(/(\d+)[\-+]/g)) nums.push(parseInt(m[1], 10));
  return nums;
}
```

**`enrichLayers` helper** — not in the design handoff JS (it didn't need `atoms`/`bonds` on layers); must be written fresh per D-06/D-07/D-08/D-09. Enrichment table from RESEARCH.md Pattern 5:

| Layer type | `atoms` source | `bonds` source |
|------------|---------------|----------------|
| `version` | `[]` | `[]` |
| `formula` | `[1..N]` derived from formula element counts | `[]` |
| `c` | deduplicated atoms from `parseConnectionBonds(text)` | `parseConnectionBonds(text)` |
| `h` | keys of `parseHydrogenAtoms(text)` + `parseMobileHydrogens(text)` | `[]` |
| `t`, `b` | `parseStereoAtoms(text)` | `[]` |
| `m`, `s`, `q`, `p`, `i` | `[]` | `[]` |

---

### `src/lib/parseAuxMapping.ts` (utility, transform)

**Analog:** `design_handoff_explain_that_inchi/molecules.js` lines 1–7 (the `MOLECULES` data shows the `canonical` → `ketcher` relationship that `auxMap` encodes), plus RESEARCH.md Pattern 3.

**Imports pattern** — import only the shared types; no React or browser dependencies:
```typescript
import type { AuxMap } from './parseInchi';
```

**`parseAuxMapping` core pattern** — from RESEARCH.md Pattern 3 / Code Examples:
```typescript
// Source: CONTEXT.md D-10, D-11; InChI User Guide N: field spec
// Input: AuxInfo body AFTER "AuxInfo=" — e.g. "1/0/N:1,2,6,3,5,4/E:..."
export function parseAuxMapping(auxBody: string): AuxMap {
  const parts = auxBody.split('/');
  const nPart = parts.find(p => p.startsWith('N:'));
  if (!nPart) return {};
  const values = nPart.slice(2).split(',');
  const map: AuxMap = {};
  values.forEach((v, i) => {
    const n = parseInt(v, 10);
    if (!isNaN(n)) map[i + 1] = n - 1; // canonical (1-based) → Ketcher (0-based)
  });
  return map;
}
```

**`parseInchiWithAux` orchestrator** — splits the raw `getInchi(true)` return value:
```typescript
// Source: RESEARCH.md Pattern 3; CONTEXT.md D-11
export function parseInchiWithAux(raw: string): {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
} {
  const newlineAuxIdx = raw.indexOf('\nAuxInfo=');
  if (newlineAuxIdx === -1) {
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

**Empty-canvas guard** — per D-12/D-13; integrate into the caller in App.tsx rather than inside the pure parse function (keeps the function pure):
```typescript
// In App.tsx, after parseInchiWithAux:
// if no formula layer (layers.length < 2) treat as empty canvas
if (result.layers.length < 2) {
  useInchiStore.getState().setInchiData('', [], {});
  return;
}
```

---

### `src/App.tsx` (modified — component, event-driven)

**Analog:** `src/App.tsx` (existing) — lines 1–40 are the base; the `useEffect` subscription block is inserted after `handleInit` closes.

**Existing imports to extend** (lines 1–5 of current App.tsx):
```typescript
// Current:
import { useState, useRef } from 'react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { Ketcher } from 'ketcher-core';
import { Header } from './components/Header';
import { KetcherPanel } from './components/KetcherPanel';
// Add:
import { useEffect } from 'react';
import { parseInchiWithAux } from './lib/parseAuxMapping';
import { useInchiStore } from './store';
```

**`useRef` pattern for ketcherRef** — already established (lines 13–14 of current App.tsx); the generation counter follows the same pattern:
```typescript
// Analog: src/App.tsx lines 13–14 — useRef, not useState
const ketcherRef = useRef<Ketcher | null>(null);
const generationRef = useRef(0); // new — same pattern as ketcherRef
```

**`useEffect` subscription pattern** — triggered by `isReady` state transition; cleanup removes the subscription and pending timer:
```typescript
// Insert after handleInit in src/App.tsx
// Analog: src/KetcherPanel.tsx pattern of guarding on isReady before using the editor
useEffect(() => {
  const ketcher = ketcherRef.current;
  if (!isReady || !ketcher) return;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const handleChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const thisGen = ++generationRef.current;
      try {
        const raw = await ketcher.getInchi(true);
        if (thisGen !== generationRef.current) return; // stale result — discard
        const result = parseInchiWithAux(raw);
        // D-12/D-13: empty canvas check
        if (result.layers.length < 2) {
          useInchiStore.getState().setInchiData('', [], {});
          return;
        }
        useInchiStore.getState().setInchiData(result.inchi, result.layers, result.auxMap);
      } catch {
        useInchiStore.getState().setInchiData('', [], {});
      }
    }, 150);
  };

  // CRITICAL: store the subscription OBJECT, not the handler — unsubscribe needs it
  // Verified: ketcher-react/dist/index.js lines 27315–27355
  const subscription = ketcher.editor.subscribe('change', handleChange);
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    ketcher.editor.unsubscribe('change', subscription);
  };
}, [isReady]); // ketcherRef is a ref — not a dependency
```

---

### `vitest.config.ts` (modified — config)

**Analog:** `vitest.config.ts` (existing) — lines 1–7; the only change is `environment`:

```typescript
// Current (lines 1–7 of vitest.config.ts):
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',   // ← CHANGE TO 'node'
  },
});
```

**After fix:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',  // jsdom not installed; pure parsing tests need no DOM
  },
});
```

---

### `src/lib/__tests__/parseAuxMapping.test.ts` (test, transform)

**Analog:** No existing tests in codebase. Pattern comes from RESEARCH.md Code Examples and Vitest 3 conventions.

**Test file structure pattern** — from RESEARCH.md Code Examples:
```typescript
import { describe, it, expect } from 'vitest';
import { parseAuxMapping } from '../parseAuxMapping';

describe('parseAuxMapping', () => {
  it('maps benzene canonical indices to Ketcher 0-based indices', () => {
    // IMPORTANT: replace BENZENE_AUXINFO_BODY with real captured output
    // from window.ketcher.getInchi(true) in the running app before merging.
    // The N: values below are from a web search example and must be verified.
    const BENZENE_AUXINFO_BODY = '1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/rA:6nCCCCCC/rB:d1;s2;d3;s4;s1d5;/rC:...';
    const map = parseAuxMapping(BENZENE_AUXINFO_BODY);
    expect(map[1]).toBe(0);
    expect(map[2]).toBe(1);
    expect(map[3]).toBe(5);
    expect(map[4]).toBe(2);
    expect(map[5]).toBe(4);
    expect(map[6]).toBe(3);
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

---

### `src/lib/__tests__/parseInchi.test.ts` (test, transform)

**Analog:** No existing tests. Pattern mirrors `parseAuxMapping.test.ts` above.

**Test structure pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { parseInchi } from '../parseInchi';

describe('parseInchi', () => {
  it('parses ethanol InChI into correct layers', () => {
    // InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3
    const layers = parseInchi('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');
    expect(layers[0]).toMatchObject({ type: 'version', text: '1S' });
    expect(layers[1]).toMatchObject({ type: 'formula', text: 'C2H6O' });
    expect(layers[2]).toMatchObject({ type: 'c', prefix: 'c' });
    expect(layers[3]).toMatchObject({ type: 'h', prefix: 'h' });
  });

  it('returns empty array fields on empty InChI', () => {
    const layers = parseInchi('InChI=1S//');
    // length < 2 → no formula layer → triggers empty canvas guard in App.tsx
    expect(layers.length).toBeLessThan(2);
  });
});
```

---

## Shared Patterns

### TypeScript strict-mode compliance
**Source:** `tsconfig.json` (strict mode, noImplicitAny) + `src/App.tsx` lines 17–19 (eslint-disable comments for intentional `any` casts)
**Apply to:** All new `.ts` files
```typescript
// For genuinely unavoidable any — document with inline comment, not a blanket suppress
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).ketcher = ketcher;
```
New files in `src/lib/` contain pure functions with no DOM access — no `any` should be needed.

### Module-level singleton guard
**Source:** `src/App.tsx` lines 7–9
```typescript
// Module-level — created once for the page lifetime. NEVER move inside a component.
const structServiceProvider = new StandaloneStructServiceProvider();
```
**Apply to:** `src/store.ts` — the `useInchiStore` export is module-level by design (Zustand `create()` call at module scope). Never move inside a component or hook.

### useRef for mutable handles that are not UI state
**Source:** `src/App.tsx` lines 13–14
```typescript
// useRef, not useState — storing in state triggers unnecessary re-renders (D-15)
const ketcherRef = useRef<Ketcher | null>(null);
```
**Apply to:** `generationRef` in App.tsx modification — same rationale: generation counter must update synchronously without triggering re-renders.

### CSS Modules for component-scoped styles
**Source:** `src/components/KetcherPanel.tsx` line 3; `src/components/KetcherPanel.module.css`
```typescript
import styles from './KetcherPanel.module.css';
```
**Apply to:** Phase 2 adds no UI — not applicable. Note for Phase 3 component files.

### No browser globals in lib modules
**Source:** `vite.config.ts` — process shims indicate the build targets browser-only; `src/lib/` modules must be Node-compatible for Vitest
**Apply to:** `src/lib/parseInchi.ts`, `src/lib/parseAuxMapping.ts` — no `window`, `document`, or `import.meta` references. Pure functions only.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/__tests__/parseAuxMapping.test.ts` | test | transform | No existing test files in codebase — use Vitest 3 conventions from RESEARCH.md |
| `src/lib/__tests__/parseInchi.test.ts` | test | transform | No existing test files in codebase — same |

---

## Metadata

**Analog search scope:** `src/`, `design_handoff_explain_that_inchi/`, `vitest.config.ts`
**Files scanned:** 9 (App.tsx, KetcherPanel.tsx, Header.tsx, main.tsx, KetcherPanel.module.css, molecules.js, app.jsx, vitest.config.ts, vite.config.ts)
**Pattern extraction date:** 2026-05-20

### Critical notes for planner

1. **`parseInchiWithAux` placement decision** — RESEARCH.md recommends two separate files (`parseInchi.ts` and `parseAuxMapping.ts`). `parseInchiWithAux` orchestrates both, so it belongs in `parseAuxMapping.ts` with an import of `parseInchi` from `parseInchi.ts`. Types (`Layer`, `AuxMap`, `SubHover`) all export from `parseInchi.ts` as the canonical type file.

2. **Test fixture is provisional** — The benzene `N:` values in the test fixture are from a web search example (assumption A1 in RESEARCH.md). The planner must include a Wave 0 task to capture real `getInchi(true)` output from the running app and update the fixture before the phase gate.

3. **`unsubscribe` receives the subscription object** — not the handler function. Verified against `ketcher-react/dist/index.js` lines 27315–27355. The plan must make this explicit in its implementation task; it is a silent failure if passed the wrong argument.

4. **`devtools` type warning is acceptable** — Zustand's `devtools` middleware may emit a TypeScript warning about `@redux-devtools/extension` types. This is a dev-only DX issue; the warning does not affect runtime or build. No `@redux-devtools/extension` install needed.
