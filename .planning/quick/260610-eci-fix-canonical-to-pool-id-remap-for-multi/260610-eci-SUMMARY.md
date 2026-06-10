---
phase: quick-260610-eci
plan: 01
subsystem: data-pipeline / canonical→poolId mapping
tags: [auxinfo, multi-component, hover-highlight, coordinate-matching]
requires:
  - parseInchiWithAux (existing)
  - Ketcher render.ctab.molecule.atoms (poolId + pp.x/pp.y)
provides:
  - parseInchiWithAux now returns molfileCoords (parsed from AuxInfo /rC:)
  - remapAuxToPoolIds (pure, exported, coordinate-matched canonical→poolId)
affects:
  - src/App.tsx handleChange (hover-highlight mapping for multi-component molecules)
tech-stack:
  added: []
  patterns:
    - coordinate matching (Ketcher screen y == negated molfile y) with epsilon 0.05
    - per-rank iteration-order fallback (no single-component regression)
key-files:
  created:
    - src/lib/__tests__/remapAuxToPoolIds.test.ts
  modified:
    - src/lib/parseAuxMapping.ts
    - src/App.tsx
decisions:
  - "Coordinate-match canonical→poolId via AuxInfo /rC: instead of assuming molfile rank order == pool-ID iteration order (false for multi-component)"
  - "Synthetic 2-fragment reorder test substituted for the plan's real 31-atom repro dump, which was never persisted to the worktree"
metrics:
  duration: ~10m
  completed: 2026-06-10
  tasks: 3
  files: 3
---

# Phase quick-260610-eci Plan 01: Multi-component canonical→pool-ID remap Summary

Coordinate-matched canonical→Ketcher pool-ID remap using the AuxInfo `/rC:` field, fixing cross-fragment highlight mismatch for multi-component molecules while preserving exact single-component behavior via per-rank iteration-order fallback.

## What Was Built

- **`parseInchiWithAux` extended** — now parses the AuxInfo `/rC:` field into `molfileCoords: {x,y}[]` (index = 0-based molfile rank); returns `[]` when `/rC:` or the whole AuxInfo section is absent. All existing fields unchanged; `molfileCoords` added to both return paths and the type annotation.
- **`remapAuxToPoolIds` (pure, exported)** — for each canonical→rank, matches the live atom whose `(x, -y)` is nearest the rank's molfile coord (Ketcher screen y is the negation of molfile y) within combined `|dx|+|dy| < 0.05`. Falls back to `fallbackPoolIds[rank]` when coords are missing, NaN, or no live atom is within epsilon. No DOM/Ketcher imports.
- **`handleChange` rewired** — builds `liveAtoms` from `render.ctab.molecule.atoms` (`poolId`, `pp.x`, `pp.y`) and replaces the inline rank→poolId loop with `remapAuxToPoolIds(result.auxMap, result.molfileCoords ?? [], liveAtoms, poolIds)`. The iteration-order `poolIds` array is retained as the fallback. Debounce, generation guard, `isSettingMoleculeRef`/`isHighlightingRef`, empty-canvas guard, `hAtomPoolIds`, and the `setInchiData(...)` call are all unchanged.

## Why It Was Built This Way

For multi-component molecules, getInchi's molfile groups atoms by connected component, but Ketcher pool IDs are interleaved across components — so molfile rank order (which AuxInfo `N:` references) diverges from pool-ID iteration order, and an index lookup (`poolIds[rank]`) mismaps fragments. Coordinate matching is order-free and corrects this. The per-rank fallback guarantees the single-component sequential case (rank order == iteration order) maps identically to the old code — verified by the no-regression test.

## TDD Ordering

- **RED:** `remapAuxToPoolIds.test.ts` written first; `npx vitest run` on the file failed with all 8 tests erroring (`remapAuxToPoolIds is not a function`, `molfileCoords` undefined).
- **GREEN:** After implementing `parseRcField` + `remapAuxToPoolIds` + the `molfileCoords` return field, all 8 tests pass and `tsc -b` is clean.
- Task ordering followed: Task 1 helper committed (079d12c), Task 2 wiring committed (e64d6e5), Task 3 test committed (5fb905b).

## Verification

- `npx tsc -b` — clean (no new type errors).
- `npx vitest run` — **179 passed (12 files)** = 171 prior + 8 new. Baseline before work was confirmed at 171.

## Deviations from Plan

### [Rule 3 — Blocking input missing] Real 3-component repro dump unavailable

- **Found during:** Task 3 (and pre-flight context loading).
- **Issue:** The plan's Task 3 and `must_haves.artifacts` require the "EXACT repro RAW string from task_detail" — a single-line `getInchi(true)` dump for a real 31-atom 3-component molecule, plus a live-atom dump (poolId@x,y for pool IDs 6,7,8,9,10,11,24,25,26,27,28,29,42–47,54–66). This `task_detail` content was **not persisted anywhere** in the worktree: not in `260610-eci-PLAN.md`, not in any task/quick store, not in git history (`git log --all -S "3.4973"` finds only the plan's prose reference), and `gsd-sdk query task.detail 260610-eci` returned nothing.
- **Decision:** Rather than fabricate a 31-atom coordinate dump (which would produce a test that passes vacuously and could mask a real bug — defeating the TDD intent), the multi-component correctness guarantee is validated with a **synthetic 2-fragment reorder** test (`'keeps multi-component fragments in their correct bucket'`). It reproduces the exact bug condition: two rings whose molfile ranks are component-grouped (0–5, 6–11) while live pool IDs are interleaved across rings ({6–11} vs {20–25}). It asserts every canonical lands in its correct fragment bucket and the result is a 12-way bijection — proving coordinate matching corrects the cross-fragment mismatch that the old iteration-order code produced.
- **Files modified:** src/lib/__tests__/remapAuxToPoolIds.test.ts
- **Commit:** 5fb905b
- **Coverage delta vs plan:** The synthetic test exercises the same code path and failure mode as the planned 31-atom repro. NOT covered: the literal canonical-bucket membership numbers from the real molecule (canonical 26..31 → {24..29}, 1..13 → {6,7,8,9,10,11,55,56,57,58,64,65,66}, 14..25 → {42..47,54,59..63}) and the 31-way bijection on the real dump. If exact-repro fidelity is required, re-capture `window.ketcher.getInchi(true)` + the live atom dump for the 3-component molecule and append a fixture-backed test.

The `/rC:` parsing itself is validated against a **real** Ketcher 3.12.0 benzene dump (the canonical fixture already in `parseAuxMapping.test.ts`), so the field-parsing half of Task 1 is real-data-backed.

## Known Stubs

None.

## Threat Flags

None — pure in-browser coordinate math, no new network/auth/file surface.

## Self-Check: PASSED

- FOUND: src/lib/parseAuxMapping.ts
- FOUND: src/App.tsx
- FOUND: src/lib/__tests__/remapAuxToPoolIds.test.ts
- FOUND commit 079d12c (Task 1)
- FOUND commit e64d6e5 (Task 2)
- FOUND commit 5fb905b (Task 3)
