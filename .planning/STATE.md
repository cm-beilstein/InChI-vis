---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
last_updated: "2026-05-18T12:31:53.795Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.0
**Status:** Planning

## Current Phase

None — ready to start Phase 1

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 1 — Scaffold and Ketcher Mount

## Current Position

- **Phase:** —
- **Plan:** —
- **Status:** Not started
- **Progress:** 0/6 phases complete

```
[░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

## Performance Metrics

- Plans completed: 0
- Plans total: TBD (set after Phase 1 planning)
- Phases completed: 0 / 6

## Accumulated Context

### Key Decisions

- Use `@vitejs/plugin-react` (esbuild), NOT the SWC variant — SWC crashes on Ketcher packages (issue #5565)
- All three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) pinned to exactly 3.12.0
- `StandaloneStructServiceProvider` must be created at module level, never inside a component
- Ketcher `<Editor>` must never be conditionally rendered — WASM re-initializes on remount
- CSS Modules + CSS custom properties for styling — preserves the oklch token system from design handoff
- `vite-plugin-static-copy` required to copy WASM/worker assets; `assetsInlineLimit: 0` to prevent base64 inlining
- React state ownership is flat on `App`; Ketcher ref stored in `useRef`, never in state

### Research Flags (require empirical validation during implementation)

- **Phase 2:** `getInchi(true)` exact return format — split on `AuxInfo=` prefix; verify against real 3.12.0 output and write unit test
- **Phase 2:** COOP/COEP requirement — check `crossOriginIsolated` after first mount; add `coi-serviceworker` if needed
- **Phase 4:** `highlights.create` multi-call accumulation — confirm sequential calls accumulate correctly in 3.12.0

### Critical Pitfalls to Watch

1. SWC plugin crash — use esbuild-based plugin
2. Ketcher CSS polluting design tokens — wrap in `@layer ketcher-reset { }`
3. WASM/worker 404 in production — `vite-plugin-static-copy` + `assetsInlineLimit: 0`
4. `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring
5. Stale closures in `editor.subscribe` — read state through `useRef` in handler

### TODOs

- [ ] Run `npm install` and inspect `node_modules/ketcher-standalone/dist/` for exact WASM asset paths
- [ ] Verify `staticResourcesUrl` correct value for Vite 8 (`import.meta.env.BASE_URL` or `''`)
- [ ] Decide: include MAP-03 (shareable URL) in Phase 6 or defer to v2 — currently in Phase 6

### Blockers

None

## Session Continuity

**Last session:** 2026-05-18T12:31:53.789Z
**Next action:** Run `/gsd-plan-phase 1` to plan Phase 1 (Scaffold and Ketcher Mount)
