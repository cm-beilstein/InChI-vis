---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-06-08T11:52:27.330Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.0 MVP — ✅ SHIPPED 2026-06-05
**Status:** Complete

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-05)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Planning next milestone (v2.0) — run `/gsd-new-milestone`

## Milestone Archive

- Full details: `.planning/MILESTONES.md`
- Roadmap archive: `.planning/milestones/v1.0-ROADMAP.md`
- Requirements archive: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Git tag: `v1.0`

## Key Decisions (carry-forward)

- Use `@vitejs/plugin-react` (esbuild), NOT the SWC variant — SWC crashes on Ketcher packages (issue #5565)
- All three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) pinned to exactly 3.12.0
- `StandaloneStructServiceProvider` must be created at module level, never inside a component
- Ketcher `<Editor>` must never be conditionally rendered — WASM re-initializes on remount
- CSS Modules + CSS custom properties for styling — preserves the oklch token system from design handoff
- `vite-plugin-static-copy` required to copy WASM/worker assets; `assetsInlineLimit: 0` to prevent base64 inlining
- Separate `vitest.config.ts` for Vite 8 + Vitest 3 — Plugin type conflict if merged
- `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring
- Stale closures in `editor.subscribe` — read state through `useRef` in handler

## Known Open Items at v1.0 Close

- Phase 8 badge positioning: tweaked but not browser-verified before context exhaustion
- b-layer highlighting + legend hover trigger: landed in last commit — not browser-verified
- MAP-03 (shareable URL): deferred to v2

## Blockers

None
