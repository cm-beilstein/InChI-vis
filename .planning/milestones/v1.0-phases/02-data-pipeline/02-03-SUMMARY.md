---
phase: 02-data-pipeline
plan: 03
subsystem: testing
tags: [vitest, inchi, auxinfo, ketcher, benzene-fixture, empirical-verification]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: 01
    provides: parseAuxMapping function parsing N: field from AuxInfo body
  - phase: 02-data-pipeline
    plan: 02
    provides: useInchiStore Zustand store
provides:
  - Empirically verified benzene AuxInfo fixture with real Ketcher 3.12.0 N:1,3,5,2,6,4 values
  - Ketcher change subscription wiring in App.tsx (Task 1, carried from parallel agent)
  - Complete data pipeline from Ketcher draw event to Zustand store update
affects:
  - 03-inchi-display (hover logic depends on correct canonical→Ketcher index mapping)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Empirical fixture: capture real browser output to replace provisional web-search test values"
    - "BENZENE_AUXINFO_BODY constant: shared test fixture extracted as named constant for reuse"

key-files:
  created: []
  modified:
    - src/lib/__tests__/parseAuxMapping.test.ts
    - src/App.tsx

key-decisions:
  - "Real N: field for benzene in Ketcher 3.12.0 is 1,3,5,2,6,4 (not 1,2,6,3,5,4 from web search)"
  - "AuxInfo separator confirmed as Unix \\n (not CRLF) on WSL2/Chrome environment"
  - "parseInchiWithAux test updated to use real fixture constant with additional canonical 4 assertion"

patterns-established:
  - "Empirical test verification: always capture real browser output for Ketcher AuxInfo fixtures before phase gate"

requirements-completed:
  - INCHI-01

# Metrics
duration: 15min
completed: 2026-05-20
---

# Phase 02 Plan 03: App.tsx Wiring + AuxInfo Fixture Verification Summary

**Ketcher change subscription wired into debounced async pipeline (App.tsx), and benzene AuxInfo fixture replaced with empirically captured Ketcher 3.12.0 real output — N:1,3,5,2,6,4 with full rA/rB/rC fields**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-20T14:40:00Z
- **Completed:** 2026-05-20T14:55:00Z
- **Tasks:** 3 (Task 1 + human checkpoint + Task 3)
- **Files modified:** 2

## Accomplishments

- App.tsx now subscribes to Ketcher `editor.change` events with 50ms debounce and generation guard preventing stale WASM results
- Canvas clear path resets store to `inchi:'', layers:[], auxMap:{}`
- parseAuxMapping test fixture updated from provisional web-search estimate (N:1,2,6,3,5,4) to empirically captured real values (N:1,3,5,2,6,4) from Ketcher 3.12.0
- BENZENE_AUXINFO_BODY constant includes complete rA/rB/rC coordinate fields from actual getInchi(true) output
- All 29 tests pass, TypeScript clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Ketcher change subscription pipeline in App.tsx** - `f211071` (feat)
2. **Task 2: Human checkpoint — empirical AuxInfo verification** - (human action, no commit)
3. **Task 3: Update test fixture with real captured AuxInfo** - `a28ee05` (test)

**Plan metadata:** (this SUMMARY.md commit)

## Files Created/Modified

- `src/App.tsx` - Added useEffect wiring Ketcher editor.subscribe('change') → debounce → getInchi(true) → parseInchiWithAux → store.setInchiData; cleanup on unmount via unsubscribe
- `src/lib/__tests__/parseAuxMapping.test.ts` - Replaced provisional fixture with real Ketcher 3.12.0 benzene AuxInfo; extracted BENZENE_AUXINFO_BODY constant; updated parseInchiWithAux test to use real fixture

## Decisions Made

- **Real N: values differ from web search:** Ketcher 3.12.0 produces N:1,3,5,2,6,4 for benzene, not the N:1,2,6,3,5,4 found in web examples. Provisional fixture was wrong for canonical atoms 2-6.
- **AuxInfo separator is Unix \\n:** Confirmed via browser capture on WSL2/Chrome. Assumption A2 (possible CRLF) did not materialize.
- **Additional assertion added to parseInchiWithAux test:** Added `auxMap[4]` check (canonical 4 → index 1) to cover a case that differs between provisional and real fixture values.

## Deviations from Plan

None — plan executed exactly as written. The provisional test values were expected to be provisional; replacing them with real captured values was the explicit goal of Task 3.

## Issues Encountered

- Worktree was initialized without Task 1 commit — it was on a parallel agent branch (`worktree-agent-a7762a104524fc6ae`). Resolved by fast-forward merging that branch before starting Task 3.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Data pipeline complete: draw event → debounced getInchi(true) → parseInchiWithAux → Zustand store
- AuxInfo fixture empirically verified — hover atom-highlighting in Phase 03 can rely on canonical→Ketcher index mapping
- 29 tests all passing, TypeScript clean — Phase 03 can start immediately

---
*Phase: 02-data-pipeline*
*Completed: 2026-05-20*

## Self-Check: PASSED

- `src/lib/__tests__/parseAuxMapping.test.ts` — FOUND
- `.planning/phases/02-data-pipeline/02-03-SUMMARY.md` — FOUND
- Commit `a28ee05` (Task 3) — FOUND
- Commit `f211071` (Task 1) — FOUND
