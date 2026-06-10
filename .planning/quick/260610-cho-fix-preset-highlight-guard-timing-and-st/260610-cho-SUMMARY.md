---
phase: quick-260610-cho
plan: 01
subsystem: inchi-live-update
tags: [bugfix, timing, debounce, race-condition]
requires: []
provides:
  - "Preset highlight that survives the 150ms change debounce"
  - "Generation-guarded catch path that cannot blank the store with a stale result"
affects:
  - src/App.tsx
  - src/lib/handleMolSelectLogic.ts
tech-stack:
  added: []
  patterns:
    - "Guard-ownership transfer: ref set in one function, cleared in the consumer callback"
    - "Generation-counter staleness guard applied to BOTH success and catch async paths"
key-files:
  created: []
  modified:
    - src/App.tsx
    - src/lib/handleMolSelectLogic.ts
decisions:
  - "isSettingMoleculeRef is cleared by the debounced handleChange on the success path (change event guaranteed after setMolecule) and locally in the catch on the error path (no change event fires)"
  - "The catch block reuses the in-scope thisGen captured before the try; no new generation read is needed"
metrics:
  duration: ~6m
  completed: "2026-06-10"
---

# Quick Task 260610-cho: Fix Preset-Highlight Guard Timing and Stale-Result Guard Summary

Fixed two timing bugs in the InChI live-update loop: the `isSettingMoleculeRef` guard is now held across the 150ms debounce so preset loads keep their highlight, and the `handleChange` catch block now drops stale generations before blanking the store.

## What Was Done

### Task 1 — Guard ownership transfer (`src/lib/handleMolSelectLogic.ts`)
- Kept `isSettingMoleculeRef.current = true` before the fetch.
- Removed `isSettingMoleculeRef.current = false` from the `finally` block (left `setIsLoading(false)` in place).
- Added `isSettingMoleculeRef.current = false` to the `catch` block alongside the existing `setSelectedMolId(null)`, so a fetch failure (no `setMolecule`, no `change` event) cannot leave the ref stuck true.
- Updated the JSDoc to document the success-path (cleared in App.tsx debounce) vs error-path (cleared locally) split.
- Commit: `8734475`

### Task 2 — Clear guard in debounce + staleness-guard the catch (`src/App.tsx`)
- In the debounced callback, read the guard into `const wasSettingMolecule`, then immediately set `isSettingMoleculeRef.current = false`, then `if (!wasSettingMolecule) setSelectedMolId(null)`. Because the ref is now held true through the debounce window (Task 1), preset loads skip the reset and stay highlighted; the release ensures a later free-draw resets the selection.
- In the catch block, added `if (thisGen !== generationRef.current) return;` before `setInchiData('', [], {}, {}, [])`, mirroring the success-path guard. `thisGen` was already in scope (captured before the try).
- Preserved the debounce, the `isHighlightingRef` guard, and the generation-counter increment logic unchanged. No manual `getInchi` calls; the getInchi/parseInchiWithAux/setInchiData data path is untouched.
- Commit: `25ddba0`

## Verification

- `npx tsc -b` — exit 0, no type errors.
- `npx vitest run` — full suite green: **168 passed / 168** across 10 test files (handleMolSelect tests unchanged and passing). The stderr `Preset load failed:` lines are expected `console.error` output from the failure-path tests, not failures.
- Reasoning check: preset success path → ref true when debounce reads it → `selectedMolId` not cleared → highlight retained; free-draw → ref false → `selectedMolId` cleared; stale getInchi rejection → catch returns early → store not blanked.

## Deviations from Plan

None - plan executed exactly as written.

## CLAUDE.md Compliance

No InChI reconstruction introduced. The verbatim Ketcher output path (getInchi → parseInchiWithAux → setInchiData) was not altered; changes only adjust ref lifetime and add a generation guard.

## Self-Check: PASSED

- FOUND: src/App.tsx (modified)
- FOUND: src/lib/handleMolSelectLogic.ts (modified)
- FOUND commit: 8734475
- FOUND commit: 25ddba0
