# Milestones: Explain that InChI

---

## v1.0 MVP

**Shipped:** 2026-06-05
**Phases:** 1–8 (8 phases, 25 plans)
**Timeline:** 18 days (2026-05-18 → 2026-06-05)
**Commits:** 186
**LOC:** ~4,773 TypeScript

### Delivered

Full browser-based InChI explainer: Ketcher WASM editor with live InChI generation, color-coded interactive layer strip, explanation cards, legend, atom-mapping strip, 10 preset molecules, multi-layer canvas highlighting, and GitHub Pages deployment — all running without a backend.

### Key Accomplishments

1. Vite + React 18 + TypeScript + Ketcher WASM scaffold with design tokens, deployed to GitHub Pages via GitHub Actions CD
2. Live InChI pipeline: debounced generation, layer parsing, AuxInfo atom mapping (canonical→Ketcher index)
3. Color-coded interactive InChI strip with explanation cards, per-layer legend, and idle/hover state management
4. Full highlight integration: layer hover + sub-token hover drives Ketcher canvas atom/bond highlights (TDD throughout, 135+ tests)
5. Multi-fragment molecule support with correct per-fragment canonical offset fix in parseAuxMapping and enrichLayers
6. Per-group h-layer sub-tokens with SVG hydrogen badges for implicit H, explicit H atom+bond highlights, mobile-H group highlights

### Requirements

20/20 v1 requirements shipped. MAP-03 (shareable URL) deferred to v2.

### Known Deferred Items at Close

- MAP-03: Shareable URL encoding — deferred to v2
- Phase 8 badge positioning: tweaked but not fully browser-verified before context exhaustion
- b-layer highlighting + legend hover trigger: landed in last commit before milestone close — not browser-verified

### Archive

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — requirements with outcomes
