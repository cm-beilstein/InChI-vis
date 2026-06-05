---
phase: 01-scaffold-and-ketcher-mount
plan: "01"
subsystem: infra
tags: [vite, react, typescript, ketcher, wasm, css, coi-serviceworker]

requires: []
provides:
  - Vite 8 + React 18 + TypeScript project scaffold with all Ketcher packages at 3.12.0
  - vite.config.ts with GitHub Pages base path, assetsInlineLimit:0, and WASM static-copy
  - coi-serviceworker.js polyfill for GitHub Pages COOP/COEP SharedArrayBuffer support
  - src/styles.css verbatim copy of design token CSS with @layer ketcher-reset isolation
  - src/main.tsx entry point importing styles.css globally before App
  - index.html with coi-serviceworker as first head script via %BASE_URL% template
affects:
  - 01-02 (KetcherPanel and App shell components depend on this scaffold)
  - all subsequent phases (build config, design tokens, TypeScript configs)

tech-stack:
  added:
    - vite@^8.0.0
    - react@^18.3.1 + react-dom@^18.3.1
    - typescript@~5.7.2
    - ketcher-react@3.12.0 + ketcher-standalone@3.12.0 + ketcher-core@3.12.0
    - zustand@5.0.13
    - "@vitejs/plugin-react@^6.0.0 (esbuild, NOT SWC)"
    - vite-plugin-static-copy@^4.0.0
    - vitest@^3.0.0
  patterns:
    - "%BASE_URL% template variable for Vite base-aware static asset paths in index.html"
    - "vite-plugin-static-copy copies binaryWasm/*.{wasm,js} to dist root for production WASM serving"
    - "assetsInlineLimit:0 prevents WASM base64 inlining which breaks Web Workers"
    - "@layer ketcher-reset isolates Ketcher CSS so unlayered design tokens win cascade"

key-files:
  created:
    - package.json
    - package-lock.json
    - vite.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - src/vite-env.d.ts
    - index.html
    - src/styles.css
    - src/main.tsx
    - public/coi-serviceworker.js
    - .gitignore
  modified: []

key-decisions:
  - "@vitejs/plugin-react version bumped from ^4.3.1 to ^6.0.0 — v4.x does not support Vite 8 (peer dep constraint); v6.0.2 supports Vite ^8.0.0 and still uses esbuild (not SWC)"
  - "vite-plugin-static-copy version bumped from ^2.0.0 to ^4.0.0 — v2.x only supports Vite ^5/6; v4.1.0 supports Vite ^6/7/8"

patterns-established:
  - "Vite base: /explain-that-inchi/ (GitHub Pages repo name as base path)"
  - "coi-serviceworker first script in <head> via %BASE_URL% for COOP/COEP polyfill"
  - "styles.css imported in main.tsx before all other imports — establishes cascade priority"
  - "@layer ketcher-reset at end of styles.css — Ketcher CSS layered here by KetcherPanel"

requirements-completed:
  - EDIT-01
  - PLSH-02

duration: 5min
completed: "2026-05-19"
---

# Phase 1 Plan 01: Scaffold and Ketcher Mount — Scaffold Summary

**Vite 8 + React 18 + TypeScript scaffold with all three Ketcher 3.12.0 packages installed, WASM static-copy configured for GitHub Pages, and design token CSS wired as the global cascade root**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-19T11:49:43Z
- **Completed:** 2026-05-19T11:54:42Z
- **Tasks:** 2
- **Files created:** 12 (including .gitignore deviation)

## Accomplishments

- All Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) installed at exactly 3.12.0
- `vite.config.ts` with `base: '/explain-that-inchi/'`, `assetsInlineLimit: 0`, and `viteStaticCopy` targeting `binaryWasm/*.{wasm,js}` for production WASM serving
- `public/coi-serviceworker.js` (6028 bytes) downloaded from canonical source; wired as first `<head>` script via `%BASE_URL%` template variable
- `src/styles.css` is a verbatim copy of the 697-line design handoff CSS with `@layer ketcher-reset {}` appended for Ketcher CSS cascade isolation
- `src/main.tsx` imports `styles.css` as the first import, establishing cascade priority for unlayered design tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite project and install all dependencies** — `a4546a0` (chore)
2. **Task 2: Wire HTML entry point, coi-serviceworker, and design tokens** — `3e62cd7` (feat)
3. **Deviation: Add .gitignore** — `f0d1954` (chore)

## Files Created

