---
phase: quick-260610-d2r
plan: 01
subsystem: inchi-layer-rendering
tags: [bugfix, hover-highlight, multi-fragment, tdd]
requires: []
provides:
  - "Correct cross-fragment canonical mapping for mixed N*...;N*... c-layer and h-layer hovers"
affects:
  - src/components/LayerText.tsx
tech-stack:
  added: []
  patterns:
    - "Guard greedy top-level regex with a structural pre-check (!text.includes(';')) before matching"
key-files:
  created:
    - src/__tests__/LayerText.mixedFragment.test.tsx
  modified:
    - src/components/LayerText.tsx
decisions:
  - "Guard the top-level multMatch with !text.includes(';') rather than tightening the regex — minimal, surgical, and preserves the existing ';'-split branch verbatim"
metrics:
  duration: ~10m
  completed: 2026-06-10
  tasks: 2
  files: 2
---

# Phase quick-260610-d2r Plan 01: Fix mixed N*...;N*... hover-highlight bug Summary

Guarded the greedy top-level `multMatch` in `ConnectionText` and `HLayerText` so the single-group-multiplier branch fires only for a pure `N*...` string with no `;`; mixed multi-fragment layers now fall through to the existing `;`-split branch and map benzene-fragment tokens to their own canonicals (15-26) instead of hijacking into the first toluene group (1-14).

## What Changed

- **src/components/LayerText.tsx** — Two top-level `multMatch` declarations (ConnectionText ~line 153, HLayerText ~line 290) changed from `text.match(/^(\d+)\*([\s\S]*)$/)` to `!text.includes(';') ? text.match(/^(\d+)\*([\s\S]*)$/) : null`. When a `;` is present, control now falls through to the `;`-split branch (`text.split(';')`, per-segment `segMult` handling with cumulative offsets and `fragIdx`), which already computes correct cross-fragment canonicals. `ParityText` and `FormulaText` were not touched; the per-segment `segMult` regexes inside the `;`-split branches were not touched.
- **src/__tests__/LayerText.mixedFragment.test.tsx** — New regression test (3 cases) following the `vi.mock('../store')` + captured `setSubHover` pattern from `InchiSection.test.tsx`.

## How It Was Verified

- `npx tsc -b` — clean, no type errors.
- `npx vitest run` (full suite) — **171 passed** (168 prior tests + 3 new). 11 test files, all passing.
- New test file alone — 3 passed.

### TDD ordering (RED before GREEN, confirmed)

The regression test was written, then the guard was temporarily reverted on the working copy (via `sed`) to confirm RED, then restored:

- **RED (guard removed):** `2 failed | 1 passed` — both mixed-case assertions (c-layer canonicals in [15,26], h-layer atoms in [15,26]) failed against the unguarded code; the pure-single-group assertion still passed (as designed — that branch is unaffected by the bug).
- **GREEN (guard restored):** `3 passed`.

After restoring the guard, `git diff` of `LayerText.tsx` against the committed Task 1 state was empty — confirming the working tree matches the committed fix exactly.

## Commits

- `e212dde` — fix(quick-260610-d2r): guard top-level multMatch with no-semicolon check
- `7920133` — test(quick-260610-d2r): regression for mixed N*...;N*... canonical mapping

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/components/LayerText.tsx (guarded count = 2)
- FOUND: src/__tests__/LayerText.mixedFragment.test.tsx
- FOUND commit: e212dde
- FOUND commit: 7920133
