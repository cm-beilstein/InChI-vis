---
phase: 06-hydrogen-highlight-polish-and-deploy
plan: "02"
type: summary
status: complete
commit: 52e4d20
date: 2026-06-01
duration: ~10min
---

# 06-02 Summary — PLSH-01 Empty State + Footnote Cleanup

## What Was Built

PLSH-01: the InChI display box is always present in the DOM with a dimmed empty state when no molecule is drawn. Dead Footnote component removed from the render tree.

## Files Modified

| File | Change |
|------|--------|
| `src/components/InchiSection.tsx` | Replaced early `return null` with `isEmpty` flag; conditional empty-state render with `data-empty` attribute |
| `src/components/InchiSection.module.css` | Added `.emptyHint` and `.inchiDisplay[data-empty="true"]` rules |
| `src/App.tsx` | Removed `Footnote` import and `<Footnote />` JSX |

## Test Results

- 116/116 tests pass
- All 5 InchiSection PLSH-01 tests GREEN (were RED stubs before this plan)

## Requirements Satisfied

- PLSH-01: InChI box always present — no layout shift on first draw ✓
- D-02: box always in DOM ✓
- D-03: dead Footnote component removed from render tree ✓
- Placeholder text: "Draw a molecule above to see its InChI." ✓
- data-empty="true" drives opacity 0.45 and pointer-events: none ✓
