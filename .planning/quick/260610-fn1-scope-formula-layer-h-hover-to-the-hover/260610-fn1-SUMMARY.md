---
phase: quick-260610-fn1
plan: 01
subsystem: highlight-mapping
tags: [hover, formula-layer, explicit-h, fragment-scoping]
requires: []
provides:
  - "Fragment-scoped explicit-H hover in buildSubHoverSpecs (el==='H' branch)"
affects:
  - src/lib/highlightUtils.ts
tech-stack:
  added: []
  patterns:
    - "reverse auxMap (poolToCanon) + bonded-neighbor lookup to scope H atoms by fragment"
key-files:
  created: []
  modified:
    - src/lib/highlightUtils.ts
    - src/lib/__tests__/highlightUtils.test.ts
decisions:
  - "canonRange===undefined preserves byte-identical prior behavior (returns all hAtomPoolIds)"
  - "H–H bonds defensively skipped when finding the bonded heavy-atom neighbor"
metrics:
  duration: ~6m
  completed: 2026-06-10
requirements: [QUICK-260610-fn1]
---

# Phase quick-260610-fn1 Plan 01: Scope Formula-Layer H Hover Summary

Fixed the `el === 'H'` branch in `buildSubHoverSpecs` so explicit-H hover respects `subHover.canonRange`, matching the fragment-scoping already correct for C/N. In a dot-separated multi-fragment formula, hovering one fragment's H now highlights only that fragment's explicit H atoms instead of all fragments'.

## What Changed

- **src/lib/__tests__/highlightUtils.test.ts** — Added `describe('QUICK-260610-fn1: fragment-scoped explicit-H hover')` with 5 cases over a 2-fragment fixture (auxMap {1:10, 2:20}, hAtomPoolIds [100,200], bonds {10→100}, {20→200}):
  - `canonRange [2,2]` → `[200]`
  - `canonRange [1,1]` → `[100]`
  - no `canonRange` → `[100,200]` (unchanged)
  - `canonRange [1,2]` → `[100,200]`
  - empty `hAtomPoolIds` + `canonRange [2,2]` → `[]`
- **src/lib/highlightUtils.ts** — Modified ONLY the `if (el === 'H')` branch:
  - Kept leading `hAtomPoolIds.length === 0 → []` guard.
  - `canonRange === undefined`: returns all `hAtomPoolIds` (byte-identical prior behavior).
  - `canonRange = [lo, hi]`: builds reverse `poolToCanon` map by inverting `auxMap`; for each H pool ID, finds its bonded heavy-atom neighbor via `struct.bonds.forEach` (skips bonds not incident to the H; defensively skips H–H), looks up the neighbor's canonical, and keeps the H only if that canonical is within `[lo, hi]`. Empty result returns `[]`. Color resolution unchanged.

## TDD Ordering (RED → GREEN)

- **RED** (commit 4c92eb9): new tests committed before the fix. The two scoping cases (`[2,2]`, `[1,1]`) FAILED — they returned `[100,200]` instead of the scoped subset, reproducing the bug. The other 3 cases passed against the unmodified code (current behavior preserved).
- **GREEN** (commit 46cc077): after the fix, all 5 new tests pass. Full suite: 202 passed (197 prior + 5 new). `tsc -b` clean.

## Deviations from Plan

None - plan executed exactly as written. Touched only the `el==='H'` branch in `src/lib/highlightUtils.ts` and the test file.

## Verification

- `npx tsc -b` → exit 0, no errors.
- `npx vitest run` → 13 files, 202 tests passed.
- `git diff --name-only` across both commits: only `src/lib/highlightUtils.ts` and `src/lib/__tests__/highlightUtils.test.ts`.

## Commits

- 4c92eb9 — test(quick-260610-fn1): add failing tests for fragment-scoped explicit-H hover
- 46cc077 — fix(quick-260610-fn1): scope explicit-H hover to canonRange fragment

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: commit 4c92eb9
- FOUND: commit 46cc077
- FOUND: src/lib/highlightUtils.ts
- FOUND: poolToCanon in src/lib/highlightUtils.ts
