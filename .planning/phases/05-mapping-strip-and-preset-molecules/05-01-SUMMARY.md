---
phase: 05-mapping-strip-and-preset-molecules
plan: 01
subsystem: data-layer + display-components
tags: [molecules-data, mapping-strip, footnote, tdd, wave-0]
dependency_graph:
  requires: []
  provides:
    - src/data/molecules.ts (MOLECULES array, MoleculePreset type)
    - src/lib/deriveMappingPairs.ts (deriveMappingPairs function, MappingPair type)
    - src/components/MappingStrip.tsx (MappingStrip component)
    - src/components/Footnote.tsx (Footnote component)
  affects:
    - Wave 2 (Plan 02): KetcherPanel imports MOLECULES for preset picker
    - Wave 3 (Plan 03): App.tsx uses handleMolSelectLogic; handleMolSelect.test.ts stubs waiting
tech_stack:
  added: []
  patterns:
    - Pure function library (deriveMappingPairs) — testable without React
    - Global CSS classes via className string (no CSS Modules for mapping/footnote)
    - Zustand selector per field (useInchiStore(s => s.auxMap))
key_files:
  created:
    - src/data/molecules.ts
    - src/lib/deriveMappingPairs.ts
    - src/components/MappingStrip.tsx
    - src/components/Footnote.tsx
    - src/__tests__/MappingStrip.test.tsx
    - src/__tests__/PresetMolecules.test.tsx
    - src/__tests__/handleMolSelect.test.ts
  modified: []
decisions:
  - "deriveMappingPairs extracted as pure function (not inlined in MappingStrip) — enables unit testing without React test renderer"
  - "MappingStrip uses global CSS classes from styles.css, not CSS Modules — all .mapping/.pairs/.pair/.identity/.diverges classes already defined globally"
  - "handleMolSelect.test.ts stubs depend on Plan 03 Task 1's handleMolSelectLogic export — intentionally RED until then"
metrics:
  duration: "~10min"
  completed: "2026-05-22"
  tasks_completed: 3
  files_created: 7
  files_modified: 0
---

# Phase 05 Plan 01: Data Layer and Display Components Summary

**One-liner:** Molecules preset data (10 PubChem-verified entries), deriveMappingPairs pure function (pool-ID rank algorithm), MappingStrip component (Zustand-wired), Footnote component (exact design copy), plus Wave 0 test stubs for Plans 01-03.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 — Create test stub files | 81ba197 | src/__tests__/MappingStrip.test.tsx, src/__tests__/PresetMolecules.test.tsx, src/__tests__/handleMolSelect.test.ts |
| 2 | Create molecules.ts + deriveMappingPairs + MappingStrip | a30d7db | src/data/molecules.ts, src/lib/deriveMappingPairs.ts, src/components/MappingStrip.tsx |
| 3 | Create Footnote static component | aa3e227 | src/components/Footnote.tsx |

## Verification Results

- `npm run test -- --run`: 98 tests pass (8 test files)
  - MappingStrip.test.tsx: 6/6 GREEN
  - PresetMolecules.test.tsx: 7/7 GREEN
  - All 85 pre-existing tests: GREEN
  - handleMolSelect.test.ts: RED (expected — Plan 03 Task 1 creates implementation)
- `npx tsc --noEmit`: 0 type errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored phase 5 planning files lost during worktree base reset**
- **Found during:** Task 1 commit
- **Issue:** `git reset --soft` onto target commit caused planning files from the diff (phase 5 plans, research, context docs) to be staged for deletion and committed accidentally
- **Fix:** Used `git checkout cc9168a -- .planning/phases/05-mapping-strip-and-preset-molecules/` to restore all 8 planning files from the target commit; committed as a separate chore commit
- **Files modified:** .planning/phases/05-mapping-strip-and-preset-molecules/ (all 8 files), .planning/phases/04-hover-to-highlight-integration/04-03-SUMMARY.md
- **Commit:** 231ed2b

## Known Stubs

None — all new files are fully implemented. `handleMolSelect.test.ts` is intentionally RED (tests for Plan 03 Task 1 implementation that does not yet exist); this is the designed Wave 0 pattern, not a stub in the implementation files.

## Threat Flags

No new trust-boundary surface introduced. MappingStrip reads from Zustand store (internal WASM output). molecules.ts contains only public PubChem CIDs (no sensitive data). Threat register from PLAN.md covers all cases (T-05-01-01, T-05-01-02 both accepted).

## Self-Check: PASSED

Files created:
- FOUND: src/data/molecules.ts
- FOUND: src/lib/deriveMappingPairs.ts
- FOUND: src/components/MappingStrip.tsx
- FOUND: src/components/Footnote.tsx
- FOUND: src/__tests__/MappingStrip.test.tsx
- FOUND: src/__tests__/PresetMolecules.test.tsx
- FOUND: src/__tests__/handleMolSelect.test.ts

Commits verified:
- FOUND: 81ba197 (test stubs)
- FOUND: a30d7db (implementation)
- FOUND: aa3e227 (footnote)
