---
phase: 03-inchi-display-and-explanation-ui
plan: "01"
subsystem: test-stubs
tags: [tdd, red-phase, layerInfo, parseAuxMapping, store]
dependency_graph:
  requires: []
  provides:
    - src/lib/__tests__/layerInfo.test.ts
    - src/lib/__tests__/parseAuxMapping.test.ts (extended)
    - src/__tests__/store.test.ts (extended)
  affects:
    - Plans 02 and 03 implementation targets (pass/fail signal)
tech_stack:
  added: []
  patterns:
    - TDD RED phase — test files with failing import/type stubs
key_files:
  created:
    - src/lib/__tests__/layerInfo.test.ts
  modified:
    - src/lib/__tests__/parseAuxMapping.test.ts
    - src/__tests__/store.test.ts
decisions:
  - parseAtomElements imported in parseAuxMapping.test.ts as 3rd named import
  - setInchiData called with 4 args ({}  as atomElements) in all store test call sites
  - store beforeEach setState reset extended with atomElements field
  - layerInfo.test.ts imports only from ../layerInfo and ../parseInchi
metrics:
  duration: "4min"
  completed_date: "2026-05-21"
  tasks_completed: 2
  files_changed: 3
---

# Phase 03 Plan 01: Wave 0 TDD Test Stubs Summary

**One-liner:** Three test files with 25 failing stubs defining the contract for `layerInfo.ts`, `parseAtomElements`, and `atomElements` store field.

## What Was Built

Wave 0 TDD RED phase — test files written before any implementation exists. These stubs define the exact API contract that Plans 02 and 03 must satisfy.

### Task 1: `src/lib/__tests__/layerInfo.test.ts` (new file)

18 test cases across 6 describe blocks covering all exports of the not-yet-created `src/lib/layerInfo.ts`:

- `subscript` — unicode subscript conversion (3 cases: 0, 6, 12)
- `swatchVar` — 11 layer type → CSS token suffix mappings
- `formulaReading` — HTML prose output for formula strings (C6H6 plural, CH4 singular)
- `readingFor` — 5 cases: version `1S`, formula layer, c-layer with/without atomElements, h-layer with atomElements
- `LAYER_INFO` — presence of all 11 layer type entries with truthy titles
- `DEFAULT_INFO` — exact title "Hover any layer" + non-empty blurb

All 18 tests fail with `Cannot find module '../layerInfo'` (correct RED state).

### Task 2: Extended `parseAuxMapping.test.ts` + `store.test.ts`

**parseAuxMapping.test.ts additions:**
- Import line updated: `parseAtomElements` added as 3rd named import
- `parseAtomElements` describe block (4 tests): benzene `rA:6CCCCCC` → 6-carbon map, absent `rA:` → `{}`, empty string → `{}`, two-char element `Cl` greedy parse
- `parseInchiWithAux — atomElements` describe block (2 tests): benzene returns `atomElements` field with 6 entries, no-`rA:` returns `atomElements: {}`

**store.test.ts additions:**
- `beforeEach` `setState` reset extended with `atomElements: {}`
- Existing `setInchiData` call updated to pass `{}` as 4th argument
- New test: `atomElements` field initialized to empty object
- New test: `setInchiData with 4 args updates atomElements` (with `fakeElements: { 1: 'C', 2: 'C' }`)
- Renamed "five v1 fields" test to "six v1 fields" + added `atomElements` assertion

All new stubs fail as expected (RED): `parseAtomElements is not a function`, `expected { ... } to have property "atomElements"`, `expected undefined to be 'C'`. Existing 29 tests still pass.

## Verification

```
npx vitest run src/lib/__tests__/layerInfo.test.ts
→ FAIL — Cannot find module '../layerInfo' (18 tests, all red)

npx vitest run src/lib/__tests__/parseAuxMapping.test.ts src/__tests__/store.test.ts
→ 7 failed | 29 passed (36 total)
  - parseAtomElements: 4 failures (function not exported yet)
  - parseInchiWithAux — atomElements: 2 failures (field not returned yet)
  - setInchiData with 4 args: 1 failure (field not in store yet)
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `054bb41` | test(03-01): add failing test stubs for layerInfo.ts exports |
| 2 | `9ad7188` | test(03-01): extend parseAuxMapping and store tests with atomElements stubs |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

All three test files are intentionally stub-only — they exist to define the RED phase contract. No implementation stubs.

## Self-Check: PASSED

- `src/lib/__tests__/layerInfo.test.ts` exists: FOUND
- `src/lib/__tests__/parseAuxMapping.test.ts` contains `parseAtomElements`: FOUND
- `src/__tests__/store.test.ts` contains `atomElements: {}` in beforeEach: FOUND
- Commit `054bb41` exists: FOUND
- Commit `9ad7188` exists: FOUND
