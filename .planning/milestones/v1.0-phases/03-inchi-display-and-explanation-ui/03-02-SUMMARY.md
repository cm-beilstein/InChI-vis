---
phase: 03-inchi-display-and-explanation-ui
plan: "02"
subsystem: data-layer
tags: [parsing, zustand, auxinfo, atom-elements]
dependency_graph:
  requires: [03-01-PLAN.md]
  provides: [atomElements in store, parseAtomElements function]
  affects: [src/lib/parseAuxMapping.ts, src/store.ts, src/App.tsx]
tech_stack:
  added: []
  patterns: [TDD red-green, greedy two-char element parsing]
key_files:
  created: []
  modified:
    - src/lib/parseAuxMapping.ts
    - src/store.ts
    - src/App.tsx
decisions:
  - "parseAtomElements uses greedy two-char detection (uppercase followed by lowercase) for Cl, Br, etc."
  - "atomElements is 1-based canonical index map (matching canonical numbering convention)"
  - "setInchiData signature extended to 4 args — breaking change handled consistently across all call sites"
metrics:
  duration: "8min"
  completed: "2026-05-21"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 3 Plan 2: atomElements Data Layer Extension Summary

**One-liner:** `parseAtomElements` parses AuxInfo `rA:` field into 1-based element map; threaded through Zustand store and App.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add parseAtomElements + extend parseInchiWithAux | 76314bd | src/lib/parseAuxMapping.ts |
| 2 | Extend store with atomElements + wire App.tsx | 793645a | src/store.ts, src/App.tsx |

## What Was Built

### Task 1: parseAtomElements function

Added `parseAtomElements(auxBody: string): Record<number, string>` to `src/lib/parseAuxMapping.ts`.

- Locates the `rA:` field in the AuxInfo body (split on `/`)
- Extracts the atom count prefix (one or more digits)
- Iterates remaining characters with greedy two-char detection: if the next character is lowercase, take two chars (e.g. `C` + `l` → `'Cl'`); otherwise take one
- Returns 1-based canonical index map: `{ 1: 'C', 2: 'Cl', 3: 'C', ... }`
- Returns `{}` when `rA:` field is absent or input is empty

Extended `parseInchiWithAux` return type to include `atomElements: Record<number, string>` — both the no-AuxInfo path (returns `{}`) and the main path (calls `parseAtomElements(auxBody)`) are updated.

### Task 2: Store and App.tsx wiring

`src/store.ts`:
- Added `atomElements: Record<number, string>` to `InchiState` interface (per D-11)
- Updated `setInchiData` signature to 4 args: `(inchi, layers, auxMap, atomElements)`
- Added `atomElements: {}` to initial store state
- Updated `setInchiData` implementation to spread `atomElements` into state

`src/App.tsx`:
- Updated all 3 `setInchiData` call sites to pass 4 arguments:
  - Empty-canvas reset (inside `layers.length < 2` guard): `setInchiData('', [], {}, {})`
  - Success path: `setInchiData(result.inchi, result.layers, result.auxMap, result.atomElements)`
  - Catch block reset: `setInchiData('', [], {}, {})`

## Test Results

- `parseAuxMapping.test.ts`: 12 tests — all green (6 new parseAtomElements tests + 6 pre-existing)
- `store.test.ts`: 10 tests — all green (2 new atomElements tests + 8 pre-existing)
- Full suite: 95 tests passing, 1 test file failing (`layerInfo.test.ts` — pre-existing stub from Plan 03-01, `src/lib/layerInfo.ts` not yet created; Plan 03-03's responsibility)
- TypeScript: `npx tsc --noEmit` — no errors

## Verification

```
grep -n "atomElements" src/store.ts
13:  atomElements: Record<number, string>;  // per D-11; 1-based canon idx → element symbol
17:  setInchiData: (inchi: string, layers: Layer[], auxMap: AuxMap, atomElements: Record<number, string>) => void;
33:      atomElements: {},
36:      setInchiData: (inchi, layers, auxMap, atomElements) => set({ inchi, layers, auxMap, atomElements }),
50://   useInchiStore.getState().setInchiData(inchi, layers, auxMap, atomElements);

grep -n "atomElements" src/App.tsx
57:          useInchiStore.getState().setInchiData(result.inchi, result.layers, result.auxMap, result.atomElements);
```

No 3-arg `setInchiData` calls remain in App.tsx.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are fully wired. `atomElements` is populated from real AuxInfo parsing and available in the store for `readingFor()` in Plan 03-03.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Threat model unchanged from plan — `parseAtomElements` input is WASM-generated AuxInfo (not user text), output is display-only element symbols.

## Self-Check: PASSED

- [x] `src/lib/parseAuxMapping.ts` modified and committed (76314bd)
- [x] `src/store.ts` modified and committed (793645a)
- [x] `src/App.tsx` modified and committed (793645a)
- [x] All parseAuxMapping tests green (12/12)
- [x] All store tests green (10/10)
- [x] TypeScript clean
- [x] `export function parseAtomElements` present in parseAuxMapping.ts
- [x] `atomElements: Record<number, string>` in store interface
- [x] `result.atomElements` in App.tsx success path
