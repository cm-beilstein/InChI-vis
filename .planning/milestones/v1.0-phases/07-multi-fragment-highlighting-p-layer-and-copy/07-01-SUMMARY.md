---
phase: "07"
plan: "01"
subsystem: "inchi-parsing"
tags: ["multi-fragment", "parseAuxMapping", "enrichLayers", "offset-calculation", "bug-fix"]
dependency_graph:
  requires: ["07-00"]
  provides: ["multi-fragment canonical index mapping", "per-fragment c/h/t/b layer enrichment"]
  affects: ["src/lib/parseAuxMapping.ts", "src/lib/parseInchi.ts"]
tech_stack:
  added: []
  patterns: ["per-fragment canonical offset accumulation", "N: semicolon-split for AuxInfo", "layer text semicolon-split for multi-fragment enrichment"]
key_files:
  created: []
  modified:
    - src/lib/parseAuxMapping.ts
    - src/lib/parseInchi.ts
decisions:
  - "Export countFormulaAtoms from parseInchi.ts (Option A) to avoid duplication in parseAuxMapping.ts"
  - "Multi-fragment detection via formulaText.includes('.') — dot separator is canonical in InChI formula layer"
  - "Single-fragment fallback preserved via else branch — zero risk of regression"
metrics:
  duration: "8min"
  completed_date: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 7 Plan 01: Multi-Fragment Canonical Index Mapping — Summary

**One-liner:** Per-fragment canonical offset fix in parseAuxMapping and enrichLayers prevents spurious cross-fragment atom/bond highlights for molecules like toluene+benzene.

## What Was Built

Fixed two pure library modules so that multi-fragment InChI strings (e.g. `InChI=1S/C7H8.C6H6/c.../h...`) produce correct canonical → Ketcher-index maps and correct atom/bond sets per layer. Without this fix, hovering the c-layer for a two-fragment molecule highlighted fragment-1 atoms even when the bond belonged to fragment 2.

### Task 1: Fix parseAuxMapping — per-fragment canonical offset (commit 1e805ab)

**src/lib/parseInchi.ts:** Exported `countFormulaAtoms` (was previously module-private) so `parseAuxMapping.ts` can import it without duplicating the formula-parsing logic.

**src/lib/parseAuxMapping.ts:**
- Added optional `formulaText?: string` parameter to `parseAuxMapping`
- When `formulaText` contains `.` (multi-fragment): splits formula by `.` to get per-fragment heavy-atom counts; splits the N: value by `;` to get per-fragment draw-order lists; accumulates `canonicalOffset` (sum of prior-fragment atom counts) before assigning each canonical → Ketcher-index entry
- Single-fragment path (no `.` in formula) is unchanged — backward compatible
- `parseInchiWithAux` updated to find `formulaLayer` after parsing and pass `formulaLayer?.text ?? ''` to `parseAuxMapping`

### Task 2: Fix enrichLayers — per-fragment c/h/t/b parsing (commit 6340cdf)

**src/lib/parseInchi.ts:** Rewrote `enrichLayers` cases for `c`, `h`, `t`, `b` layers to split layer text on `;` and apply a `cumulativeOffset` per fragment derived from `fragmentAtomCounts`.

- **c-layer:** Each fragment's bond text parsed separately; atom pair indices offset before accumulation → no spurious `[7, 1]` cross-fragment bond for toluene+benzene
- **h-layer:** Fixed H and mobile H atom indices both offset per fragment → fragment-2 atom 1 becomes canonical 8 (= 1 + offset 7)
- **t/b-layer:** Stereo atom indices offset per fragment
- **Single-fragment safety:** `split(';')` on text with no semicolon yields `[fullText]`; offset for the single fragment is 0 — no behavioral change

## Test Results

All INCHI-06 RED tests from 07-00 turn GREEN:

| Test | Description | Result |
|------|-------------|--------|
| Test A | Two-fragment N: maps fragment-1 atoms correctly | PASS |
| Test B | Single-fragment N: without semicolon (regression) | PASS |
| Test C | auxMap[8] for fragment-2 first atom equals 7 | PASS |
| Test D (×4) | formulaLayer.atoms=13, no [7,1] bond, fragment-2 ring closure [10,8] | PASS |
| Test E | hLayer.atoms includes canonical 8 (fragment-2 atom 1 + offset 7) | PASS |

Full suite: 130 tests passing (pre-existing 5 RED tests for 07-02 p-layer/copy features remain failing — expected).

## Deviations from Plan

None — plan executed exactly as written. Option A (export `countFormulaAtoms`) was chosen per plan directive.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both modified files are pure parsing utilities with no browser globals or I/O. The threat mitigations in the plan's threat register are satisfied:

- T-07-01: `isNaN(n)` guard on `parseInt` prevents NaN assignment in `parseAuxMapping`
- T-07-02: Empty fragment text produces empty bond/atom sets in `enrichLayers`; cumulativeOffset is additive only

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/parseAuxMapping.ts | FOUND |
| src/lib/parseInchi.ts | FOUND |
| 07-01-SUMMARY.md | FOUND |
| Task 1 commit 1e805ab | FOUND |
| Task 2 commit 6340cdf | FOUND |
