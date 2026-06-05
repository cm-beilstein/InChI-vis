---
phase: 01-scaffold-and-ketcher-mount
fixed_at: 2026-05-19T00:00:00Z
review_path: .planning/phases/01-scaffold-and-ketcher-mount/01-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-05-19
**Source review:** .planning/phases/01-scaffold-and-ketcher-mount/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03)
- Fixed: 2
- Skipped: 1

## Fixed Issues

### WR-01: Loading overlay z-index too low — Ketcher internal overlays will bleed through

**Files modified:** `src/components/KetcherPanel.module.css`
**Commit:** f7b6952
**Applied fix:** Changed `.loadingOverlay` z-index from `10` to `1001` with an explanatory comment. This ensures the loading overlay remains above Ketcher's highest internal z-index of 1000 throughout the WASM initialization window.

---

### WR-02: Vite dev server missing COOP/COEP headers — WASM worker may fail in `npm run dev`

**Files modified:** `vite.config.ts`
**Commit:** d351bf9
**Applied fix:** Added a `server.headers` block to `vite.config.ts` with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. This eliminates the one-reload penalty on first dev-server load before coi-serviceworker.js activates.

---

## Skipped Issues

### WR-03: `netlify.toml` absent — production deployment will fail to serve WASM

**File:** (missing file — project root)
**Reason:** Not applicable — project targets GitHub Pages; coi-serviceworker.js already handles COOP/COEP. The CLAUDE.md constraint states "static build (GitHub Pages or Netlify)" and the existing public/coi-serviceworker.js polyfill covers the GitHub Pages deployment path. Creating netlify.toml for a deployment target not in use would introduce dead configuration.
**Original issue:** Production COOP/COEP headers absent for Netlify deployment.

---

_Fixed: 2026-05-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
