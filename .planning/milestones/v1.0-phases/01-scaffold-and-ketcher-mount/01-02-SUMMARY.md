---
phase: 01-scaffold-and-ketcher-mount
plan: "02"
subsystem: ui
tags: [react, ketcher, wasm, css-modules, loading-state]

requires:
  - 01-01 (Vite 8 scaffold, design tokens, WASM static-copy)

provides:
  - App.tsx with module-level StandaloneStructServiceProvider, isReady state, ketcherRef, full layout shell
  - src/components/Header.tsx faithful port from design handoff
  - src/components/KetcherPanel.tsx with permanent Editor mount and loading overlay
  - src/components/KetcherPanel.module.css with Ketcher CSS cascade isolation via @import layer()

affects:
  - All subsequent phases (layout shell stubs replaced by real components)
  - Phase 2+ (ketcherRef available for getInchi, highlights.create calls)

tech-stack:
  added: []
  patterns:
    - "Module-level StandaloneStructServiceProvider (D-13) — created once, outside App function"
    - "ketcherRef useRef pattern (D-15) — Ketcher instance stored in ref, not state"
    - "Permanent Editor mount with conditional overlay (D-09) — <Editor> never unmounts"
    - "@import layer(ketcher-reset) CSS syntax — Ketcher CSS in cascade layer, design tokens win"
    - "staticResourcesUrl={import.meta.env.BASE_URL} for WASM asset resolution (D-10)"
    - "Separate vitest.config.ts to avoid type conflicts with Vite 8 + Vitest 3"

key-files:
  created:
    - src/App.tsx
    - src/components/Header.tsx
    - src/components/KetcherPanel.tsx
    - src/components/KetcherPanel.module.css
    - vitest.config.ts
  modified:
    - vite.config.ts (removed test property, added rename:{stripBase:true})
    - tsconfig.node.json (reverted vitest types workaround)

key-decisions:
  - "CSS import layer syntax: @import 'ketcher-react/dist/index.css' layer(ketcher-reset) — Vite does not support @import inside @layer{} blocks (CSS spec limitation: @import must be top-level). The @import layer() syntax achieves identical cascade isolation with full Vite support."
  - "Separate vitest.config.ts — Vite 8 uses rolldown internally; vitest 3 bundles its own Vite 6 copy. Using defineConfig from vitest/config causes Plugin type conflicts because the two Vite versions have incompatible Plugin types. Separating the config files avoids the collision entirely."
  - "vite-plugin-static-copy rename:{stripBase:true} — v4.x preserves full directory structure by default. Without stripBase, WASM files were copied to dist/node_modules/ketcher-standalone/dist/binaryWasm/ instead of dist/. The rename option flattens the copy so WASM files land at dist/ root where staticResourcesUrl=BASE_URL expects them."

patterns-established:
  - "Header and KetcherPanel components use global CSS class names from styles.css — no CSS Module needed for Header since all its classes are already globally defined"
  - "Stub div pattern: <div className='inchi-section' /> etc. — exact class names from styles.css, ready for later phases to replace"

requirements-completed:
  - EDIT-01
  - PLSH-02

duration: 6min
completed: "2026-05-19"
---

# Phase 1 Plan 02: Scaffold and Ketcher Mount — React Components Summary

**React layout shell with permanently-mounted Ketcher Editor, loading overlay, and full page structure using module-level WASM provider and CSS cascade layer isolation**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-19T11:58:06Z
- **Completed:** 2026-05-19T12:04:06Z
- **Tasks:** 2
- **Files created:** 5 (App.tsx, Header.tsx, KetcherPanel.tsx, KetcherPanel.module.css, vitest.config.ts)
- **Files modified:** 2 (vite.config.ts, tsconfig.node.json)

## Accomplishments

