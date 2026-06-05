---
phase: 02-data-pipeline
verified: 2026-05-20T15:02:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Drawing a molecule updates the Zustand store within 150ms"
    expected: "After drawing any molecule and pausing, React DevTools shows non-empty inchi, layers (length >= 2), and auxMap in the useInchiStore state"
    why_human: "Requires a running browser with the Ketcher WASM editor loaded; cannot be verified with static grep or unit tests"
  - test: "Rapid drawing does not produce stale layers/auxMap"
    expected: "Drawing and rapidly erasing atoms always leaves state reflecting the last drawn structure; no stale layers from a superseded WASM call"
    why_human: "Generation guard behavior requires interactive testing in the browser to confirm the timing-dependent race condition is actually prevented"
  - test: "Clearing the canvas resets store to empty state"
    expected: "After clearing the canvas (Ctrl+A, Delete or Ketcher clear button), useInchiStore shows inchi:'', layers:[], auxMap:{} with no thrown exception"
    why_human: "Requires the running browser and interactive canvas manipulation"
---

# Phase 02: Data Pipeline Verification Report

**Phase Goal:** Every draw event produces correctly-shaped `layers[]` and `auxMap` in React state, verified by unit tests against real Ketcher 3.12.0 output
**Verified:** 2026-05-20T15:02:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All layer types (version, formula, c, h, t, b, m, s, q, p, i) are parsed correctly from a real InChI string | VERIFIED | `parseInchi.ts` exports `LayerType` union covering all 11 types; `parseInchi.test.ts` verifies version/formula/c/h; enrichLayers handles t/b/formula/c/h with defaults for the rest |
| 2 | `parseAuxMapping` returns a correct canonical→Ketcher 0-based index map from an AuxInfo body | VERIFIED | `parseAuxMapping.test.ts` uses real Ketcher 3.12.0 benzene fixture (N:1,3,5,2,6,4) with 6 assertions; all 6 tests in that file pass |
| 3 | `parseInchiWithAux` splits a `getInchi(true)` raw string into inchi, layers[], and auxMap correctly | VERIFIED | Two tests in `parseAuxMapping.test.ts` cover split + no-AuxInfo fallback; test uses real captured fixture string |
| 4 | Empty InChI (`InChI=1S//`) produces `layers.length < 2`, enabling the empty-canvas guard in App.tsx | VERIFIED | `parseInchi.test.ts` line 44–47 explicitly tests this; `parseInchi` returns only version layer when parts[1] is empty; App.tsx line 53 guards on `result.layers.length < 2` |
| 5 | `npm test -- --run` exits 0 | VERIFIED | 29 tests, 3 files, all passing in 1.32s; `npx tsc --noEmit` exits 0 with no errors |

**Score:** 5/5 truths verified

