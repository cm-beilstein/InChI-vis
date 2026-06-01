---
phase: "07"
plan: "00"
subsystem: testing
tags: [tdd, red-state, multi-fragment, p-layer, copy-button, inchi-06, inchi-07, plsh-04]
dependency_graph:
  requires: []
  provides:
    - "RED tests for multi-fragment parseAuxMapping N: field with per-fragment canonical offset"
    - "RED tests for enrichLayers c/h layer multi-fragment offset"
    - "RED tests for p-layer buildHighlightSpecs heteroatom highlight"
    - "RED tests for InchiSection copy button rendering and clipboard interaction"
  affects:
    - src/lib/__tests__/parseAuxMapping.test.ts
    - src/lib/__tests__/parseInchi.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
    - src/__tests__/InchiSection.test.tsx
tech_stack:
  added: []
  patterns:
    - "Object.defineProperty for navigator.clipboard mock in jsdom (getter-only property)"
    - "mutable module-scope variables for per-test store state control"
key_files:
  created: []
  modified:
    - src/lib/__tests__/parseAuxMapping.test.ts
    - src/lib/__tests__/parseInchi.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
    - src/__tests__/InchiSection.test.tsx
decisions:
  - "Use Object.defineProperty (not Object.assign) for navigator.clipboard mock — jsdom exposes clipboard as getter-only property"
  - "Test C-D-E-F-G for copy button via @testing-library/react fireEvent + act pattern"
  - "mockInchi module-scope variable added alongside existing mockLayers to allow per-test inchi control"
metrics:
  duration: "12min"
  completed_date: "2026-06-01"
---

# Phase 7 Plan 0: RED Tests for Multi-Fragment, p-Layer, and Copy Button Summary

**One-liner:** Establishes TDD RED baseline — 10 new failing tests covering multi-fragment InChI parsing offset, p-layer heteroatom highlighting, and copy-to-clipboard button behavior.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Write RED tests for multi-fragment parseAuxMapping and enrichLayers | d719f48 | src/lib/__tests__/parseAuxMapping.test.ts, src/lib/__tests__/parseInchi.test.ts |
| 2 | Write RED tests for p-layer highlight and copy button | 05663dd | src/lib/__tests__/highlightUtils.test.ts, src/__tests__/InchiSection.test.tsx |

## RED State Summary

| File | New Failing Tests | Existing Tests |
|------|------------------|----------------|
| parseAuxMapping.test.ts | 2 failing (Test A, Test C) | 6 passing |
| parseInchi.test.ts | 3 failing (Test D x2, Test E) | 12 passing |
| highlightUtils.test.ts | 1 failing (INCHI-07 Test A) | 34 passing |
| InchiSection.test.tsx | 4 failing (PLSH-04 Tests C, E, F, G) | 6 passing |
| **Total** | **10 failing** | **125 passing** |

## What Each Test Covers

### parseAuxMapping.test.ts — INCHI-06 describe block

- **Test A**: Two-fragment N: value `7,1,2,3,4,5,6;8,9,10,11,12,13` with toluene(7)+benzene(6). Asserts `auxMap[1]=6`, `auxMap[2]=0`, `auxMap[7]=5` (fragment 1) and `auxMap[8]=7`, `auxMap[9]=8`, `auxMap[13]=12` (fragment 2 with offset=7). Also verifies 13 keys total.
- **Test B**: Regression — single-fragment N: without semicolon still maps correctly (passes in both RED and GREEN states).
- **Test C**: Integration via `parseInchiWithAux` — asserts `auxMap[8]=7` for fragment-2's first atom.

### parseInchi.test.ts — INCHI-06 describe block

- **Test D (formula atoms)**: `formulaLayer.atoms === [1..13]` for `C7H8.C6H6` — already passes because `countFormulaAtoms` regex skips `.` naturally.
- **Test D (no spurious bond)**: `cLayer.bonds` must NOT contain `[7, 1]` — currently fails because `parseConnectionBonds` treats `;` as an unknown char and creates a cross-fragment bond.
- **Test D (atoms no overflow)**: `cLayer.atoms` contains no index > 13 — passes in RED (atoms are 1..7 from fragment 1 only; `;` is skipped silently).
- **Test D (fragment-2 ring closure)**: `cLayer.bonds` must contain `[10, 8]` (fragment-2 ring closure `3→1` + offset=7) — fails because offset is not applied.
- **Test E**: `hLayer.atoms` must include canonical 8 (fragment-2 atom 1 with offset=7) — fails because offset is not applied.

### highlightUtils.test.ts — INCHI-07 describe block

- **Test A**: `buildHighlightSpecs(pLayer, ...)` with N heteroatom (canonical 3) returns non-empty specs with `atoms=[2]` (Ketcher 0-based) and `color='--c-proton'` — fails because `p` is in NON_SPATIAL list.
- **Test B**: `buildHighlightSpecs(pLayer, ...)` with all-carbon `atomElements` returns `[]` — passes in RED (p already returns [] via NON_SPATIAL guard, and will return [] after implementation too due to no heteroatoms).

### InchiSection.test.tsx — PLSH-04 describe block

- **Test C**: Copy button present when `layers` non-empty and `inchi` set — fails (button not implemented).
- **Test D**: Copy button NOT present when `layers` empty — passes (button doesn't exist at all).
- **Test E**: Click calls `navigator.clipboard.writeText(inchi)` — fails (no button).
- **Test F**: `Copied!` text appears after click — fails (no button).
- **Test G**: `Copied!` text gone after 1500ms (fake timers) — fails (no button).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] navigator.clipboard mock method changed from Object.assign to Object.defineProperty**
- **Found during:** Task 2 first test run
- **Issue:** `Object.assign(navigator, { clipboard: ... })` throws `TypeError: Cannot set property clipboard of [object Object] which has only a getter` in Vitest's jsdom environment
- **Fix:** Used `Object.defineProperty(navigator, 'clipboard', { value: ..., writable: true, configurable: true })` instead
- **Files modified:** src/__tests__/InchiSection.test.tsx
- **Commit:** 05663dd (included in the same task commit)

## Known Stubs

None — this plan creates test files only, no production code changes.

## Threat Flags

None — this plan contains test-only changes; no new security surface introduced.

## Self-Check: PASSED

- d719f48 exists: `git log --oneline | grep d719f48` ✓
- 05663dd exists: `git log --oneline | grep 05663dd` ✓
- parseAuxMapping.test.ts modified: ✓
- parseInchi.test.ts modified: ✓
- highlightUtils.test.ts modified: ✓
- InchiSection.test.tsx modified: ✓
- 10 failing tests, 125 passing: confirmed by full test run
