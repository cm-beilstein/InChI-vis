---
phase: quick-260610-eoi
plan: 01
subsystem: inchi-layer-rendering
tags: [multi-fragment, stereo, readingFor, highlight, tdd]
requires: [parseInchi, formulaFragmentCounts, expandLayerText, buildAtomElements]
provides:
  - "readingFor(layer, atomElements, fragCounts) multi-fragment awareness"
  - "formulaReading dot-fragment '; ' separation with multiplier support"
  - "'?' undefined stereocenter support across parse/color/highlight/interactivity"
affects: [Explanation, LayerText, highlightUtils]
tech-stack:
  added: []
  patterns: [per-fragment-cumulative-offset, expandLayerText-iteration]
key-files:
  created: []
  modified:
    - src/lib/layerInfo.ts
    - src/lib/parseInchi.ts
    - src/lib/highlightUtils.ts
    - src/components/LayerText.tsx
    - src/components/Explanation.tsx
    - src/lib/__tests__/layerInfo.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
decisions:
  - "formulaReading multiplier rendered as 'N× (...)' to keep single-fragment output byte-identical"
  - "multi-fragment readingFor activated only when fragCounts.length > 1; collapses to legacy single-pass otherwise"
metrics:
  duration: ~25m
  completed: 2026-06-10
---

# Phase quick-260610-eoi Plan 01: Fix readingFor multi-fragment text + '?' stereocenters Summary

Made InChI explanation reading and tetrahedral-stereo highlighting correct for multi-component molecules and undefined ('?') stereocenters, mirroring the per-fragment cumulative-offset pattern already established in `enrichLayers` and `LayerText`.

## What changed

### Bug 1 — multi-fragment `readingFor`
- `readingFor` gained a third parameter `fragCounts: number[] = []`. The c/h/t branches now iterate fragments via `expandLayerText`, applying a cumulative canonical offset. This eliminates the spurious cross-fragment c-layer bond (e.g. the phantom 13–14 bond) and gives fragments 2+ correctly-offset canonical labels.
- Multi-fragment is gated on `fragCounts.length > 1`; with an empty or single-element `fragCounts` every loop collapses to one pass at offset 0, so single-fragment output is byte-identical to the previous implementation.
- `formulaReading` now splits on `.`, renders each segment with the existing element-prose loop, and joins fragments with `'; '`. A leading integer multiplier (e.g. `2C6H6`) is rendered as `N× (...)`. A single segment with no multiplier reproduces legacy output exactly (`<b>6</b> carbons, <b>6</b> hydrogens`).
- `Explanation.tsx` computes `fragCounts` from the formula layer via `formulaFragmentCounts` and passes it as the 3rd arg; falls back to `[]` when no formula layer exists.

### Bug 2 — '?' undefined stereocenters
- `parseStereoAtoms` regex `/(\d+)[\-+]/` → `/(\d+)[\-+?]/` so `?` centers are captured.
- `parseStereoParities` regex `/(\d+)([\-+])/` → `/(\d+)([\-+?])/`; returned sign may be `'?'`.
- `parityColor` now returns `var(--c-stereo)` for `'?'` (and any non +/- sign); `'+'`/`'-'` unchanged.
- `highlightUtils` case `'t'` adds a third `undefinedAtoms` group emitted as a spec colored `--c-stereo`, distinct from the plus (`--c-stereo-plus`) and minus (`--c-stereo-minus`) groups — `?` atoms are no longer mislabeled into the minus group.
- `LayerText` `ParityText` token regex captures `?`; the `?` token is interactive (subHover `{kind:'stereo', atom, sign:'?'}`) with a neutral class (no color class). `buildSubHoverSpecs` case `'stereo'` already routes through `parityColor`, so it inherits the `'?'` → `--c-stereo` behavior with no further edit.

## TDD ordering
Both tasks followed RED → GREEN. Confirmed orderings:
- Task 1 RED commit `6b97e2c`: 3 new multi-fragment tests failed (existing 27 in file passed). GREEN commit `4eb0fd6`.
- Task 2 RED commit `f9a8978`: 5 new `?` tests failed (parseStereoAtoms, parseStereoParities, parityColor, t-layer reading, buildHighlightSpecs case 't'). GREEN commit `da515b0`.

A test passing unexpectedly during RED was caught and corrected before GREEN: the original Task-1 t-layer assertion checked both atom 22 (from `9?`, which needs the Bug 2a regex) and 23 — atom 22 cannot be captured until Task 2. The Task-1 assertion was scoped to atom 23 (from `10-`, capturable in Task 1) and atom 22 moved to the Bug-2 test block.

## Deviations from Plan

### Adjusted test (not a code deviation)
The planned Task-1 c-layer assertion ("references offset canonicals with subscript >= 14 in the reading text") is unobservable because the c-layer reading truncates at MAX=10 and all 10 shown bonds belong to fragment A (canonicals 1–13). The implementation is correct (offsets applied, no 13↔14 bond). The assertion was split: the reading test asserts no spurious A→C boundary bond and element labels resolve; a companion test asserts offset correctness on the full enriched `cLayer.bonds` list (no `[13,14]` bond; bonds with canonicals ≥14 and ≥26 exist). No production behavior changed as a result.

Otherwise: plan executed as written. No Rule 1–4 deviations, no auth gates.

## Verification
- `npx tsc -b` — clean (exit 0).
- `npx vitest run` — 13 files, **197 tests passing** (185 baseline + 12 new).
- No edits to `parseAuxMapping` `remapAuxToPoolIds` or `App.tsx`.
- Changes confined to the six planned files plus `highlightUtils.test.ts` (test extension, allowed per Task 2 action).

## Known Stubs
None.

## Self-Check: PASSED
- All six target source files modified and committed (verified below).
- Commits present: `6b97e2c`, `4eb0fd6`, `f9a8978`, `da515b0`.
- Single-fragment byte-identical fallback asserted by test and passing.
