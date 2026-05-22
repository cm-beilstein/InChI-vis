---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-22T00:00:00Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.0
**Status:** Executing

## Current Phase

Phase 5 — Mapping Strip (not yet planned)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phases 1–4 complete. Phase 5 (Mapping Strip) is next.

## Current Position

- **Phase:** 5 — Mapping Strip (not yet planned)
- **Plan:** none yet
- **Status:** Phase 4 UAT complete (2026-05-22); ready to plan Phase 5
- **Progress:** 4/6 phases complete

```
[████████████████░░░░░░░░░] 67%
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

### Research Flags (require empirical validation during implementation)

- **Phase 2:** `getInchi(true)` exact return format — CONFIRMED: `\nAuxInfo=` separator, N: field is 1-based draw-order rank (not Pool ID)
- **Phase 2:** COOP/COEP requirement — `coi-serviceworker.js` 404 in dev is harmless; WASM works without it on local dev and Netlify

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

**Last session:** 2026-05-22T00:00:00Z
**Stopped at:** Phase 4 UAT complete — all 7 browser tests passed. Three bugs fixed during UAT: Pool ID remapping, highlight feedback loop, N element color visibility.
**Resume file:** None — Phase 4 fully complete including UAT sign-off.
**Next action:** Phase 5 — Mapping Strip (`/gsd-plan-phase 5`)
