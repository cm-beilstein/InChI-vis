# Stack Research: Explain That InChI

**Researched:** 2026-05-18
**Vite latest:** 8.0.10 (HIGH confidence — official docs)
**ketcher-react latest stable:** 3.12.0 (HIGH confidence — Snyk version registry)

---

## Recommended Stack

### Core

| Layer | Choice | Version | Confidence |
|-------|--------|---------|-----------|
| Build tool | Vite | ^8.0 (latest) | HIGH |
| UI framework | React | ^18.2 | HIGH |
| Language | TypeScript | ^5.x | HIGH |
| Molecule editor | ketcher-react | 3.12.0 | HIGH |
| Standalone WASM provider | ketcher-standalone | 3.12.0 (keep in sync) | HIGH |
| Type definitions | ketcher-core | 3.12.0 (keep in sync) | HIGH |
| State management | Zustand | ^5.0.13 | HIGH |
| Styling | CSS Modules + CSS custom properties | (built into Vite) | HIGH |
| Deployment | Netlify (primary) / GitHub Pages (fallback) | — | MEDIUM |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-static-copy | ^2.x | Copy Ketcher WASM/worker assets from node_modules to dist/public | Required — WASM files must be served at a known URL |
| @vitejs/plugin-react | ^4.x | React fast-refresh, JSX transform | Required — use standard esbuild plugin (not SWC variant) |
| coi-serviceworker | latest (copy from repo) | Polyfill COOP/COEP headers via Service Worker | Required only for GitHub Pages; not needed on Netlify |

---

## Rationale

### Vite 8 + react-ts template

Use `npm create vite@latest -- --template react-ts`. Vite 8 is the current stable. The template produces `tsconfig.app.json` (src files) and `tsconfig.node.json` (vite.config.ts), which is the correct two-config split. No scaffolding alternatives are needed — this is the Ketcher project's own development setup as of 2025.

**WASM note:** Ketcher's `indigo-ketcher` WASM appears to be single-threaded (no evidence of `SharedArrayBuffer` requirement from the Indigo build flags). This means cross-origin isolation headers are not categorically required by the chemistry library itself. However, this has medium confidence — the SWC crash issue (#5565) was filed against an older version and may already be resolved in 3.x. Validate at integration time.

### React 18, not React 19

`ketcher-react` peer deps are pinned to `^18.2.0`. GitHub issue #6657 shows a bump to React 19 was opened but not yet merged as of the 3.12.0 release. Stick with React 18 to avoid peer-dep warnings or subtle compatibility issues. React 18 is fully production-ready for this use case.

### ketcher-react + ketcher-standalone + ketcher-core — all at 3.12.0

These three packages are a monorepo and must be kept version-locked to each other. The latest stable release is **3.12.0** (published March 4, 2026, built with Indigo 1.40). RC versions (3.15.0-rc.x, 3.16.0-rc.1) exist but should be avoided for a production tool — they are not stable releases.

**Package roles:**
- `ketcher-react` — exports the `Editor` React component and `ButtonsConfig` type
- `ketcher-standalone` — exports `StandaloneStructServiceProvider` (WASM-backed, no server needed)
- `ketcher-core` — exports `Ketcher` type (used for typing the `onInit` callback result)

**Critical API facts:**
- `getInchi(withAuxInfo?: boolean): Promise<string>` — the `true` overload returns InChI + AuxInfo block containing the canonical→Ketcher atom mapping the project needs
- `setMolecule(mol: string): Promise<void>` — used for preset loading
- Structure change events: subscribe via `ketcher.editor.subscribe('change', handler)` — no `onChange` prop on `<Editor>`; the editor event bus is the mechanism
- `onInit` callback: `<Editor onInit={(ketcher: Ketcher) => void}>`
- `staticResourcesUrl` prop: must point to where `help.md`, `library.sdf`, and WASM asset files are served. In Vite, set to `''` or `'/'` — the files must be physically present at that URL via the `vite-plugin-static-copy` step below

**DO NOT use the SWC-based Vite React plugin** (`@vitejs/plugin-react-swc`). A confirmed SWC crash (panic: "width 3 given for non-narrow character") occurs when building ketcher packages with the SWC compiler. Use the standard `@vitejs/plugin-react` (esbuild-based) instead.

