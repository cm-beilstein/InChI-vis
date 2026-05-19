---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-19T11:54:42Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.0
**Status:** Executing

## Current Phase

Phase 1 — Scaffold and Ketcher Mount (Executing — 1/2 plans complete)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 1 — Plan 02 (Ketcher mount and App shell components)

## Current Position

- **Phase:** 1 — Scaffold and Ketcher Mount
- **Plan:** 02 — Ketcher Mount and App Shell (ready to execute)
- **Status:** Executing (1/2 plans complete)
- **Progress:** 0/6 phases complete (Phase 1 in progress)

```
[░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

## Performance Metrics

- Plans completed: 1 (01-01-PLAN.md — 5 min, 2026-05-19)
- Plans total: 2 (Phase 1)
- Phases completed: 0 / 6

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01-scaffold-and-ketcher-mount | 01 | 5min | 2 | 12 | 2026-05-19 |

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
- [ ] Decide: include MAP-03 (shareable URL) in Phase 6 or defer to v2 — currently in Phase 6

### Blockers

None

## Session Continuity

**Last session:** 2026-05-19T11:54:42Z
**Stopped at:** Completed 01-01-PLAN.md (scaffold and config files)
**Resume file:** .planning/phases/01-scaffold-and-ketcher-mount/01-02-PLAN.md
**Next action:** Execute Plan 02 — Ketcher mount and App shell components (`npm run dev` will work after App.tsx is created)
