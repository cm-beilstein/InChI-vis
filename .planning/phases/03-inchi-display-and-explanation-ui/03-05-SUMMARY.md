---
phase: 03-inchi-display-and-explanation-ui
plan: 05
subsystem: ui
tags: [react, css-modules, zustand, oklch, ketcher, inchi]

# Dependency graph
requires:
  - phase: 03-02
    provides: Zustand store with layers, hoverIdx, atomElements state
  - phase: 03-03
    provides: layerInfo.ts with LAYER_INFO, DEFAULT_INFO, readingFor, swatchVar exports
  - phase: 03-04
    provides: InchiSection component with color-coded layer strip and hover wiring
provides:
  - Explanation.tsx — left explanation card with idle and layer-hover states
  - Explanation.module.css — card layout, left border accent strip, responsive grid
  - Legend.tsx — right legend card with 11 InChI layer rows and CSS-only tooltips
  - Legend.module.css — legend row grid, muted absent layers, tooltip slide-in transition
  - App.tsx updated — InchiSection and Explanation mounted below KetcherPanel
affects: [phase 04 if any, deployment, visual regression testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "--accent CSS custom property always set on card wrapper (idle: var(--ink-faint); active: var(--c-{swatchVar(type)}))"
    - "dangerouslySetInnerHTML for readingFor() output — controlled HTML only, no user-controlled text path"
    - "CSS-only tooltip via .legendRow:hover .legendTip — no React useState for visibility"
    - "Legend overflow:visible to prevent tooltip clip by parent card border"

key-files:
  created:
    - src/components/Explanation.tsx
    - src/components/Explanation.module.css
    - src/components/Legend.tsx
    - src/components/Legend.module.css
  modified:
    - src/App.tsx

key-decisions:
  - "dangerouslySetInnerHTML used for readingFor() output — inputs are WASM-parsed InChI layer text (alphanumeric + punctuation only), not user-controlled free text; T-03-05-01 threat accepted"
  - "CSS-only tooltip for Legend rows — no useState needed; opacity/transform transition handles visibility"
  - "--accent always set on card wrapper in both idle and active states to prevent ::before from losing its value (Pitfall 3)"
  - "Legend card uses overflow:visible so tooltips are not clipped by card border (Pitfall 4)"

patterns-established:
  - "Pattern: CSS custom property --accent injected via inline style with React.CSSProperties cast for custom props"
  - "Pattern: CSS-only hover tooltip with .parent:hover .child selector — zero JS overhead"
  - "Pattern: Zustand presentTypes Set computed from layers array in render — no derived state needed"

requirements-completed: [EXPL-01, EXPL-02, EXPL-03, PLSH-03]

# Metrics
duration: continuation agent (tasks 1-2 already done in prior session)
completed: 2026-05-21
---

# Phase 3 Plan 05: Explanation Card and App.tsx Integration Summary

**Explanation card (idle/hover states with readingFor prose) and Legend (11-row CSS-only tooltips) wired into App.tsx via Zustand store — completing Phase 3 UI**

## Performance

- **Duration:** Continuation — tasks 1-2 committed in prior sessions; task 3 (UAT checkpoint) approved by user
- **Started:** Prior session
- **Completed:** 2026-05-21T07:26:38Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 5

## Accomplishments

- Explanation card renders idle state (`DEFAULT_INFO.title`: "Hover any layer") and active state (LAYER_INFO prose + `readingFor()` reading-code block) driven by `hoverIdx` from Zustand store
- Legend renders all 11 InChI layer types with color swatches, muted absent layers, and CSS-only tooltip slide-in on row hover — no React state for tooltip visibility
- App.tsx mounts `<InchiSection />` and `<Explanation />` below KetcherPanel, completing the full Phase 3 layout
- Human visual UAT approved: checks 1-5 and 7 passed; check 6 (IBM Plex font network confirmation) could not be verified in tester's environment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Explanation.module.css and Legend.module.css** - `b1f624d` (feat)
2. **Task 2: Create Explanation.tsx and Legend.tsx, wire into App.tsx** - `a419df5` (feat)
3. **Task 3: Checkpoint — human visual UAT** - approved by user (no code commit)

## Files Created/Modified

- `src/components/Explanation.tsx` — Left explanation card; reads layers/hoverIdx/atomElements from store; idle and active states; `dangerouslySetInnerHTML` for `readingFor()` output
- `src/components/Explanation.module.css` — Two-column grid (.explain), left border accent strip (.card::before), responsive @media (max-width: 900px), legend card overflow:visible
- `src/components/Legend.tsx` — Right legend card; 11 ALL_LAYERS rows with color swatches, muted absent types, CSS-only tooltip; reads layers from store
- `src/components/Legend.module.css` — Legend row grid layout, .muted opacity, .legendTip position/transition, .legendRow:hover .legendTip activation, tooltip arrow via ::after
- `src/App.tsx` — Added `<InchiSection />` and `<Explanation />` below `<KetcherPanel />`

## Decisions Made

- Used `dangerouslySetInnerHTML` for `readingFor()` output (D-09) — the HTML is from `readingFor()` which only emits `<b>` and `<span style="color:var(--...)">` tags with WASM-parsed InChI text as input (not user-controlled free text). Threat T-03-05-01 accepted per plan threat model.
- `--accent` CSS custom property always set on the card wrapper in both idle and active states. This is required because `card::before` uses `var(--accent)` — omitting it in idle state causes the left border strip to disappear (Pitfall 3 from RESEARCH.md).
- `overflow: visible` on the legend card div is required so CSS-only tooltips (positioned absolutely outside card bounds) are not clipped (Pitfall 4).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 3 complete: full InChI explanation UI is functional — color-coded layer strip, interactive explanation card, legend with tooltips
- App.tsx mounts all components in correct layout order
- TypeScript clean; all 302 tests passing across 22 test files
- Human visual UAT approved (checks 1-5 and 7 of 7)
- Ready for Phase 4 (deployment / polish / accessibility work if planned)

---
*Phase: 03-inchi-display-and-explanation-ui*
*Completed: 2026-05-21*

## Self-Check: PASSED

- `src/components/Explanation.tsx` — FOUND (read above, commit a419df5)
- `src/components/Legend.tsx` — FOUND (read above, commit a419df5)
- `src/components/Explanation.module.css` — FOUND (commit b1f624d)
- `src/components/Legend.module.css` — FOUND (commit b1f624d)
- `src/App.tsx` updated — FOUND with InchiSection and Explanation (commit a419df5)
- Commits b1f624d, a419df5 — FOUND in git log
- TypeScript: clean (tsc --noEmit exit 0)
- vitest: 302 tests passed (22 test files)
- dangerouslySetInnerHTML: exactly 1 usage confirmed