### Zustand 5 for state management

The application state described in the project (`molfile`, `inchi`, `layers`, `auxMap`, `hoveredLayerIdx`, `subHover`) is a single flat-ish store — a canonical Zustand use case. Zustand 5 requires React 18+ (matches our constraint) and eliminates the `use-sync-external-store` shim by using the native React API directly. The API surface is minimal: one `create<State>()` call, subscribe to slices.

**Why not Jotai:** The state here is moderately interconnected — `inchi` and `auxMap` are derived from `molfile`, and `layers` is parsed from `inchi`. Zustand's centralized store makes these derivations explicit in a single place. Jotai's atom graph would work but adds indirection without benefit at this scale.

**Why not plain `useState`:** The `hoveredLayerIdx` and `subHover` need to be read by the Ketcher canvas wrapper (to drive atom highlights) and by the `InchiSection` (to drive visual dim/highlight). This cross-tree sharing without prop-drilling justifies a store.

### CSS Modules — do NOT use Tailwind

The design handoff `styles.css` is the canonical source of truth and uses:
- `oklch()` color space (Tailwind 3.x doesn't support oklch natively; Tailwind 4 does but adds migration cost)
- ~60+ CSS custom properties as a structured token system
- Precise typographic tokens (IBM Plex Sans/Serif/Mono via `@font-face` or Google Fonts)

CSS Modules preserve every CSS custom property as-is, require zero migration from the design handoff tokens, and produce scoped class names. Tailwind would require either duplicating all tokens into `tailwind.config.js` or abandoning the `--var` system entirely — both approaches introduce drift from the design source of truth.

**The right model:** `styles.css` in the project root (or `src/styles/`) holds all `:root` tokens verbatim (copied from handoff). Component `.module.css` files reference those tokens via `var(--c-formula)` etc. No Tailwind needed.

---

## Build and Deploy Considerations

### Vite config skeleton

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'           // esbuild, NOT react-swc
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          // Copy Ketcher's static resources (help.md, library.sdf, WASM files)
          // into dist root so staticResourcesUrl='' resolves correctly
          src: 'node_modules/ketcher-standalone/dist/indigo.wasm',
          dest: '',
        },
        {
          src: 'node_modules/ketcher-react/dist/standalone/**',
          dest: 'standalone',
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['ketcher-standalone'],  // Prevent esbuild pre-bundle of WASM package
  },
  server: {
    headers: {
      // Only needed if indigo-ketcher turns out to require SharedArrayBuffer.
      // Include now; harmless if not needed; required if WASM uses threads.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

**Important:** The exact paths inside `ketcher-standalone/dist` must be verified against the installed package on first integration. The WASM file names (e.g., `indigo.wasm`, `indigo_ketcher.js`) are set by the Indigo build and may differ across minor versions. Inspect `node_modules/ketcher-standalone/dist/` after install.

**`optimizeDeps.exclude`:** Ketcher standalone contains WASM and possibly top-level-await, which esbuild's pre-bundler cannot handle. Excluding it forces Vite to treat it as a direct ESM dependency and skip the bundle step.

### WASM + SharedArrayBuffer: what we actually know

Evidence is mixed. The Indigo CMake build uses `--experimental-wasm-threads`, suggesting threading support is compiled in. However, the `indigo-ketcher` npm package ships a pre-built WASM binary and the project documents claim it works in a standard browser without server requirements — implying single-threaded fallback or no threading at all in the distributed build. **Validate at integration time** by checking whether `crossOriginIsolated` is required by the running app. If SharedArrayBuffer errors appear, add the COOP/COEP headers (they are already in the dev server config above).

### GitHub Pages deployment

GitHub Pages does not support custom HTTP headers. If COOP/COEP are required:
- Include `coi-serviceworker.js` as a standalone file in `public/` (must not be bundled)
- Add `<script src="/coi-serviceworker.js"></script>` as the first script in `index.html`
- The service worker intercepts all requests and injects the missing headers, causing a single page reload on first visit

**Recommended primary target: Netlify.** Netlify supports custom headers via `_headers` or `netlify.toml`:

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

This avoids the service worker hack entirely and is zero-maintenance. GitHub Pages remains a valid fallback with `coi-serviceworker`.

### TypeScript tsconfig notes

The `create vite --template react-ts` scaffold generates `tsconfig.app.json` with `"moduleResolution": "bundler"` and `"target": "ES2020"` — both correct for a Vite + WASM project. No special changes needed beyond adding `"types": ["vite/client"]`. The `ketcher-core` package ships its own type declarations.

---

## What NOT to Use

| Rejected Choice | Why |
|----------------|-----|
| `@vitejs/plugin-react-swc` | Confirmed SWC panic crash when processing ketcher packages (issue #5565). Use standard `@vitejs/plugin-react` (esbuild) |
| React 19 | ketcher-react peerDeps are `^18.2.0`; React 19 upgrade PR (#6657) not merged in 3.12.0 stable |
| Tailwind CSS | Would require duplicating all oklch token definitions from the canonical `styles.css`; CSS Modules work with CSS variables natively without duplication |
| Redux Toolkit | Massive overkill for a store with 6-7 fields; no async side effects requiring middleware |
| Styled-components / Emotion | Runtime CSS-in-JS is unnecessary here; the token system is CSS variables which CSS Modules handle natively |
| `indigo-ketcher` direct import | This is a transitive dependency of `ketcher-standalone`; do not import it directly — only the ketcher packages' public API (`StandaloneStructServiceProvider`) should be used |
| Server-side rendering (Next.js) | The project constraint is a static build; Next.js adds SSR complexity and breaks Ketcher's browser-only WASM initialization |
| RC releases of ketcher (3.15.x, 3.16.x) | Not stable releases; changelog shows they target macromolecule/polymer features irrelevant to this tool |

---

## Open Questions

1. **COOP/COEP actually required?** — Only answerable after first `npm install && npm run dev` with a real structure change. If `crossOriginIsolated` is `false` and InChI generation still works, COOP/COEP headers are not needed and the deployment story simplifies.

2. **Exact WASM asset paths in ketcher-standalone 3.12.0** — The `viteStaticCopy` targets in the config skeleton are placeholders. Must inspect `node_modules/ketcher-standalone/dist/` after install to get exact file names.

3. **`ketcher.editor.subscribe('change', handler)` latency** — The change event fires on every keystroke/click. Decide whether `getInchi(true)` is called on every change event (acceptable for small molecules) or debounced (300–500ms). This is an implementation decision, not a dependency choice.

4. **`staticResourcesUrl` exact value in Vite** — The demo uses `process.env.PUBLIC_URL` (a Create React App convention). In Vite the equivalent is `import.meta.env.BASE_URL` or a literal `''`/`'/'`. Verify at integration time which value correctly resolves WASM asset requests.

5. **Zustand middleware needs** — The state is simple enough that no `immer` or `persist` middleware is needed. Confirm during planning that `auxMap` parsing (canonical→atom index map) lives in the store's action rather than a separate derived selector.

---

## Sources

- ketcher-react npm (version data): https://security.snyk.io/package/npm/ketcher-react/versions
- Ketcher GitHub releases: https://github.com/epam/ketcher/releases
- ketcher-react React 19 bump issue: https://github.com/epam/ketcher/issues/6657
- ketcher Vite SWC build error: https://github.com/epam/ketcher/issues/5565
- Ketcher example App.tsx: https://github.com/epam/ketcher/blob/master/demo/src/App.tsx
- ketcher-standalone README: https://github.com/epam/ketcher/tree/master/packages/ketcher-standalone
- Ketcher JS API (getInchi): https://github.com/epam/ketcher/blob/master/README.md
- COOP/COEP on GitHub Pages: https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/
- coi-serviceworker: https://github.com/gzuidhof/coi-serviceworker
- Netlify custom headers: https://docs.netlify.com/manage/routing/headers/
- Vite Getting Started (v8): https://vite.dev/guide/
- vite-plugin-wasm: https://github.com/Menci/vite-plugin-wasm
- Zustand v5 announcement: https://pmnd.rs/blog/announcing-zustand-v5/
- Zustand npm: https://www.npmjs.com/package/zustand
- CSS Modules vs Tailwind 2025: https://dev.to/_d7eb1c1703182e3ce1782/css-in-js-vs-tailwind-css-vs-css-modules-which-to-choose-in-2025-cbi
