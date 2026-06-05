---
phase: 08-hydrogen-implicit-explicit-highlight
plan: "00"
type: tdd
wave: 1
subsystem: testing
tags: [tdd, red-phase, hydrogen-highlight, svg-badge, explicit-H]
dependency_graph:
  requires: []
  provides:
    - RED test baseline for renderHBadges/cleanHBadges (useKetcherHighlights.test.ts)
    - RED test baseline for explicit-H bond path in buildSubHoverSpecs (highlightUtils.test.ts)
  affects:
    - src/hooks/__tests__/useKetcherHighlights.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
tech_stack:
  added: []
  patterns:
    - TDD RED phase — import non-existent exports to force failures
    - makeAtomGroup helper with getBBox mock for JSDOM-incompatible SVG APIs
    - makeMockStructWithExplicitH fixture extending makeMockStruct with explicit-H bond
key_files:
  created: []
  modified:
    - src/hooks/__tests__/useKetcherHighlights.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
decisions:
  - "RED tests import renderHBadges/cleanHBadges before they exist — TypeScript/Vitest surfaced as 'not a function' error, which is the canonical RED state for this codebase"
  - "Regression test for implicit-H (bonds=[]) placed as Test 1 and confirmed PASSING immediately — validates the existing case 'hAtoms' behavior is preserved"
  - "makeAtomGroup uses (g as unknown as {getBBox()}).getBBox mock pattern since JSDOM has no native getBBox implementation"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  new_tests: 8
  tests_failing: 8
  tests_passing: 157
---

# Phase 08 Plan 00: Wave 0 TDD RED Stubs Summary

**One-liner:** RED test stubs for `renderHBadges`/`cleanHBadges` badge injection and explicit-H bond-lookup path in `buildSubHoverSpecs case 'hAtoms'`, establishing the failing baseline for Plan 08-01 to turn GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED tests — renderHBadges + cleanHBadges | 7d9533d | src/hooks/__tests__/useKetcherHighlights.test.ts |
| 2 | RED tests — case 'hAtoms' explicit-H bond path | 2fb6c49 | src/lib/__tests__/highlightUtils.test.ts |

## What Was Built

### Task 1: renderHBadges + cleanHBadges tests

Added to `src/hooks/__tests__/useKetcherHighlights.test.ts`:

- Updated import to include `renderHBadges` and `cleanHBadges` from `../useKetcherHighlights` (these do not exist yet — causes "not a function" error in tests)
- Added `import type { SubHover, AuxMap }` from `parseInchi`
- Added `makeAtomGroup(atomId, x, y)` helper: creates `<g><text data-atom-id="N"></g>` with mocked `getBBox()` returning `{x, y, width: 20, height: 16}` — needed because JSDOM does not implement SVGGraphicsElement.getBBox natively
- Added `describe('renderHBadges')` with 4 tests:
  - Injects exactly one `[data-h-badge]` per atom when group exists in SVG
  - Sets textContent to "H2" for `kind: 'hAtoms'` with `count: 2`
  - Sets textContent to "H?" and `font-style="italic"` for `kind: 'mobileH'`
  - Does not throw when atom pool ID has no matching DOM element (graceful skip)
- Added `describe('cleanHBadges')` with 2 tests:
  - Removes all `[data-h-badge]` elements from SVG root with two badge elements
  - Does not throw on empty SVG root

All 6 tests FAIL with `TypeError: (0, renderHBadges) is not a function` — correct RED state.

### Task 2: explicit-H bond path tests

Added to `src/lib/__tests__/highlightUtils.test.ts`:

- Added `makeMockStructWithExplicitH()` helper: extends benzene ring (bonds 0–5) with bond 6: `{ begin: 0, end: 6 }` representing explicit H atom (pool 6) bonded to heavy atom (pool 0)
- Added `describe('case hAtoms — Phase 8 explicit-H bond path')` inside existing `describe('buildSubHoverSpecs')` block with 3 tests:
  - **Test 1 (regression):** implicit H (pool NOT in hAtomPoolIds) → `spec.bonds` is empty — PASSES immediately (existing implementation is correct)
  - **Test 2:** explicit H (pool IN hAtomPoolIds) → `spec.atoms` includes both H pool ID (6) and heavy atom pool ID (0); `spec.bonds` includes bond ID (6) — FAILS (current implementation returns `bonds: []`)
  - **Test 3:** mixed atoms (some explicit, some implicit) → `spec.atoms` includes all; `spec.bonds` includes only explicit-H bond ID — FAILS (same reason)

## Verification Results

```
Tests  8 failed | 157 passed (165 total)
```

- 157 passing = 156 original tests + 1 new regression test (Test 1 in Task 2)
- 8 failing = 6 renderHBadges/cleanHBadges + 2 explicit-H bond path tests
- No changes to any production source file
- All 156 pre-existing tests remain green

## Deviations from Plan

None — plan executed exactly as written.

The plan specified "Import line will cause a TypeScript/Vitest error" — this manifested as `TypeError: (0, renderHBadges) is not a function` which is the correct RED state for Vitest's SSR module loading (the named export doesn't exist, so it resolves to `undefined`).

## TDD Gate Compliance

- RED gate (test commit): `7d9533d` — `test(08-00): RED — renderHBadges + cleanHBadges unit test stubs`
- RED gate (test commit): `2fb6c49` — `test(08-00): RED — explicit-H bond path test stubs in highlightUtils`

Both RED gate commits exist. GREEN gate will be established by Plan 08-01.

## Known Stubs

None — this plan contains only test files. No production code stubs.

## Threat Flags

None — test-only changes with no new network endpoints, auth paths, or external surfaces.

## Self-Check: PASSED

- [x] `src/hooks/__tests__/useKetcherHighlights.test.ts` modified — FOUND
- [x] `src/lib/__tests__/highlightUtils.test.ts` modified — FOUND
- [x] Commit `7d9533d` — FOUND
- [x] Commit `2fb6c49` — FOUND
- [x] 8 tests failing, 157 passing — VERIFIED
