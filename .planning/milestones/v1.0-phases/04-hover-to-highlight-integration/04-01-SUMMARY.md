---
phase: 04-hover-to-highlight-integration
plan: "01"
subsystem: highlight-utils
tags:
  - tdd
  - wave-0
  - test-scaffolding
  - highlight
dependency_graph:
  requires:
    - src/lib/parseInchi.ts
    - src/lib/layerInfo.ts
  provides:
    - src/lib/highlightUtils.ts (HighlightSpec type, stub functions)
    - src/hooks/useKetcherHighlights.ts (stub hook + applyKetcherHighlights)
  affects:
    - src/lib/__tests__/highlightUtils.test.ts
    - src/hooks/__tests__/useKetcherHighlights.test.ts
tech_stack:
  added: []
  patterns:
    - TDD Red-Green-Refactor (Wave 0 = RED phase)
    - Dependency injection for resolveVarFn (makes pure functions testable in Node)
    - StructLike interface for struct duck-typing in tests
key_files:
  created:
    - src/lib/highlightUtils.ts
    - src/lib/__tests__/highlightUtils.test.ts
    - src/hooks/useKetcherHighlights.ts
    - src/hooks/__tests__/useKetcherHighlights.test.ts
  modified: []
decisions:
  - resolveVarFn injected as parameter to buildHighlightSpecs/buildSubHoverSpecs so functions are testable in Node without getComputedStyle
  - StructLike interface defined in highlightUtils.ts to allow mock struct in tests without importing Ketcher types
  - applyKetcherHighlights extracted as pure function (no React context) to enable direct unit testing without renderHook
metrics:
  duration: "~3 min"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
  completed_date: "2026-05-21"
requirements:
  - INCHI-03
  - INCHI-04
---

# Phase 4 Plan 01: Wave 0 Test Scaffolding (RED) Summary

**One-liner:** TDD Wave 0 — failing test suite and function-signature stubs for highlight spec builders, establishing the interface contract for Plan 02 implementation.

## What Was Built

Wave 0 creates the test contracts and stub implementations that Plan 02 will implement against. No production logic was written — all stubs return `[]` or do nothing, ensuring every substantive test fails.

### Files Created

**`src/lib/highlightUtils.ts`** — skeleton with:
- `HighlightSpec` type alias (atoms, bonds, rgroupAttachmentPoints, color)
- `StructLike` interface (findBondId + bonds.forEach — duck-typed for testability)
- `resolveVar()` — production browser implementation (calls getComputedStyle)
- `buildHighlightSpecs()` — stub returns `[]`
- `buildSubHoverSpecs()` — stub returns `[]`
- Re-exports of layerInfo utilities used by the production hook

**`src/lib/__tests__/highlightUtils.test.ts`** — 29 tests covering:
- INCHI-03: all 11 layer types (formula, c, h, t, b, m, s, version, q, p, i)
- INCHI-04: all 5 sub-hover kinds (element, atom, stereo, hAtoms, mobileH)
- Edge cases: mixed element colors, mobile hydrogen, no-t-layer guard for m/s

**`src/hooks/useKetcherHighlights.ts`** — stub exports `useKetcherHighlights` and `applyKetcherHighlights` (both no-ops)

**`src/hooks/__tests__/useKetcherHighlights.test.ts`** — 3 tests for `applyKetcherHighlights` lifecycle:
- clear() called before create()
- clear() only when specs is empty
- variadic create() with multiple specs

## RED State Verification

```
Test Files  2 failed | 4 passed (6)
Tests  25 failed | 68 passed (93)
```

- 22 tests fail in highlightUtils.test.ts (stubs return `[]` instead of specs)
- 3 tests fail in useKetcherHighlights.test.ts (stub does nothing)
- 7 tests in highlightUtils.test.ts correctly PASS — these are the "no canvas highlight" cases (b, version, q, p, i layers, m-layer-no-t) where `[]` is the correct return value
- All 4 pre-existing test files pass unchanged

## Deviations from Plan

### Auto-applied adjustments

**1. [Rule 2 - Missing functionality] Added re-exports to highlightUtils.ts**
- **Found during:** Task 1
- **Issue:** The production hook (Plan 02) will need layerInfo utilities; having them re-exported from highlightUtils.ts avoids a double-import pattern
- **Fix:** Added re-export of elementColor, hydroColor, parityColor, parseStereoParities, parseHydrogenAtoms, parseMobileHydrogens, parseStereoAtoms at bottom of stub
- **Files modified:** src/lib/highlightUtils.ts

**2. [Rule 2 - Missing test coverage] Added m-layer-no-t-layer edge case test**
- **Found during:** Task 1 — RESEARCH.md Pattern 5 documents this as Pitfall 3
- **Issue:** Plan behavior block listed the m-layer test but not the guard case
- **Fix:** Added "m-layer with no t-layer: returns empty array" test to ensure the guard is covered
- **Files modified:** src/lib/__tests__/highlightUtils.test.ts

## Known Stubs

| File | Export | Reason |
|------|--------|--------|
| src/lib/highlightUtils.ts | buildHighlightSpecs | Intentional Wave 0 stub — Plan 02 implements |
| src/lib/highlightUtils.ts | buildSubHoverSpecs | Intentional Wave 0 stub — Plan 02 implements |
| src/hooks/useKetcherHighlights.ts | useKetcherHighlights | Intentional Wave 0 stub — Plan 02 implements |
| src/hooks/useKetcherHighlights.ts | applyKetcherHighlights | Intentional Wave 0 stub — Plan 02 implements |

These stubs are intentional and required for the RED state. Plan 02 replaces them with full implementations.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Test files contain only synthetic fixture data (benzene-like 6-atom molecule, mock atom IDs).

## Self-Check: PASSED

Files created:
- FOUND: src/lib/highlightUtils.ts
- FOUND: src/lib/__tests__/highlightUtils.test.ts
- FOUND: src/hooks/useKetcherHighlights.ts
- FOUND: src/hooks/__tests__/useKetcherHighlights.test.ts

Commits:
- FOUND: d943804 (test(04-01): add failing tests for buildHighlightSpecs and buildSubHoverSpecs)
- FOUND: 00155fb (test(04-01): add failing hook tests for applyKetcherHighlights)

TypeScript: clean (npx tsc --noEmit exits 0)