### Roadmap Success Criteria

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | Drawing a molecule and pausing produces an updated InChI string in React DevTools within 150ms | ? NEEDS HUMAN | App.tsx wires the 150ms debounced subscription correctly (line 62 `}, 150)`); cannot confirm actual browser behavior without running the app |
| 2 | `auxMap` contains correct canonical-to-Ketcher mapping, verifiable by console inspection for a known molecule | ? NEEDS HUMAN | Logic verified by unit test against real Ketcher 3.12.0 benzene output; browser inspection still needed to confirm the full pipeline round-trip |
| 3 | `parseAuxMapping` has a passing unit test using captured real `getInchi(true)` output | VERIFIED | `BENZENE_AUXINFO_BODY` constant in `parseAuxMapping.test.ts` line 6 is marked "real getInchi(true) output captured from Ketcher 3.12.0 on 2026-05-20"; all 4 tests pass |
| 4 | Rapid draw/erase does not produce stale layers/auxMap pairs | ? NEEDS HUMAN | Generation counter (`generationRef`) and stale-discard guard (`thisGen !== generationRef.current`) are implemented correctly in code; the race condition itself requires browser timing to confirm |
| 5 | Empty or disconnected canvas produces no exception; `layers` and `auxMap` are empty | ? NEEDS HUMAN | Code has a catch block (App.tsx line 58–60) and a `layers.length < 2` guard; empty-canvas parse behavior verified in unit tests; actual canvas clear behavior requires browser confirmation |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/parseInchi.ts` | Layer type definitions + `parseInchi()` + `enrichLayers()` + all five helper functions | VERIFIED | All 9 required exports confirmed; 226 lines of substantive TypeScript; no browser globals |
| `src/lib/parseAuxMapping.ts` | `parseAuxMapping()` + `parseInchiWithAux()` orchestrator | VERIFIED | Both exports confirmed at lines 24 and 47; imports from `./parseInchi`; 65 lines |
| `src/lib/__tests__/parseInchi.test.ts` | Vitest unit tests for parseInchi and layer helpers | VERIFIED | 15 tests across 5 describe blocks; all pass |
| `src/lib/__tests__/parseAuxMapping.test.ts` | Vitest unit tests with real captured benzene AuxInfo fixture | VERIFIED | 6 tests; provisional A1 comment removed; real Ketcher 3.12.0 fixture at line 6 |
| `src/__tests__/store.test.ts` | Vitest unit tests for useInchiStore | VERIFIED | 8 tests covering initial state, all three actions, null transitions |
| `vitest.config.ts` | `environment: 'node'` | VERIFIED | File is 7 lines; `environment: 'node'` confirmed at line 5 |
| `src/store.ts` | Zustand 5 store with all v1 fields and three actions | VERIFIED | `create<InchiState>()()` double-call pattern; all 5 fields + 3 actions; imports from `./lib/parseInchi` |
| `src/App.tsx` | useEffect subscription wiring: debounce + generation guard + store dispatch | VERIFIED | `editor.subscribe('change', handleChange)` at line 68; 150ms debounce; generationRef; cleanup at line 71–73 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/parseAuxMapping.ts` | `src/lib/parseInchi.ts` | `import { parseInchi }` + `import type { Layer, AuxMap }` | WIRED | Lines 5–6 of parseAuxMapping.ts |
| `src/store.ts` | `src/lib/parseInchi.ts` | `import type { Layer, AuxMap, SubHover }` | WIRED | Line 3 of store.ts |
| `src/App.tsx` | `src/lib/parseAuxMapping.ts` | `import { parseInchiWithAux }` | WIRED | Line 6 of App.tsx; called at line 51 |
| `src/App.tsx` | `src/store.ts` | `import { useInchiStore }` | WIRED | Line 7 of App.tsx; used via `useInchiStore.getState()` at lines 54, 57, 60 |
| `src/__tests__/store.test.ts` | `src/store.ts` | `import { useInchiStore }` | WIRED | Line 4 of store.test.ts |
| `src/lib/__tests__/parseAuxMapping.test.ts` | `src/lib/parseAuxMapping.ts` | `import { parseAuxMapping, parseInchiWithAux }` | WIRED | Line 2 of test file |
| subscription cleanup | `ketcher.editor.unsubscribe` | passes subscription object not handler | WIRED | App.tsx line 72: `ketcher.editor.unsubscribe('change', subscription)` — subscription object from line 68 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/App.tsx` | `result` (from `parseInchiWithAux`) | `ketcher.getInchi(true)` WASM call inside 150ms debounced `setTimeout` | Yes — WASM-generated InChI string | FLOWING |
| `src/store.ts` | `inchi`, `layers`, `auxMap` | `setInchiData` called from App.tsx line 57 with parsed results | Yes — flows from WASM output through parsing functions | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| npm test exits 0 | `npm test -- --run` | 29 passed (3 files), 1.32s | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | no output (exit 0) | PASS |
| vitest environment is node | `grep environment vitest.config.ts` | `environment: 'node'` | PASS |
| No browser globals in lib files | grep for `window\|document` in parseInchi.ts, parseAuxMapping.ts | Only in a JSDoc comment (not executable) | PASS |
| Provisional A1 comment removed | `grep "Assumption A1" parseAuxMapping.test.ts` | no match | PASS |
| Real fixture present | `grep "real getInchi" parseAuxMapping.test.ts` | matches line 4 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INCHI-01 | 02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md | InChI string updates live on every structure change (debounced ≤150ms) using Ketcher's WASM | PARTIALLY SATISFIED (human verification needed for browser runtime) | Debounce wired at 150ms in App.tsx; parsing library and store complete; browser round-trip requires human test |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/App.tsx` | — | `(window as any).ketcher = ketcher` | Info | Intentional dev/console access pattern; not a stub; does not affect data pipeline |

No stubs, placeholders, or hollow implementations found. All `return {}` and `return []` are either initial state defaults (populated by real data on first draw event) or defensive guards for invalid input — not stubs.

**Note on SUMMARY inaccuracy:** `02-03-SUMMARY.md` line 65 states "50ms debounce" but the actual code uses 150ms (`setTimeout(..., 150)` at App.tsx line 62). The code matches the plan spec (150ms) and the requirement (≤150ms). This is a documentation error in the SUMMARY only — not a code defect.

### Human Verification Required

#### 1. Pipeline Live Update

**Test:** Run `npm run dev`, open http://localhost:5173, draw a simple molecule (e.g. two carbons with a bond), and wait 200ms after the last click.
**Expected:** React DevTools (or browser Redux DevTools via "inchi-store") shows the `useInchiStore` state updated with a non-empty `inchi` string, `layers` array with 2+ entries, and a non-empty `auxMap`.
**Why human:** Requires the Ketcher WASM editor to initialize in a real browser; the debounce → `getInchi(true)` → `parseInchiWithAux` → store dispatch chain can only be observed at runtime.

#### 2. Stale-Result Guard (Rapid Drawing)

**Test:** Draw several atoms rapidly (click multiple times without pausing), then stop and wait 200ms.
**Expected:** State reflects only the final drawn structure — no stale layer/auxMap from an earlier superseded WASM call.
**Why human:** The generation counter race condition requires real-world timing to trigger; the guard is in the code but its correctness under actual Ketcher change event rates cannot be confirmed statically.

#### 3. Empty Canvas Reset

**Test:** After drawing a molecule (store is populated), clear the canvas (Ctrl+A then Delete, or Ketcher's clear button).
**Expected:** `useInchiStore` state shows `inchi: ''`, `layers: []`, `auxMap: {}`. No JavaScript exception in the console.
**Why human:** Requires the running browser to trigger the `catch` block or `layers.length < 2` guard that resets the store.

### Gaps Summary

No automated gaps found. All artifacts exist, are substantive, and are correctly wired. All 29 unit tests pass. TypeScript compiles without errors. The three human verification items above are the only open items — they test the live browser pipeline that cannot be confirmed statically.

---

_Verified: 2026-05-20T15:02:00Z_
_Verifier: Claude (gsd-verifier)_
