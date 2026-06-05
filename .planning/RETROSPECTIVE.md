# Retrospective: Explain that InChI

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-06-05
**Phases:** 8 | **Plans:** 25 | **Commits:** 186

### What Was Built

1. Vite + React 18 + TypeScript + Ketcher WASM scaffold with design tokens, deployed to GitHub Pages via GitHub Actions CD
2. Live InChI pipeline: debounced generation, layer parsing, AuxInfo atom mapping (canonical→Ketcher index)
3. Color-coded interactive InChI strip with explanation cards, per-layer legend, and idle/hover state management
4. Full highlight integration: layer hover + sub-token hover drives Ketcher canvas atom/bond highlights (135+ tests, TDD throughout)
5. Multi-fragment molecule support with correct per-fragment canonical offset fix in parseAuxMapping/enrichLayers
6. Per-group h-layer sub-tokens with SVG hydrogen badges for implicit H, explicit H atom+bond highlights, mobile-H group highlights

### What Worked

- **Design handoff as executable spec**: The parsers and layer content in `molecules.js` and `layers-info.js` were final and transferred directly to TypeScript with minimal rework — porting verbatim saved significant design-cycle time.
- **TDD Wave 0 pattern**: Starting each phase with RED test stubs that defined the interface contract made GREEN implementation phases focused and verifiable. 135+ tests give real confidence.
- **Separate vitest.config.ts**: Immediately catching the Plugin type conflict between Vite 8 and Vitest 3's bundled Vite 6 prevented hours of mysterious build failures.
- **Module-level StandaloneStructServiceProvider**: Establishing this rule early (Phase 1) prevented WASM re-init bugs that would have been hard to diagnose later.
- **Zustand flat store**: Simple, no middleware, easy to evolve across 8 phases. Right choice for this scope.

### What Was Inefficient

- **REQUIREMENTS.md never updated**: 5 requirements (INCHI-05–08, PLSH-04) added to ROADMAP during development were never backfilled. Required manual reconciliation at milestone close.
- **Browser verification paused at context exhaustion**: Phase 8 badge positioning and the final b-layer commit were not browser-verified before the milestone closed. Leaves two unconfirmed changes.
- **Multi-fragment bug (Phase 7)**: The fragment offset bug in parseAuxMapping required a deeper fix than anticipated — enrichLayers also needed per-fragment parsing. Unit tests on real InChI strings would have caught this earlier.

### Patterns Established

- Wave 0 TDD: always open a phase with failing test stubs defining the interface contract
- Module-level WASM provider: never inside a component
- `getInchi(true)` → split on `AuxInfo=` → parse AuxInfo block for canonical→Ketcher mapping
- `useRef` in `editor.subscribe` handler to avoid stale closures
- `vite-plugin-static-copy` v4 + `assetsInlineLimit: 0` for WASM serving

### Key Lessons

1. Pin all Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) to the same exact version — any skew causes subtle type/runtime mismatches.
2. For multi-fragment InChI, canonical indices restart at 1 per fragment — the cumulative offset must be tracked in `parseAuxMapping` and propagated through `enrichLayers`.
3. Separate `vitest.config.ts` is non-negotiable with Vite 8 + Vitest 3.
4. Keep REQUIREMENTS.md in sync with ROADMAP as requirements are added mid-milestone — otherwise milestone close requires manual archaeology.
5. Browser-verify after every badge/DOM-injection feature before closing context.
