---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: null
last_updated: "2026-06-01T12:00:00.000Z"
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 23
  completed_plans: 20
  percent: 87
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.0
**Status:** IN PROGRESS — Phase 7 planned, ready to execute

## Current Phase

Phase 7 — Multi-Fragment Highlighting, p-Layer, and Copy (PLANNED — 3/3 plans ready)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 7 — multi-fragment-highlighting-p-layer-and-copy

## Current Position

Phase: 7 (multi-fragment-highlighting-p-layer-and-copy) — READY TO EXECUTE
Plan: 0 of 3

- **Phase:** 7 — Multi-Fragment Highlighting, p-Layer, and Copy (PLANNED)
- **Plan:** 3 plans ready — 07-00, 07-01, 07-02
- **Status:** Phase 7 planned; ready to execute
- **Progress:** 6/7 phases complete

```
[████████████████████████░] 87%
```

## Performance Metrics

- Plans completed: 2 (01-01-PLAN.md — 5 min, 01-02-PLAN.md — 6 min, 2026-05-19)
- Plans total: 2 (Phase 1)
- Phases completed: 1 / 6

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01-scaffold-and-ketcher-mount | 01 | 5min | 2 | 12 | 2026-05-19 |
| 01-scaffold-and-ketcher-mount | 02 | 6min | 2 | 7 | 2026-05-19 |

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

### Research Flags (require empirical validation during implementation)

- **Phase 2:** `getInchi(true)` exact return format — split on `AuxInfo=` prefix; verify against real 3.12.0 output and write unit test
- **Phase 2:** COOP/COEP requirement — check `crossOriginIsolated` after first mount; add `coi-serviceworker` if needed (coi-serviceworker.js is already in place from Plan 01)
- **Phase 4:** `highlights.create` multi-call accumulation — confirm sequential calls accumulate correctly in 3.12.0

### Critical Pitfalls to Watch

1. SWC plugin crash — use esbuild-based plugin (enforced: @vitejs/plugin-react@^6.0.0)
2. Ketcher CSS polluting design tokens — wrap in `@layer ketcher-reset { }` (done: appended to src/styles.css)
3. WASM/worker 404 in production — `vite-plugin-static-copy` + `assetsInlineLimit: 0` (done: configured)
4. `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring
5. Stale closures in `editor.subscribe` — read state through `useRef` in handler

### TODOs

- [x] Run `npm install` and inspect `node_modules/ketcher-standalone/dist/` for exact WASM asset paths — CONFIRMED: `binaryWasm/indigo-ketcher-1.40.0.wasm`, `indigo-ketcher-norender-1.40.0.wasm`, `indigoWorker-5d0a61ab.js`, etc.
- [x] Verify `staticResourcesUrl` correct value for Vite 8 — use `import.meta.env.BASE_URL` (resolves to `/explain-that-inchi/` in prod, `/` in dev)
- [x] Decide: include MAP-03 (shareable URL) in Phase 6 or defer to v2 — deferred to v2

### Blockers

None

## Session Continuity

**Last session:** 2026-06-01T07:32:19.263Z
**Stopped at:** context exhaustion at 75% (2026-06-01)
**Resume file:** None
**Next action:** Run /gsd-verify-work to confirm Phase 6 goals met, then /gsd-complete-milestone to archive v1.0
