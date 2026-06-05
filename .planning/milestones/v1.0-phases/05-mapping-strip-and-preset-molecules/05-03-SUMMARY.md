---
phase: 05-mapping-strip-and-preset-molecules
plan: "03"
subsystem: app-wiring
tags:
  - wave-3
  - mapping-strip
  - preset-molecules
  - app-wiring
  - uat-approved

dependency_graph:
  requires:
    - src/lib/molecules.ts
    - src/lib/deriveMappingPairs.ts
    - src/components/MappingStrip.tsx
    - src/components/Footnote.tsx
    - src/components/KetcherPanel.tsx (8-prop signature from Plan 02)
    - src/store.ts
    - src/App.tsx
  provides:
    - src/lib/handleMolSelectLogic.ts (exported pure function)
    - src/App.tsx (selectedMolId + isLoading state, isSettingMoleculeRef, handleMolSelect, MappingStrip + Footnote in render tree)
  affects:
    - full Phase 5 pipeline end-to-end

tech-stack:
  added: []
  patterns:
    - isSettingMoleculeRef guard prevents selectedMolId reset during setMolecule() call
    - handleMolSelectLogic extracted as pure async function for testability
    - MappingStrip hidden when all pairs are identity (redundant with connection layer)

key-files:
  created:
    - src/lib/handleMolSelectLogic.ts
  modified:
    - src/App.tsx

key-decisions:
  - "MappingStrip hidden when all pairs are identity — redundant with the c-layer connection display"
  - "Footnote border-top removed; InChI definition moved to header tagline"
  - "isSettingMoleculeRef prevents selectedMolId from resetting to null mid-fetch"

patterns-established:
  - "Phase 5 wiring pattern: pure logic function extracted to lib/ for testability; App.tsx holds only React state + event wiring"

requirements-completed:
  - MAP-01
  - MAP-02
  - EDIT-02
  - EDIT-03

duration: ~30min
completed: "2026-05-22"
---

# Phase 5 Plan 03: Wire App.tsx — UAT Summary

**All Phase 5 features wired and human-UAT approved: preset loading, MappingStrip, Footnote, canvas overlay, full draw-to-display pipeline**

## Status

**Complete. Task 1 (automated) and Task 2 (human UAT) both approved.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-05-22
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Created `src/lib/handleMolSelectLogic.ts` — pure async function satisfying test stub contract
- Wired `selectedMolId`, `isLoading` state and `isSettingMoleculeRef` guard into App.tsx
- `handleMolSelect` fetches PubChem SDF, calls `ketcher.setMolecule()`, updates selected state
- MappingStrip and Footnote added to render tree
- KetcherPanel receives all 8 props (selectedMolId, onMolSelect, isLoading + original 5)
- 106/106 unit tests pass (all handleMolSelect.test.ts assertions GREEN)
- Zero TypeScript errors

## Human UAT Results (2026-05-22) — ALL PASSED

| Test | Requirement | Result |
|------|-------------|--------|
| MappingStrip renders after drawing ethanol | MAP-01 | ✅ PASS |
| Identity pairs dimmed (methane single chip) | MAP-01 | ✅ PASS |
| Footnote renders with InChI definition + kbd badges | MAP-02 | ✅ PASS |
| Benzene preset loads full pipeline | EDIT-02 | ✅ PASS |
| Canvas overlay: Caffeine name/formula/count | EDIT-03 | ✅ PASS |
| Overlay disappears on canvas clear | EDIT-03 | ✅ PASS |
| Loading state disables buttons during fetch | EDIT-02 | ✅ PASS |
| Naloxone loads with stereo layer + 24 chips | regression | ✅ PASS |

## Post-execution Fixes Applied

- `fix(05)`: hide MappingStrip when all pairs are identity
- `fix(05)`: raise `--c-el-C` lightness (carbon highlight was near-black)
- `fix(05)`: lighten `.mapping .pair .el` color
- `fix(05)`: remove MappingStrip from render tree when hidden
- `fix(05)`: remove Footnote border-top; move InChI definition to header tagline
- `fix(04)`: restore isHighlightingRef guard and pool-ID remapping (reverted by Wave 1 worktree)

## Self-Check: PASSED

- FOUND: src/lib/handleMolSelectLogic.ts
- FOUND: src/App.tsx (updated)
- Tests: 106/106 GREEN (9 test files)
- TypeScript: npx tsc --noEmit exits 0
