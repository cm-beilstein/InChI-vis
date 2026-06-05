---
phase: 08-hydrogen-implicit-explicit-highlight
plan: "01"
subsystem: hooks/highlights
tags: [tdd, green-phase, hydrogen-highlight, svg-badge, explicit-H, dom-injection]
dependency_graph:
  requires:
    - 08-00 (RED test stubs for renderHBadges/cleanHBadges and explicit-H bond path)
  provides:
    - renderHBadges exported from src/hooks/useKetcherHighlights.ts
    - cleanHBadges exported from src/hooks/useKetcherHighlights.ts
    - explicit-H bond lookup in case 'hAtoms' of buildSubHoverSpecs
  affects:
    - src/hooks/useKetcherHighlights.ts
    - src/lib/highlightUtils.ts
tech_stack:
  added: []
  patterns:
    - SVG DOM injection via document.createElementNS (same as whiteAtomLabels pattern)
    - data-attribute badge cleanup via querySelectorAll('[data-h-badge]')
    - struct.bonds.forEach for explicit-H bond lookup (same as case 'atom' pattern)
    - cleanHBadges on all early-return paths to prevent badge persistence (D-03, D-06)
key_files:
  created: []
  modified:
    - src/hooks/useKetcherHighlights.ts
    - src/lib/highlightUtils.ts
decisions:
  - "renderHBadges appends badges to svgRoot via document.createElementNS — no React/JSX needed for this imperative SVG mutation"
  - "cleanHBadges called on all 4 paths (3 early-return + 1 main) before any return/badges render — prevents stale badge accumulation on layer navigation"
  - "explicitHKAtoms pushed after heavyKAtoms in allAtoms so heavy atoms appear first in the spec array (consistent with original order)"
  - "SubHover/AuxMap imported as types from parseInchi — no new runtime dependencies"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  new_tests: 0
  tests_passing: 165
  tests_failing: 0
---

# Phase 08 Plan 01: GREEN Pass — renderHBadges, cleanHBadges, explicit-H bond highlight Summary

**One-liner:** GREEN pass turning all 8 Wave 0 RED stubs to passing — SVG badge injection for h-layer sub-token hover (renderHBadges/cleanHBadges) and explicit-H bond lookup in buildSubHoverSpecs case 'hAtoms'.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add renderHBadges + cleanHBadges; wire into hook | 729deb6 | src/hooks/useKetcherHighlights.ts |
| 2 | Extend case 'hAtoms' with explicit-H bond lookup | 0a3540b | src/lib/highlightUtils.ts |

## What Was Built

### Task 1: renderHBadges + cleanHBadges + hook wiring

Modified `src/hooks/useKetcherHighlights.ts`:

- Added `import type { SubHover, AuxMap } from '../lib/parseInchi'` for type signatures
- Added `export function renderHBadges(svgRoot, subHover, auxMap, resolveVarFn)`:
  - Iterates `subHover.atoms`, maps each canonical to pool ID via `auxMap`
  - Finds SVG element via `svgRoot.querySelector('[data-atom-id="${poolId}"]')`
  - Reads atom center from parent group `getBBox()` (Assumption A1 — verified in tests via mock)
  - Creates `<text data-h-badge="true">` at `(cx, cy+20)` with correct text and fill color
  - Text: `kind='hAtoms'` count=1 → "H", count=N → "HN"; `kind='mobileH'` → "H?" with font-style italic
  - Fill resolved via `resolveVarFn('--c-hydro-N')` or `resolveVarFn('--c-hydro-mobile')`
  - Guards on null element and missing/null `getBBox()` return
- Added `export function cleanHBadges(svgRoot)`:
  - `svgRoot.querySelectorAll('[data-h-badge]').forEach(el => el.remove())`
- Modified `useKetcherHighlights` hook:
  - All 3 early-return paths (`hoverIdx===null`, `!layer`, non-spatial layer types) now call `cleanHBadges(svgRoot)` after `highlights.clear()` before `return`
  - Main highlight path: `cleanHBadges(svgRoot)` called unconditionally after `applyKetcherHighlights`
  - `renderHBadges` called after `whiteAtomLabels` when `subHover.kind === 'hAtoms' || 'mobileH'` and `specs.length > 0`

### Task 2: explicit-H bond lookup in case 'hAtoms'

Modified `src/lib/highlightUtils.ts` case `'hAtoms'` in `buildSubHoverSpecs`:

- Replaced flat `kAtoms` map-filter with explicit/implicit branch logic
- Iterates `subHover.atoms`, maps each canonical to pool ID via `auxMap`
- Branch on `hAtomPoolIds.includes(kId)`:
  - **Explicit H branch**: push `kId` to `explicitHKAtoms`; iterate `struct.bonds.forEach` to find bonded heavy atom and bond ID (same pattern as `case 'atom'`)
  - **Implicit H branch**: push `kId` to `heavyKAtoms` only
- `allAtoms = [...heavyKAtoms, ...explicitHKAtoms]`; return `[{ atoms: allAtoms, bonds: bondIds, ... }]`
- `case 'mobileH'` left unchanged (already correct)

## Verification Results

```
Test Files  11 passed (11)
Tests  165 passed (165)
```

- 157 pre-existing tests: all GREEN
- 8 Wave 0 RED stubs: all turned GREEN
  - 6 renderHBadges/cleanHBadges tests (useKetcherHighlights.test.ts)
  - 2 explicit-H bond path tests (highlightUtils.test.ts)
  - 1 implicit-H regression test was already GREEN in Wave 0
- `npx tsc --noEmit` exits 0

## Deviations from Plan

None — plan executed exactly as written.

The plan noted cleanHBadges count should return 4, which counts call sites. Actual grep returns 5 because the function definition line is also counted. The 4 call sites are correct (3 early-return paths + 1 main path).

## Known Stubs

None — all badge positioning and color resolution is wired. Assumption A1 (getBBox on parent group) is noted as needing empirical verification during manual testing; tests pass with mocked getBBox.

## Threat Flags

None — SVG badge injection uses only computed strings ("H", "H2", "H?") derived from parsed InChI data (WASM-computed, not user text). No XSS surface (T-08-01 disposition: accept).

## Self-Check: PASSED

- [x] `src/hooks/useKetcherHighlights.ts` modified — FOUND
- [x] `src/lib/highlightUtils.ts` modified — FOUND
- [x] `export function renderHBadges` in useKetcherHighlights.ts — FOUND
- [x] `export function cleanHBadges` in useKetcherHighlights.ts — FOUND
- [x] `hAtomPoolIds.includes(kId)` in highlightUtils.ts — FOUND
- [x] 4 cleanHBadges call sites in hook — VERIFIED
- [x] Commit `729deb6` — FOUND
- [x] Commit `0a3540b` — FOUND
- [x] 165 tests passing, 0 failing — VERIFIED
- [x] `npx tsc --noEmit` exits 0 — VERIFIED
