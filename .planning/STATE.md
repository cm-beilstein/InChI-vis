---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-06-10T07:00:00.000Z"
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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260610-cho | Fix preset-highlight guard timing and stale-result guard in handleChange | 2026-06-10 | 25ddba0 | [260610-cho-fix-preset-highlight-guard-timing-and-st](./quick/260610-cho-fix-preset-highlight-guard-timing-and-st/) |
| 260610-csa | Decouple LayerText rawText from positional rawParts index in InchiSection | 2026-06-10 | 4736a28 | [260610-csa-decouple-layertext-rawtext-from-position](./quick/260610-csa-decouple-layertext-rawtext-from-position/) |
| 260610-d2r | Fix mixed N*...;N*... hover-highlight bug in LayerText (c/h layers) — pre-existing v1.0 bug | 2026-06-10 | e212dde | [260610-d2r-fix-mixed-n-star-semicolon-hover-highlig](./quick/260610-d2r-fix-mixed-n-star-semicolon-hover-highlig/) |
| 260610-eci | Fix canonical→pool-ID remap for multi-component molecules (coordinate matching via AuxInfo /rC:) — fixes wrong-fragment canvas highlights | 2026-06-10 | 079d12c | [260610-eci-fix-canonical-to-pool-id-remap-for-multi](./quick/260610-eci-fix-canonical-to-pool-id-remap-for-multi/) |

Last activity: 2026-06-10 - Completed quick task 260610-eci: Fix canonical→pool-ID remap for multi-component molecules (coordinate matching)

### Known Follow-ups (multi-fragment, deferred)
- `readingFor` (layerInfo.ts) has no multi-fragment awareness: formula ignores `.`; c/h/t use un-offset atom labels and c invents a spurious cross-fragment bond → explanation-card text wrong for multi-component molecules.
- t-layer drops `?` (undefined) stereocenters in both `readingFor` and `highlightUtils` case 't' → stereo highlight/reading incomplete.
