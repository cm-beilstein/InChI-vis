---
phase: 05-mapping-strip-and-preset-molecules
plan: 02
subsystem: KetcherPanel layout + mol-list sidebar + canvas overlay
tags: [ketcher-panel, mol-list, canvas-overlay, css-grid, wave-2]
dependency_graph:
  requires:
    - src/data/molecules.ts (MOLECULES array from Plan 01)
    - src/components/KetcherPanel.tsx (existing component)
    - src/components/KetcherPanel.module.css (existing CSS Module)
  provides:
    - src/components/KetcherPanel.tsx (extended with 5 new props + 2-column layout)
    - src/components/KetcherPanel.module.css (2-column grid with canvasWrap)
  affects:
    - Wave 3 (Plan 03): App.tsx must pass all 8 props to KetcherPanel
tech_stack:
  added: []
  patterns:
    - CSS Module 2-column grid (1fr 240px) for editor + sidebar layout
    - Global CSS classes used as plain className strings (mol-list, canvas-meta, mol-item)
    - CSS Module classes for scoped layout (canvasWrap, loadingOverlay)
    - disabled + onClick guard pattern for concurrent fetch prevention (D-04)
key_files:
  created: []
  modified:
    - src/components/KetcherPanel.tsx
    - src/components/KetcherPanel.module.css
decisions:
  - "Global CSS classes (.canvas-meta, .mol-list, .mol-item etc.) used as plain className strings — not CSS Modules — because they are already defined in src/styles.css globally"
  - "canvasWrap uses CSS Module class to establish stacking context for both loadingOverlay and canvas-meta overlay"
  - ".ketcher grid has no position:relative — stacking context moved to .canvasWrap where it is needed"
metrics:
  duration: "~8min"
  completed: "2026-05-22"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 05 Plan 02: KetcherPanel Layout Restructure and Mol-List Sidebar Summary

**One-liner:** KetcherPanel restructured to 2-column CSS grid (1fr 240px) with canvasWrap stacking context, mol-list sidebar rendering 10 MOLECULES presets, and canvas-meta overlay conditional on formula presence.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Restructure KetcherPanel.module.css — 2-column grid + canvasWrap | 8605f05 | src/components/KetcherPanel.module.css |
| 2 | Extend KetcherPanel.tsx — canvasWrap + mol-list sidebar + canvas overlay + new props | 10f8f5b | src/components/KetcherPanel.tsx |

## Verification Results

- `npx tsc --noEmit`: 0 type errors
- `npm run test -- --run`: 98 tests pass (8 test files)
  - All 85 pre-existing tests: GREEN
  - MappingStrip.test.tsx: 6/6 GREEN
  - PresetMolecules.test.tsx: 7/7 GREEN
  - handleMolSelect.test.ts: RED (expected — Plan 03 Task 1 creates handleMolSelectLogic implementation)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all new code is fully implemented. The mol-list and canvas overlay render correctly. `handleMolSelect.test.ts` remains intentionally RED (Wave 0 pattern — tests for Plan 03 implementation).

Note: `KetcherPanel` now accepts all 8 props but App.tsx still passes only the original 3 props (isReady, onInit, structServiceProvider). TypeScript will report errors in App.tsx until Plan 03 wires the new props. The component itself is complete.

## Threat Flags

No new trust-boundary surface introduced. Canvas overlay renders formula from internal store (trusted Ketcher WASM output). Mol-list renders from MOLECULES constant (static public data). T-05-02-02 mitigated: `disabled={isLoading}` attribute + `!isLoading &&` onClick guard both implemented.

## Self-Check: PASSED

Files modified:
- FOUND: src/components/KetcherPanel.tsx
- FOUND: src/components/KetcherPanel.module.css

Acceptance criteria verified:
- PASS: grep "display: grid" KetcherPanel.module.css
- PASS: grep "grid-template-columns" KetcherPanel.module.css → "1fr 240px"
- PASS: grep "canvasWrap" KetcherPanel.module.css
- PASS: grep "position: relative" KetcherPanel.module.css
- PASS: grep "z-index: 1001" KetcherPanel.module.css
- PASS: grep "selectedMolId" KetcherPanel.tsx (interface + JSX)
- PASS: grep "onMolSelect" KetcherPanel.tsx
- PASS: grep "MOLECULES" KetcherPanel.tsx (import + render)
- PASS: grep "canvas-meta" KetcherPanel.tsx
- PASS: grep "mol-list" KetcherPanel.tsx
- PASS: grep "styles.canvasWrap" KetcherPanel.tsx
- PASS: grep "isLoading" KetcherPanel.tsx (disabled + guard)
- PASS: grep "formula !== null" KetcherPanel.tsx
- PASS: grep "molName" KetcherPanel.tsx
- PASS: npx tsc --noEmit exits 0
- PASS: npm run test -- --run: 98/98 tests green (1 file RED by design)

Commits verified:
- FOUND: 8605f05 (Task 1: CSS Module restructure)
- FOUND: 10f8f5b (Task 2: KetcherPanel.tsx extension)
