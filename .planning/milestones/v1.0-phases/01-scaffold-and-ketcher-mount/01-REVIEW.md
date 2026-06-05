---
phase: 01-scaffold-and-ketcher-mount
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - package.json
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
  - src/App.tsx
  - src/components/Header.tsx
  - src/components/KetcherPanel.tsx
  - src/components/KetcherPanel.module.css
  - vitest.config.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-19
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 1 scaffold is well-structured and correctly implements the major architectural constraints: `@vitejs/plugin-react` (esbuild variant confirmed, not SWC), the Ketcher `<Editor>` is never conditionally rendered, CSS cascade layering via `@layer ketcher-reset` isolates Ketcher's styles from the design token system, and `StandaloneStructServiceProvider` is created at module scope (not inside the component). The `vite-plugin-static-copy` configuration with `rename: { stripBase: true }` correctly flattens the WASM assets to the `dist/` root so `staticResourcesUrl={import.meta.env.BASE_URL}` resolves them.

Three issues warrant attention before moving to Phase 2: the loading overlay `z-index` is too low to cover Ketcher's own internal overlay stack during initialization, `vite.config.ts` is missing COOP/COEP server headers for the dev server (WASM workers require cross-origin isolation), and the `netlify.toml` deployment config is absent (required for production COOP/COEP headers on Netlify).

---

## Warnings

### WR-01: Loading overlay z-index too low — Ketcher internal overlays will bleed through

**File:** `src/components/KetcherPanel.module.css:26-37`

**Issue:** The `.loadingOverlay` uses `z-index: 10`. Ketcher's own CSS defines `--zindex-overlay: 200` (used for drag ghosts, modal overlays, and context menus) and has hardcoded values up to `z-index: 1000`. During the WASM initialization window — which can take several seconds — Ketcher may render internal UI elements that will appear on top of the loading overlay, creating a confusing partial UI before `onInit` fires.

**Fix:**
```css
.loadingOverlay {
  position: absolute;
  inset: 0;
  background: oklch(0.985 0.005 85 / 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
  z-index: 1001; /* must exceed Ketcher's highest internal z-index of 1000 */
}
```

---

### WR-02: Vite dev server missing COOP/COEP headers — WASM worker may fail in `npm run dev`

**File:** `vite.config.ts:1-22`

**Issue:** `ketcher-standalone` loads a Web Worker (`indigoWorker`) that fetches the `.wasm` binary. Modern browsers require `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) headers for `SharedArrayBuffer` and some WASM threading configurations. The `coi-serviceworker.js` polyfill handles this for the deployed build and for subsequent page loads in dev, but on the very first dev server load (before the service worker is active and triggers a reload), WASM initialization will run without these headers. If Ketcher 3.12.0 requires `crossOriginIsolated` for its Worker instantiation, the first dev-server load will fail silently or produce a cryptic WASM error.

**Fix:** Add server headers to `vite.config.ts`:
```ts
export default defineConfig({
  base: '/explain-that-inchi/',
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [
    react(),
    viteStaticCopy({ /* ... */ }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
});
```
This eliminates the one-reload penalty in dev and is safe — the service worker only activates when needed (GitHub Pages).

---

### WR-03: `netlify.toml` absent — production deployment will fail to serve WASM

**File:** (missing file — project root)

**Issue:** CLAUDE.md and the planning artifacts identify Netlify as the primary deployment target and explicitly require `netlify.toml` with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers. Without these headers, `SharedArrayBuffer` is unavailable in the browser and the Ketcher WASM worker will fail to initialize in the production build. The `coi-serviceworker.js` polyfill is documented as a GitHub Pages fallback only; Netlify is expected to serve the headers natively.

**Fix:** Create `netlify.toml` in the project root:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

---

## Info

### IN-01: Stub placeholder divs render visible empty boxes

**File:** `src/App.tsx:30-33`

**Issue:** The Phase 1 stubs `<div className="mapping" />` and `<div className="explain" />` carry CSS rules that render them as visible bordered boxes with backgrounds (`.mapping` has `border: 1px solid var(--line)`, padding, and background; `.explain` renders as an empty grid). This creates phantom UI elements below the Ketcher panel in the current build. This is likely intentional scaffolding, but worth noting.

**Fix:** Either add a `data-stub` attribute and hide stubs in CSS, or leave as-is and document that Phase 2 will replace them. No code change required if this is intentional.

---

### IN-02: `vitest.config.ts` does not inherit Vite plugin config — CSS Module imports in tests will be bare stubs

**File:** `vitest.config.ts:1-7`

**Issue:** The test config uses `defineConfig` from `vitest/config` (standalone) rather than extending `vite.config.ts`. This is correct for avoiding plugin side-effects, but means that if any future test imports a CSS Module (e.g., `KetcherPanel.module.css`), the CSS Module transform won't be active and the import will return an empty proxy object. This is the standard Vitest behaviour for CSS Modules and is not a problem in Phase 1 (no component tests yet), but it should be understood before adding integration tests that render `KetcherPanel`.

**Fix:** No change required now. When component tests are added, configure `css: { modules: { ... } }` in `vitest.config.ts` or mock CSS modules with `moduleNameMapper` if precise class names are asserted.

---

_Reviewed: 2026-05-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