- `src/App.tsx` — root component with module-level `StandaloneStructServiceProvider` (D-13), `useRef` for Ketcher instance (D-15), `isReady` state, `handleInit` callback, and stub divs with exact CSS class names (`inchi-section`, `mapping`, `explain`, `footnote`)
- `src/components/Header.tsx` — faithful TypeScript port of design handoff Header with exact copy strings, middle dot (U+00B7), and `<em>InChI</em>` italic
- `src/components/KetcherPanel.tsx` — Ketcher `<Editor>` always in DOM (D-09), loading overlay with "Loading editor…" (U+2026) centered in `--ink-soft` mono 13px, `staticResourcesUrl={import.meta.env.BASE_URL}` (D-10)
- `src/components/KetcherPanel.module.css` — Ketcher CSS scoped to `ketcher-reset` cascade layer via `@import layer()` syntax; loading overlay with `position: absolute; inset: 0; z-index: 10`
- `npm run build` exits 0 — TypeScript clean, WASM assets at dist root, Ketcher CSS inside `@layer ketcher-reset`

## Task Commits

1. **Task 1: App.tsx with layout shell** — `17b129a` (feat)
2. **Task 2: Header, KetcherPanel, CSS; fix build config** — `b741a9e` (feat)

## Files Created

- `/home/bsmue/code/InChI-vis/src/App.tsx` — Root component: module-level provider, isReady, ketcherRef, layout shell
- `/home/bsmue/code/InChI-vis/src/components/Header.tsx` — Static header: "Explain that InChI", version, tagline
- `/home/bsmue/code/InChI-vis/src/components/KetcherPanel.tsx` — Ketcher Editor mount with loading overlay
- `/home/bsmue/code/InChI-vis/src/components/KetcherPanel.module.css` — Ketcher CSS in layer(ketcher-reset), overlay styles
- `/home/bsmue/code/InChI-vis/vitest.config.ts` — Separate vitest config to avoid Vite 8/Vitest 3 type conflicts

## Files Modified

- `/home/bsmue/code/InChI-vis/vite.config.ts` — Removed test:{} block (TS2769); added rename:{stripBase:true} to viteStaticCopy
- `/home/bsmue/code/InChI-vis/tsconfig.node.json` — Reverted experimental vitest/config types workaround

## Decisions Made

1. **CSS @import layer() syntax** — The plan specified `@layer ketcher-reset { @import ... }` but CSS spec prohibits `@import` inside `@layer { }` blocks — @import rules must be at the top level. Vite follows the spec and does not inline the @import when nested inside @layer braces. Used `@import 'ketcher-react/dist/index.css' layer(ketcher-reset)` instead — this is the CSS level 5 cascade layers syntax that achieves identical isolation and is fully supported by Vite's CSS processor.

2. **Separate vitest.config.ts** — Vitest 3 bundles Vite 6 internally; the project uses Vite 8 (rolldown). `defineConfig` from `vitest/config` causes Plugin type incompatibilities due to the two Vite instances having divergent `Plugin` interfaces. Separating into `vitest.config.ts` using `vitest/config`'s `defineConfig` avoids the collision while preserving all functionality.

3. **viteStaticCopy rename:{stripBase:true}** — vite-plugin-static-copy v4 preserves full source directory structure by default (unlike v2). Without `stripBase: true`, WASM files were copied to `dist/node_modules/ketcher-standalone/dist/binaryWasm/*.wasm` instead of `dist/*.wasm`. The `staticResourcesUrl=BASE_URL` prop expects WASM at `dist/` root.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vite.config.ts test property causing TypeScript TS2769 error**
- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** `test: { environment: 'jsdom' }` in `vite.config.ts` caused `TS2769: Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'`. The `test` property requires vitest type augmentation which conflicts with Vite 8's rolldown-based Plugin types.
- **Fix:** Removed `test` block from `vite.config.ts` and created `vitest.config.ts` using `defineConfig` from `vitest/config`.
- **Files modified:** `vite.config.ts`, `vitest.config.ts` (new)
- **Verification:** `npm run build` exits 0 without TS errors

