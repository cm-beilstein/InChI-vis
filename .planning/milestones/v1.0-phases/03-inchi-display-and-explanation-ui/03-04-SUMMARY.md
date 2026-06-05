---
phase: 03-inchi-display-and-explanation-ui
plan: "04"
subsystem: inchi-display
tags: [react, css-modules, zustand, inchi-display, hover, sub-tokens]
dependency_graph:
  requires:
    - 03-02-PLAN.md  # store.ts with layers/hoverIdx/subHover/setHover/setSubHover
    - 03-03-PLAN.md  # layerInfo.ts with swatchVar()
  provides:
    - InchiSection component — renders color-coded InChI strip from store state
    - LayerText component — per-layer sub-token renderers with setSubHover wiring
    - InchiSection.module.css — CSS Module with transitions, element/parity/hydro coloring
  affects:
    - src/App.tsx — will import InchiSection to display it
tech_stack:
  added: []
  patterns:
    - CSS Modules + data-layer attribute selectors for per-layer coloring
    - Static EL_CLASS lookup object to avoid dynamic CSS Module class names
    - useInchiStore.getState() for event handlers (avoids stale closures + no re-subscribe)
    - Inline style for accent colors (dynamic CSS var token from swatchVar)
key_files:
  created:
    - src/components/InchiSection.module.css
    - src/components/LayerText.tsx
    - src/components/InchiSection.tsx
  modified: []
decisions:
  - Inline style for per-layer color (swatchVar token) — CSS Modules cannot dynamically generate scoped class names from data; inline style + CSS var is the correct pattern
  - useInchiStore.getState() in event handlers — avoids subscribing the handler itself as a store subscriber; reads fresh state at event time
  - EL_CLASS static Record<string, string> — CSS Modules hashes class names at build time; dynamic string concatenation ('el-' + el) would produce unhashed strings that never match
metrics:
  duration: 3min
  completed: "2026-05-21"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 3 Plan 4: InChI Strip Components Summary

**One-liner:** Color-coded InChI strip with per-layer CSS tokens, static EL_CLASS lookup, and setSubHover wired on all sub-token spans — ready for Phase 4 highlight integration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create InchiSection.module.css | 60084e5 | src/components/InchiSection.module.css |
| 2 | Create LayerText.tsx and InchiSection.tsx | 9d93149 | src/components/LayerText.tsx, src/components/InchiSection.tsx |

## What Was Built

### InchiSection.module.css

CSS Module porting all InChI section rules from the design handoff `styles.css`. Key rules:

- `.inchiLayer` with `transition: background 160ms ease, color 160ms ease` (verbatim handoff)
- `.inchiSubtoken` with `transition: background 120ms, box-shadow 120ms`
- `.inchiDisplay` with `word-break: break-all`, `padding: 28px 32px`, `font-size: 19px`
- Attribute selectors `[data-layer="formula"] .elC` through `.elI` for element coloring
- Parity coloring `[data-layer="t"/"b"] .parityPlus/.parityMinus`
- Hydrogen count shading `[data-layer="h"] .hydro1` through `.hydro4`, `.hydroMobile`
- No `:global` wrappers — attribute selectors target real HTML attributes

### LayerText.tsx

TypeScript port of `LayerText`, `FormulaText`, `ConnectionText`, `ParityText`, `HLayerText` from app.jsx lines 112-278:

- `EL_CLASS` static `Record<string, string>` lookup — avoids dynamic `'el-' + el` which breaks CSS Modules
- `subHoverProps` factory calls `useInchiStore.getState().setSubHover` directly — no `onSubHover` prop
- `FormulaText` tokenizes formula by element + count, applies per-element class and subtoken hover
- `ConnectionText` wraps each numeric atom reference with atom hover
- `ParityText` wraps each `{n}{sign}` token with parity class and stereo hover
- `HLayerText` handles mobile H groups `(H,n,...)` and fixed H groups with hydro class

### InchiSection.tsx

TypeScript port of `InchiSection` from app.jsx lines 281-313:

- Reads `layers` and `hoverIdx` from Zustand store via selector subscriptions
- D-08: hint text from `layers.find(l => l.type === 'formula')?.text`
- `data-layer={l.type}` on each layer span — enables CSS attribute selectors
- `onMouseLeave` on container clears both `hoverIdx` and `subHover` in store
- Active layer gets inline `style={{ color: tokenColor, background: bgColor }}` using `swatchVar`
- Returns `null` when `layers.length === 0` — empty canvas guard

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — component reads real data from Zustand store (layers populated by Plan 02 pipeline).

## Threat Flags

None — all data flows through React text nodes (not innerHTML), and `data-layer` values come from the `LayerType` union (controlled vocabulary).

## Verification Results

- `npx tsc --noEmit` — exits 0 (no TypeScript errors)
- `npx vitest run` — 61 tests, 4 test files, all green
- `grep "EL_CLASS" src/components/LayerText.tsx` — static lookup confirmed
- `grep "data-layer" src/components/InchiSection.tsx` — attribute set confirmed
- `grep "setSubHover" src/components/LayerText.tsx` — wiring present confirmed
- `grep "formula" src/components/InchiSection.tsx` — D-08 hint logic confirmed

## Self-Check: PASSED