- `/home/bsmue/code/InChI-vis/package.json` — Project manifest with Ketcher 3.12.0, React 18, Zustand 5, @vitejs/plugin-react@^6.0.0
- `/home/bsmue/code/InChI-vis/package-lock.json` — Lockfile (379 packages)
- `/home/bsmue/code/InChI-vis/vite.config.ts` — Vite 8 config: base, assetsInlineLimit:0, viteStaticCopy for WASM
- `/home/bsmue/code/InChI-vis/tsconfig.json` — TypeScript root config with project references
- `/home/bsmue/code/InChI-vis/tsconfig.app.json` — App TS config: ES2020, react-jsx, strict
- `/home/bsmue/code/InChI-vis/tsconfig.node.json` — Node TS config: ES2022 for vite.config.ts
- `/home/bsmue/code/InChI-vis/src/vite-env.d.ts` — Vite client types reference
- `/home/bsmue/code/InChI-vis/index.html` — HTML entry: coi-serviceworker first, IBM Plex fonts, module script
- `/home/bsmue/code/InChI-vis/src/styles.css` — Verbatim design token CSS + @layer ketcher-reset
- `/home/bsmue/code/InChI-vis/src/main.tsx` — React entry point: imports styles.css globally, mounts App
- `/home/bsmue/code/InChI-vis/public/coi-serviceworker.js` — COOP/COEP polyfill for GitHub Pages
- `/home/bsmue/code/InChI-vis/.gitignore` — Ignores node_modules, dist, editor artifacts

## Decisions Made

1. **`@vitejs/plugin-react` upgraded to `^6.0.0`** — Plan specified `^4.3.1` but `@vitejs/plugin-react@4.x` has a peer dependency constraint of `vite@^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0` — it does not support Vite 8. Version 6.0.2 is the esbuild-based plugin (NOT SWC) that declares `peer vite: ^8.0.0`. The SWC avoidance constraint from CLAUDE.md is preserved — `@vitejs/plugin-react` v6 still uses esbuild.

2. **`vite-plugin-static-copy` upgraded to `^4.0.0`** — Plan specified `^2.0.0` but v2.x only supports `vite@^5.0.0 || ^6.0.0`. Version 4.1.0 supports `vite@^6.0.0 || ^7.0.0 || ^8.0.0`. No API changes to the `targets` configuration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @vitejs/plugin-react version constraint incompatible with Vite 8**
- **Found during:** Task 1 (npm install)
- **Issue:** `@vitejs/plugin-react@^4.3.1` requires `vite@^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0` — npm ERESOLVE failure
- **Fix:** Updated to `@vitejs/plugin-react@^6.0.0` which supports Vite 8. Still esbuild-based (not SWC), so the anti-pattern constraint is preserved.
- **Files modified:** package.json
- **Verification:** npm install exits 0; `grep "plugin-react'" vite.config.ts | grep -v swc` passes
- **Committed in:** a4546a0 (Task 1 commit)

**2. [Rule 1 - Bug] vite-plugin-static-copy version constraint incompatible with Vite 8**
- **Found during:** Task 1 (npm install, second attempt after fix 1)
- **Issue:** `vite-plugin-static-copy@^2.0.0` peer dep is `vite@^5.0.0 || ^6.0.0` — npm ERESOLVE failure
- **Fix:** Updated to `vite-plugin-static-copy@^4.0.0` which supports Vite 8. API unchanged.
- **Files modified:** package.json
- **Verification:** npm install exits 0; `grep "binaryWasm" vite.config.ts` passes
- **Committed in:** a4546a0 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added .gitignore**
- **Found during:** Post-Task 2 untracked file check
- **Issue:** No .gitignore existed; `node_modules/` was untracked and could be accidentally committed
- **Fix:** Created `.gitignore` with standard Node.js/Vite entries: node_modules/, dist/, .vite/, .env, editor artifacts
- **Files modified:** .gitignore (new file)
- **Verification:** `git status --short` shows no untracked files after adding .gitignore
- **Committed in:** f0d1954

---

**Total deviations:** 3 auto-fixed (2 Rule 1 version compatibility bugs, 1 Rule 2 missing .gitignore)
**Impact on plan:** All auto-fixes necessary for the scaffold to build at all. No scope creep. The SWC avoidance constraint from CLAUDE.md is explicitly preserved in both plugin fixes.

## Issues Encountered

- `@vitejs/plugin-react@4.x` and `vite-plugin-static-copy@2.x` were both incompatible with Vite 8 (the plan was written before their Vite 8 support was available). Both have Vite 8 compatible major versions that preserve the same API.

## Known Stubs

- `src/main.tsx` imports `./App` which does not exist yet. TypeScript will error on `tsc -b` until Plan 02 creates `src/App.tsx`. This is documented in the plan as expected: "Plan 01 establishes the scaffold; Plan 02 completes it."

## Next Phase Readiness

- Scaffold is fully in place. Plan 02 can create `src/App.tsx`, `src/components/Header.tsx`, and `src/components/KetcherPanel.tsx` against this foundation.
- `npm run dev` will fail until `src/App.tsx` exists (TypeScript module resolution). This is expected — Plan 02 resolves it.
- `node_modules/ketcher-standalone/dist/binaryWasm/` confirmed to contain the exact WASM filenames referenced in RESEARCH.md (`indigo-ketcher-1.40.0.wasm`, `indigo-ketcher-norender-1.40.0.wasm`, `indigoWorker-5d0a61ab.js`, etc.)

---
*Phase: 01-scaffold-and-ketcher-mount*
*Completed: 2026-05-19*