**2. [Rule 1 - Bug] WASM files copied to nested dist path instead of dist root**
- **Found during:** Task 2 verification (post-build check of dist/ contents)
- **Issue:** `vite-plugin-static-copy` v4 preserves directory structure by default. WASM files were landing at `dist/node_modules/ketcher-standalone/dist/binaryWasm/` — unreachable at `BASE_URL`. The 01-01 plan used `dest: ''` without `rename: {stripBase: true}`, which was valid for v2 behavior but broken in v4.
- **Fix:** Added `rename: { stripBase: true }` to the viteStaticCopy target in `vite.config.ts`.
- **Files modified:** `vite.config.ts`
- **Verification:** `find dist -name '*.wasm'` shows files at `dist/indigo-ketcher-*.wasm` (dist root)
- **Committed in:** `b741a9e`

**3. [Rule 1 - Bug] @import inside @layer{} not supported by Vite/CSS spec**
- **Found during:** Task 2 (CSS implementation)
- **Issue:** The plan specified `@layer ketcher-reset { @import 'ketcher-react/dist/index.css'; }`. CSS spec requires `@import` rules to be at the top level — they cannot appear inside `@layer {}` blocks. Vite follows the spec and would leave the `@import` as a literal string without inlining it, breaking Ketcher CSS in production.
- **Fix:** Used `@import 'ketcher-react/dist/index.css' layer(ketcher-reset)` — the CSS cascade layers import syntax. This assigns the imported CSS to the `ketcher-reset` layer at import time, achieving the same isolation goal.
- **Files modified:** `src/components/KetcherPanel.module.css`
- **Verification:** Built CSS shows `@layer ketcher-reset{...}` wrapping all Ketcher rules; design tokens remain unlayered and win the cascade.
- **Committed in:** `b741a9e`

---

**Total deviations:** 3 auto-fixed (3 Rule 1 pre-existing bugs from Plan 01 config, now surfaced by first `npm run build` with actual components)

## Known Stubs

The following stubs in `src/App.tsx` are intentional and documented (per D-05):

| Stub | Class | File | Reason |
|------|-------|------|--------|
| `<div className="inchi-section" />` | `inchi-section` | src/App.tsx | Phase 2 will replace with InchiSection component |
| `<div className="mapping" />` | `mapping` | src/App.tsx | Phase 3+ will replace with MappingStrip component |
| `<div className="explain" />` | `explain` | src/App.tsx | Phase 3+ will replace with Explanation component |
| `<div className="footnote" />` | `footnote` | src/App.tsx | Phase 3+ will replace with Footnote component |

These stubs are intentional per D-05. The class names match `styles.css` exactly so layout is preserved when later phases replace them. The plan's goal (EDIT-01, PLSH-02) is not blocked by these stubs.

## Issues Encountered

- Vite 8's use of rolldown (instead of rollup) causes Plugin type incompatibilities with libraries that bundle their own Vite copy (vitest). This pattern will recur for any tool that bundles Vite internally.
- `@import` inside `@layer {}` is a CSS spec limitation that also affects PostCSS-based toolchains. The `@import layer()` syntax is the standards-compliant solution.
- `vite-plugin-static-copy` v4 changed default behavior for directory structure preservation (v2 was flat by default). This is a breaking change from the perspective of configurations that relied on v2 behavior.

## Next Phase Readiness

- `npm run dev` will show the Ketcher editor in the browser. `getInchi()` and `highlights.create` are callable from DevTools console after WASM initializes.
- All phase success criteria are checkable from the browser:
  - EDIT-01: Ketcher editor mounted, `getInchi()` callable, `highlights.create` callable
  - PLSH-02: Loading overlay visible during WASM init, disappears after `onInit` fires
  - CSS custom properties from `styles.css` resolve correctly; Ketcher CSS does not override them (verified by `@layer` isolation)

---
*Phase: 01-scaffold-and-ketcher-mount*
*Completed: 2026-05-19*
