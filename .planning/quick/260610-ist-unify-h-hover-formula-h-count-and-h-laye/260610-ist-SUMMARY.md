---
phase: quick-260610-ist
plan: 01
subsystem: canvas-highlight
tags: [hover, hydrogen, badges, formula-layer, h-layer, multi-fragment]
requires:
  - parseInchi (expandLayerText, formulaFragmentCounts, parseHydrogenAtoms)
  - existing renderHBadges skip-explicit-H logic
provides:
  - explicit-H-only hAtoms highlight contract (no heavy fill, no bonds)
  - always-on implicit-H badges for /h tokens (decoupled from specs.length)
  - renderFormulaHBadges (fragment-scoped formula-H implicit badges)
affects:
  - src/lib/highlightUtils.ts (buildSubHoverSpecs case 'hAtoms')
  - src/hooks/useKetcherHighlights.ts (effect badge gating + new helper)
tech-stack:
  added: []
  patterns:
    - cumulative per-fragment offset to recover global-canonical → declared-H (mirrors case 'h')
    - synthetic hAtoms subHover per count-group to reuse renderHBadges
key-files:
  created: []
  modified:
    - src/lib/highlightUtils.ts
    - src/hooks/useKetcherHighlights.ts
    - src/lib/__tests__/highlightUtils.test.ts
    - src/hooks/__tests__/useKetcherHighlights.test.ts
decisions:
  - "hAtoms specs are explicit-H-only; implicit H are badges, never fills (reverses Phase 8)"
  - "renderFormulaHBadges signature: (svgRoot, canonRange, layers, auxMap, resolveVarFn, hAtomPoolIds, struct)"
  - "Badge counts derived from parsed /h-layer only — InChI string never reconstructed (passthrough rule)"
metrics:
  duration: ~9m
  completed: 2026-06-10
  tasks: 2
  files: 4
  tests: 206 passing (baseline 202 + 4 new formula-H tests)
---

# Quick Task 260610-ist: Unify H Hover (Formula-H Count and /h Layer) Summary

Unified hydrogen hover so both the formula-layer H token and the /h-layer highlight ONLY explicit (drawn) H atoms and render implicit-H count badges on heavy atoms — with no heavy-atom fill and no bonds — all fragment-scoped via `canonRange`. Mobile-H untouched.

## What Changed

### Task 1 (RED) — commit `56f0a25`
- Rewrote the `case hAtoms` describe block in `highlightUtils.test.ts` to the new explicit-H-only contract: specs contain only explicit-H pool IDs, never the bonded heavy atom, and `bonds` is always empty. The implicit-only token now asserts the heavy atom is NOT present and bonds are empty.
- Updated the two INCHI-04 hAtoms tests to supply matching `hAtomPoolIds` so an explicit-H spec is emitted (and assert no bonds), keeping them meaningful under the new contract.
- Added the `renderFormulaHBadges` describe block in `useKetcherHighlights.test.ts` driving the new helper: one implicit badge per in-range H-bearing heavy atom, no cross-fragment leakage, skip of fully-explicit atoms, and whole-/h-layer behavior when `canonRange` is undefined.
- Confirmed RED: 8 failures (4 hAtoms contract + 4 helper-not-a-function), mobileH and unrelated tests green.

### Task 2 (GREEN) — commit `ff7c4ea`
- `buildSubHoverSpecs` `case 'hAtoms'` now collects ONLY canonical atoms whose pool ID is in `hAtomPoolIds`, returns a single `{atoms, bonds:[], ...}` spec (or `[]` if none). Dropped all heavy-atom and bond collection.
- Hook effect: `renderHBadges` for `hAtoms`/`mobileH` moved OUT of the `specs.length > 0` guard so purely-implicit tokens still badge; `whiteAtomLabels` stays guarded; `cleanHBadges` still precedes every badge path.
- Added exported `renderFormulaHBadges(svgRoot, canonRange, layers, auxMap, resolveVarFn, hAtomPoolIds, struct)` — derives global-canonical → declared-H from the /h-layer (`expandLayerText` + `formulaFragmentCounts` + `parseHydrogenAtoms` with cumulative offset, exactly like `case 'h'`), filters by `canonRange`, groups by count, and calls `renderHBadges` once per count group with a synthetic `hAtoms` subHover.
- Hook effect calls `renderFormulaHBadges` when `subHover.kind === 'element' && subHover.el === 'H'`.
- Re-exported `formulaFragmentCounts` and `expandLayerText` from `highlightUtils.ts`.

## Verification
- `npx tsc -b` — clean (no type errors).
- `npx vitest run` — 206 passing (baseline 202 + 4 new formula-H tests; rewritten hAtoms tests folded in). No drop below baseline.
- hAtoms specs never contain heavy-atom pool IDs or bond IDs (asserted).
- Purely-implicit /h token still badges (badge path decoupled from `specs.length`).
- Formula-H badges only heavy atoms within `canonRange` — no cross-fragment leakage (asserted).
- Mobile-H tests unchanged and green.

## Deviations from Plan
None — plan executed exactly as written. The hAtoms contract reversal and INCHI-04 test updates were the intended behavior change (not regressions), as the plan stated.

## Threat Model
- T-quick260610-01 (Tampering / InChI reconstruction): mitigated. `renderFormulaHBadges` reads counts from the already-parsed /h-layer via `parseHydrogenAtoms` over `expandLayerText`; the InChI string is never re-joined. Passthrough rule honored.
- T-quick260610-02 (Information disclosure): accepted — pure client-side UI feature.

## Notes
- Live Ketcher WASM canvas cannot run in this environment; correctness is proven via unit tests that exercise the new contract directly (synthetic structs/SVG groups in JSDOM and node environments).

## Self-Check: PASSED
- Files: highlightUtils.ts, useKetcherHighlights.ts, highlightUtils.test.ts, useKetcherHighlights.test.ts — all FOUND.
- Commits: 56f0a25 (RED), ff7c4ea (GREEN) — both FOUND.

## TDD Gate Compliance
- RED gate: `test(...)` commit `56f0a25` present (failing tests committed first).
- GREEN gate: `feat(...)` commit `ff7c4ea` present after RED (implementation makes them pass).
- No REFACTOR gate needed.
