---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 planned — 3 plans in 3 waves; ready to execute
last_updated: "2026-05-22T08:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 16
  completed_plans: 13
  percent: 81
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.0
**Status:** Executing

## Current Phase

Phase 5 — Mapping Strip and Preset Molecules (planned, ready to execute)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 5 planned (3 plans). Execute with `/gsd-execute-phase 5`.

## Current Position

- **Phase:** 5 — Mapping Strip and Preset Molecules
- **Plan:** none started yet
- **Status:** Plans created 2026-05-22; ready to execute
- **Progress:** 4/6 phases complete; 13/16 plans complete

```
[████████████████████░░░░░] 81%
```

## Performance Metrics

- Phases completed: 4 / 6

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01-scaffold-and-ketcher-mount | 01 | 5min | 2 | 12 | 2026-05-19 |
| 01-scaffold-and-ketcher-mount | 02 | 6min | 2 | 7 | 2026-05-19 |
| 04-hover-to-highlight-integration | 03 | UAT session | 2 | 3 | 2026-05-22 |

## Accumulated Context

### Key Decisions

- Use `@vitejs/plugin-react` (esbuild), NOT the SWC variant — SWC crashes on Ketcher packages (issue #5565)
- All three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) pinned to exactly 3.12.0
- `StandaloneStructServiceProvider` must be created at module level, never inside a component
- Ketcher `<Editor>` must never be conditionally rendered — WASM re-initializes on remount
- CSS Modules + CSS custom properties for styling — preserves the oklch token system from design handoff
- `vite-plugin-static-copy` required to copy WASM/worker assets; `assetsInlineLimit: 0` to prevent base64 inlining
- React state ownership is flat on `App`; Ketcher ref stored in `useRef`, never in state
- `@vitejs/plugin-react` must be v6.x (not 4.x) for Vite 8 compatibility — v4.x peer dep does not support Vite 8; v6 still uses esbuild (not SWC)
- `vite-plugin-static-copy` must be v4.x (not 2.x) for Vite 8 compatibility — API unchanged
- `vite-plugin-static-copy` v4 requires `rename: {stripBase: true}` for flat copy — v4 default preserves full directory structure (unlike v2)
- Use `@import ... layer(layerName)` syntax for CSS layer assignment — `@import` inside `@layer {}` blocks is invalid per CSS spec; Vite follows the spec
- Separate `vitest.config.ts` for Vite 8 + Vitest 3 — Vitest 3 bundles Vite 6 internally, causing Plugin type conflicts when using vitest/config defineConfig in the same file as Vite 8 plugins
- Phase 5: `selectedMolId` lives in App.tsx as `useState` (not Zustand) — local UI state only (D-05)
- Phase 5: `isSettingMoleculeRef` guards handleChange from resetting selectedMolId during setMolecule() calls — separate from isHighlightingRef (D-05, Pitfall 4)
- Phase 5: All Phase 5 CSS already in src/styles.css — do NOT redefine .mapping, .mol-list, .canvas-meta etc. in CSS Modules

### Research Flags (require empirical validation during implementation)

- **Phase 2:** `getInchi(true)` exact return format — CONFIRMED: `\nAuxInfo=` separator, N: field is 1-based draw-order rank (not Pool ID)
- **Phase 2:** COOP/COEP requirement — `coi-serviceworker.js` 404 in dev is harmless; WASM works without it on local dev and Netlify

### Critical Pitfalls to Watch

1. SWC plugin crash — use esbuild-based plugin (enforced: @vitejs/plugin-react@^6.0.0)
2. Ketcher CSS polluting design tokens — wrap in `@layer ketcher-reset { }` (done: appended to src/styles.css)
3. WASM/worker 404 in production — `vite-plugin-static-copy` + `assetsInlineLimit: 0` (done: configured)
4. `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring
5. Stale closures in `editor.subscribe` — read state through `useRef` in handler
6. Phase 5: KetcherPanel layout regression — Editor must be wrapped in div.canvasWrap (position:relative) before switching .ketcher to display:grid

### TODOs

- [x] Run `npm install` and inspect `node_modules/ketcher-standalone/dist/` for exact WASM asset paths — CONFIRMED: `binaryWasm/indigo-ketcher-1.40.0.wasm`, `indigo-ketcher-norender-1.40.0.wasm`, `indigoWorker-5d0a61ab.js`, etc.
- [x] Verify `staticResourcesUrl` correct value for Vite 8 — use `import.meta.env.BASE_URL` (resolves to `/explain-that-inchi/` in prod, `/` in dev)
- [ ] Decide: include MAP-03 (shareable URL) in Phase 6 or defer to v2 — currently in Phase 6

### Blockers

None

## Session Continuity

**Last session:** 2026-05-22T08:00:00.000Z
**Stopped at:** Phase 5 planned — 3 plans created
**Resume file:** .planning/phases/05-mapping-strip-and-preset-molecules/05-01-PLAN.md
**Next action:** Execute Phase 5 (`/gsd-execute-phase 5`)
