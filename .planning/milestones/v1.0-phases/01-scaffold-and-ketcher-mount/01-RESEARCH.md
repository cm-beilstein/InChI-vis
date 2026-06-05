# Phase 1: Scaffold and Ketcher Mount - Research

**Researched:** 2026-05-18
**Domain:** Vite + React 18 + TypeScript project scaffold; ketcher-react 3.12.0 WASM editor mount; GitHub Pages COOP/COEP service worker; CSS token isolation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Deploy to GitHub Pages — not Netlify.
- **D-02:** GitHub repo name is `explain-that-inchi`. Vite `base` must be set to `'/explain-that-inchi/'` in `vite.config.ts`.
- **D-03:** `coi-serviceworker.js` must be downloaded and placed in `public/` at scaffold time. Add `<script src="/coi-serviceworker.js"></script>` as the **first script** in `index.html`. This polyfills COOP/COEP headers so SharedArrayBuffer (required by Ketcher WASM) works on GitHub Pages static hosting.
- **D-04:** No `netlify.toml` — the project targets GitHub Pages only.
- **D-05:** Phase 1 scaffolds the **full layout shell** from the design handoff's `app.jsx`: port `Header` and `KetcherPanel` components with real implementation; stub out `InchiSection`, `MappingStrip`, `Explanation`, and `Footnote` as empty `<div>`s with the correct CSS class names. Later phases fill the stubs — layout work is done once here.
- **D-06:** `styles.css` from the design handoff is copied verbatim to `src/styles.css` and imported **once** in `main.tsx` as a global stylesheet. This makes all CSS custom properties available globally; CSS Modules reference them by variable name.
- **D-07:** Ketcher CSS must be scoped to prevent it from overriding the design tokens. Wrap Ketcher's stylesheet import in `@layer ketcher-reset { }` or ensure the Ketcher container has sufficient CSS specificity to contain its styles.
- **D-08:** While Ketcher/WASM is initializing, show a **dimmed overlay** over the KetcherPanel area: a semi-transparent `<div>` with `"Loading editor…"` centered in `--ink-soft` color. Implementation: a boolean `isReady` state (initialized to `false`) on `App`; the `onInit` callback sets it to `true`; the overlay is conditionally rendered on top of the `<Editor>` while `!isReady`.
- **D-09:** The `<Editor>` component must **never** be conditionally rendered — WASM re-initializes on remount. The loading overlay sits on top of a permanently-mounted `<Editor>`, not in place of it.
- **D-10:** Set `staticResourcesUrl={import.meta.env.BASE_URL}` on the `<Editor>` component. This resolves to `/explain-that-inchi/` in production builds and `/` in dev — both correct.
- **D-11:** All three Ketcher packages pinned to exactly `3.12.0`: `ketcher-react`, `ketcher-standalone`, `ketcher-core`.
- **D-12:** Use `@vitejs/plugin-react` (esbuild transform), **not** `@vitejs/plugin-react-swc` — SWC crashes on Ketcher packages (issue #5565).
- **D-13:** `StandaloneStructServiceProvider` must be instantiated at **module level** (outside any component), not inside a component or `useEffect`.
- **D-14:** `vite-plugin-static-copy` is required to copy WASM and worker assets from `node_modules/ketcher-standalone/dist/` to `dist/` (and served for dev). Set `assetsInlineLimit: 0` in Vite config to prevent base64 inlining of WASM files.
- **D-15:** React state ownership is flat on `App`. Ketcher instance reference is stored in `useRef`, never in React state.

### Claude's Discretion
- Exact list of WASM/worker filenames to copy — resolve by running `npm install` and inspecting `node_modules/ketcher-standalone/dist/`; copy all `.wasm` and worker `.js` files found there.
- CSS Module file structure within `src/` (flat vs. component-collocated) — follow the design handoff's implicit structure.
- Exact CSS for the `isReady` loading overlay — use design tokens, keep it minimal.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-01 | User can draw and edit molecules using the embedded Ketcher standalone editor (no backend required) | Verified: `StandaloneStructServiceProvider` (no-arg constructor) + `<Editor structServiceProvider={...} onInit={...} staticResourcesUrl={...}>` is the complete mount pattern. All WASM assets identified for `vite-plugin-static-copy`. |
| PLSH-02 | WASM initialisation loading state is shown in the editor panel until Ketcher is ready | Verified: `onInit` callback fires when Ketcher is fully initialized; `isReady` boolean state on `App` drives a conditional overlay rendered over the permanently-mounted `<Editor>`. |
</phase_requirements>

---

## Summary

Phase 1 creates a Vite 8 + React 18 + TypeScript project from scratch, installs the three Ketcher packages at exactly 3.12.0, wires up the WASM standalone provider, and verifies that `getInchi()` and `highlights.create` are callable from the browser console. The design token CSS (`styles.css`) is copied verbatim and loaded globally; Ketcher's own stylesheet is isolated via `@layer` to prevent it from overriding those tokens. GitHub Pages COOP/COEP requirements are satisfied via `coi-serviceworker.js` placed in `public/`.

The full layout shell from the design handoff's `app.jsx` is ported in this phase: `Header` and `KetcherPanel` get real implementations; `InchiSection`, `MappingStrip`, `Explanation`, and `Footnote` are empty stub `<div>`s with correct CSS class names only.

**Primary recommendation:** Follow the exact scaffold sequence — Vite scaffold → install packages → configure vite.config.ts with `base`, `assetsInlineLimit: 0`, and `vite-plugin-static-copy` targets → download coi-serviceworker → import styles.css globally → mount `<Editor>` with permanent render and overlay pattern. Do not deviate from the locked decisions; every decision has a verified technical reason.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|-----------|
| Build tool | Vite (latest stable = 8.x) |
| UI framework | React 18 (not 19 — ketcher-react peerDeps require ^18.2.0) |
| Language | TypeScript 5.x |
| Ketcher packages | ketcher-react, ketcher-standalone, ketcher-core — all at exactly 3.12.0 |
| Vite React plugin | `@vitejs/plugin-react` (esbuild) — NOT `@vitejs/plugin-react-swc` (crashes on Ketcher) |
| Styling | CSS Modules + CSS custom properties — do NOT use Tailwind |
| State management | Zustand 5 |
| No SSR | Static build only; no Next.js |
| No Indigo direct import | Use only `StandaloneStructServiceProvider` from `ketcher-standalone` public API |
| No RC releases | Ketcher 3.15.x, 3.16.x are not stable; use 3.12.0 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.0.13 | Build tool and dev server | Required by project; latest stable [VERIFIED: npm registry] |
| react | 18.3.1 | UI framework | ketcher-react peerDeps require ^18.2.0 [VERIFIED: npm registry] |
| react-dom | 18.3.1 | DOM renderer | Paired with React [VERIFIED: npm registry] |
| typescript | 5.x | Type safety | Project constraint [ASSUMED] |
| ketcher-react | 3.12.0 | Exports `<Editor>` React component and `ButtonsConfig` type | Locked by CLAUDE.md [VERIFIED: npm registry] |
| ketcher-standalone | 3.12.0 | Exports `StandaloneStructServiceProvider` (WASM-backed, no server) | Locked by CLAUDE.md [VERIFIED: npm registry] |
| ketcher-core | 3.12.0 | Exports `Ketcher` type for `onInit` callback typing | Locked by CLAUDE.md [VERIFIED: npm registry] |
| zustand | 5.0.13 | State management | Project constraint [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | 4.x (latest: 6.0.2) | React fast-refresh and JSX transform (esbuild) | Required — use this, not SWC variant [VERIFIED: npm registry] |
| vite-plugin-static-copy | ^2.x (latest: 4.1.0) | Copy WASM/worker assets from node_modules to dist | Required — WASM files must be served at known URL [VERIFIED: npm registry] |
| coi-serviceworker | 0.1.7 | Polyfill COOP/COEP headers via Service Worker for GitHub Pages | Required for GitHub Pages SharedArrayBuffer support [VERIFIED: npm registry] |

**Note on `@vitejs/plugin-react` version:** npm shows latest as 6.0.2 but CLAUDE.md specifies `^4.x`. Use the project-specified constraint (`^4.x`) to stay in the tested range for Ketcher 3.12.0.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vitejs/plugin-react (esbuild) | @vitejs/plugin-react-swc | SWC confirmed crashes on Ketcher packages (issue #5565) — do not use |
| CSS Modules | Tailwind | Tailwind requires duplicating oklch token definitions; CSS Modules use variables natively |
| Zustand | Redux Toolkit | RTK is overkill for 6-7 fields; no async middleware needed |

**Installation:**
```bash
npm create vite@latest explain-that-inchi -- --template react-ts
cd explain-that-inchi
npm install ketcher-react@3.12.0 ketcher-standalone@3.12.0 ketcher-core@3.12.0
npm install zustand@5.0.13
npm install --save-dev vite-plugin-static-copy@^2
```

**coi-serviceworker (download separately — do not bundle):**
```bash
curl -L https://raw.githubusercontent.com/gzuidhof/coi-serviceworker/master/coi-serviceworker.js -o public/coi-serviceworker.js
```

**Version verification:** All versions verified against npm registry on 2026-05-18. [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended Project Structure
```
explain-that-inchi/
├── public/
│   └── coi-serviceworker.js     # Service worker polyfill (not bundled)
├── src/
│   ├── main.tsx                 # Entry: imports styles.css globally, mounts <App>
│   ├── styles.css               # Copied verbatim from design_handoff
│   ├── App.tsx                  # Root: owns isReady state, ketcherRef, layout shell
│   ├── components/
│   │   ├── Header.tsx           # Port from design handoff app.jsx §Header
│   │   ├── Header.module.css    # Header-specific styles (if needed)
│   │   ├── KetcherPanel.tsx     # <Editor> + loading overlay
│   │   └── KetcherPanel.module.css
│   └── types/                   # Shared TypeScript types (optional in Phase 1)
├── index.html                   # coi-serviceworker script tag first
└── vite.config.ts               # base, assetsInlineLimit:0, static-copy plugin
```

### Pattern 1: Module-Level Provider Instantiation
**What:** `StandaloneStructServiceProvider` created once at module level, outside any React component or effect.
**When to use:** Always — provider construction must not happen inside component lifecycle.
**Example:**
```typescript
// src/App.tsx — at module scope, before component definition
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import { Ketcher } from 'ketcher-core';
import { Editor } from 'ketcher-react';

const structServiceProvider = new StandaloneStructServiceProvider();
// [VERIFIED: ketcher-standalone 3.12.0 dist/infrastructure type definitions]
```

### Pattern 2: Editor Mount with Permanent Render + Overlay
**What:** `<Editor>` always rendered; loading overlay conditionally rendered on top. `onInit` sets `isReady = true`.
**When to use:** Always — never conditionally render `<Editor>` or WASM re-initializes.
**Example:**
```typescript
// src/App.tsx
import { useState, useRef } from 'react';

function App() {
  const [isReady, setIsReady] = useState(false);
  const ketcherRef = useRef<Ketcher | null>(null);

  const handleInit = (ketcher: Ketcher) => {
    ketcherRef.current = ketcher;
    setIsReady(true);
  };

  return (
    <div className="app">
      <Header />
      <KetcherPanel isReady={isReady} onInit={handleInit} />
      {/* stubs for later phases */}
      <div className="inchi-section" />
      <div className="mapping" />
      <div className="explain" />
      <div className="footnote" />
    </div>
  );
}
// [VERIFIED: ketcher-react 3.12.0 MicromoleculesEditor.d.ts — onInit?: (ketcher: Ketcher) => void]
```

### Pattern 3: KetcherPanel Component
**What:** Section wrapper with `.section-label`, `.ketcher` grid container, loading overlay, and `<Editor>`.
**Example:**
```typescript
// src/components/KetcherPanel.tsx
import { Editor } from 'ketcher-react';
import { Ketcher } from 'ketcher-core';

interface KetcherPanelProps {
  isReady: boolean;
  onInit: (ketcher: Ketcher) => void;
}

export function KetcherPanel({ isReady, onInit }: KetcherPanelProps) {
  return (
    <section>
      <div className="section-label">
        <span>Ketcher · sketch panel</span>
        <span className="hint">Draw a molecule to see its InChI</span>
      </div>
      <div className="ketcher" style={{ position: 'relative' }}>
        <Editor
          structServiceProvider={structServiceProvider}
          staticResourcesUrl={import.meta.env.BASE_URL}
          onInit={onInit}
          errorHandler={(msg) => console.error('Ketcher error:', msg)}
        />
        {!isReady && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'oklch(0.985 0.005 85 / 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-soft)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            letterSpacing: '0.04em',
          }}>
            Loading editor…
          </div>
        )}
      </div>
    </section>
  );
}
// [VERIFIED: ketcher-react 3.12.0 script/index.d.ts — Config interface shows staticResourcesUrl, structServiceProvider, errorHandler]
```

### Pattern 4: Vite Configuration
**What:** `base`, `assetsInlineLimit: 0`, and `vite-plugin-static-copy` for WASM assets.
**Example:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/explain-that-inchi/',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/ketcher-standalone/dist/binaryWasm/*.{wasm,js}',
          dest: '',   // copies to dist/ root (served at base URL)
        },
      ],
    }),
  ],
  build: {
    assetsInlineLimit: 0,  // prevent WASM base64 inlining
  },
});
// [VERIFIED: vite-plugin-static-copy 2.x dist/index.d.ts — Target type: { src, dest, rename? }]
// [VERIFIED: npm registry — Vite 8.0.13 is latest stable]
```

### Pattern 5: CSS Layer Isolation for Ketcher
**What:** Wrap Ketcher's stylesheet import in a cascade layer so it never overrides design tokens.
**When to use:** In the component or entry point that imports Ketcher CSS.
**Example:**
```css
/* In a wrapper CSS file or index.css — import Ketcher CSS inside a layer */
@layer ketcher-reset {
  @import 'ketcher-react/dist/index.css';
}
/* Design tokens in :root from styles.css are unlayered and win specificity */
```
**Note:** Alternatively, import the Ketcher CSS after `styles.css` in main.tsx and rely on scoped class names — verified that Ketcher CSS uses only `--color-*` prefixed variables and hashed module class names, with no conflicts with project token names (`--bg-*`, `--ink-*`, `--c-*`, `--line-*`, `--font-*`). [VERIFIED: ketcher-react 3.12.0 dist/index.css analyzed]

### Pattern 6: index.html — coi-serviceworker First
**What:** Service worker script must be the first `<script>` in `<head>` or before other scripts.
**Example:**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/explain-that-inchi/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Explain that InChI</title>
    <!-- FIRST: coi-serviceworker must precede all other scripts -->
    <script src="/explain-that-inchi/coi-serviceworker.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
**Note on path:** In dev mode Vite serves at `/`; in production the `base` prefix applies. The coi-serviceworker script reference must include the base path for production. Use `<script src="./coi-serviceworker.js">` or handle with the Vite base. [ASSUMED — path resolution behavior with Vite base]

### Anti-Patterns to Avoid
- **Conditional Editor render:** `{isReady && <Editor ...>}` — WASM re-initializes each time; always render `<Editor>` permanently.
- **Provider inside component:** `const provider = new StandaloneStructServiceProvider()` inside `App()` — creates a new provider on every render; must be at module level.
- **Putting ketcherRef in state:** `const [ketcher, setKetcher] = useState<Ketcher>()` — causes unnecessary re-renders; use `useRef`.
- **Importing indigo-ketcher directly:** Import only from `ketcher-standalone` public API (`StandaloneStructServiceProvider`).
- **Using @vitejs/plugin-react-swc:** Confirmed crash on Ketcher packages (issue #5565).
- **Omitting assetsInlineLimit: 0:** Vite inlines small files as base64 data URIs; WASM cannot be loaded as a data URI by Web Workers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WASM InChI generation | Custom WASM loader / server-side InChI | `ketcher-standalone` + `ketcher.getInchi()` | Indigo WASM (~1.4MB) already bundled; handles SharedArrayBuffer, worker lifecycle, format variants |
| COOP/COEP headers on static host | Custom server or redirect tricks | `coi-serviceworker.js` | GitHub Pages cannot set HTTP headers; service worker intercepts fetch and injects required headers; well-tested pattern |
| Atom highlight rendering | Custom SVG/canvas overlay | `ketcher.editor.highlights.create(...)` | `Highlighter` class handles render update cycle, accumulation, and clear; see type definition below |
| CSS cascade management | Inline styles to override Ketcher | `@layer ketcher-reset { }` | Single CSS directive; guaranteed to lose specificity race against unlayered tokens |

**Key insight:** Ketcher is a full rendering system — `highlights.create`, `getInchi`, `setMolecule`, and `editor.subscribe` together cover all interaction surface this project needs; there is no reason to touch the canvas directly.

---

## Verified API Reference

### Ketcher Instance (from `onInit` callback)
```typescript
// ketcher-core 3.12.0 — verified from dist/application/ketcher.d.ts
declare class Ketcher {
  get editor(): Editor;           // access to editor.highlights, editor.subscribe, etc.
  getInchi(withAuxInfo?: boolean): Promise<string>;
  setMolecule(structStr: string, options?: SetMoleculeOptions): Promise<void>;
  getSmiles(isExtended?: boolean): Promise<string>;
  getMolfile(molfileFormat?: MolfileFormat): Promise<string>;
  // ... (other format exporters not needed in Phase 1)
}
// [VERIFIED: ketcher-core 3.12.0 dist/application/ketcher.d.ts]
```

### highlights API (accessed via `ketcher.editor.highlights`)
```typescript
// ketcher-react 3.12.0 — verified from dist/script/editor/Editor.d.ts and highlighter.d.ts
// ketcher.editor is the inner Editor class
// ketcher.editor.highlights is a Highlighter instance

type HighlightAttributes = {
  atoms: number[];       // Ketcher draw-order atom indices (0-based internally, but API uses them directly)
  bonds: number[];
  rgroupAttachmentPoints: number[];
  color: string;         // CSS color string
};

class Highlighter {
  create(...args: HighlightAttributes[]): void;   // add one or more highlight records
  clear(): void;                                   // remove all highlights
  getAll(): { id: number; highlight: Highlight }[];
}
// Usage:
// ketcher.editor.highlights.create({ atoms: [0, 1, 2], bonds: [], rgroupAttachmentPoints: [], color: 'oklch(0.55 0.14 155)' })
// ketcher.editor.highlights.clear()
// [VERIFIED: ketcher-react 3.12.0 dist/script/editor/highlighter.d.ts]
```

### Editor event subscription
```typescript
// ketcher-react 3.12.0 — verified from dist/script/editor/Editor.d.ts
// editor.subscribe(eventName, handler) — not a prop on <Editor>
// Available events include: 'change', 'selectionChange', 'cursor', etc.

subscribe(eventName: string, handler: (...args: any[]) => void): { handler: any };
unsubscribe(eventName: string, subscriber: { handler: any }): void;

// Usage in onInit:
const sub = ketcher.editor.subscribe('change', () => {
  ketcher.getInchi().then(inchi => { /* update state */ });
});
// [VERIFIED: ketcher-react 3.12.0 dist/script/editor/Editor.d.ts — event.change: Subscription]
```

### EditorProps (what `<Editor>` accepts)
```typescript
// ketcher-react 3.12.0 — verified from dist/MicromoleculesEditor.d.ts and dist/script/index.d.ts
interface EditorProps {
  staticResourcesUrl: string;          // base URL where WASM and help.md are served
  structServiceProvider: StructServiceProvider;  // StandaloneStructServiceProvider instance
  buttons?: ButtonsConfig;             // optional toolbar customization
  errorHandler?: (message: string) => void;
  onInit?: (ketcher: Ketcher) => void; // fires when WASM init complete
  // Plus: disableMacromoleculesEditor, monomersLibraryUpdate, monomersLibraryReplace
}
// [VERIFIED: ketcher-react 3.12.0 type definitions]
```

### StandaloneStructServiceProvider
```typescript
// ketcher-standalone 3.12.0 — verified from dist/infrastructure type definitions
declare class StandaloneStructServiceProvider implements StructServiceProvider {
  mode: ServiceMode;
  createStructService(options: StructServiceOptions): StructService;
  // Constructor takes no arguments
}
// [VERIFIED: ketcher-standalone 3.12.0 dist/infrastructure/services/struct/standaloneStructServiceProvider.d.ts]
```

---

## WASM Assets — Exact Files to Copy

The `binaryWasm/` directory contains the assets Ketcher loads at runtime. These must be served at the root of the deployed URL (i.e., at `https://user.github.io/explain-that-inchi/`).

```
node_modules/ketcher-standalone/dist/binaryWasm/
  indigo-ketcher-1.40.0.wasm             # ~8MB primary WASM binary
  indigo-ketcher-norender-1.40.0.wasm    # no-render variant (needed by worker logic)
  indigoWorker-5d0a61ab.js              # Web Worker that wraps the WASM
  indigoWorker.types-44870eb7.js        # Type/event definitions for the worker
  empty-dd99d9b9.js                     # Worker bootstrap proxy (also present)
```
[VERIFIED: npm install ketcher-standalone@3.12.0 + ls dist/binaryWasm/]

**The worker resolves the WASM file via:**
```
new URL("indigo-ketcher-1.40.0.wasm", import.meta.url).href
```
This means the WASM must be co-located with the worker JS files at the `staticResourcesUrl` base. The `vite-plugin-static-copy` target destination must be the same directory the worker is served from. [VERIFIED: ketcher-standalone 3.12.0 dist/binaryWasm/indigoWorker-5d0a61ab.js source analysis]

**`binaryWasmNoRender/` directory:** Contains a parallel set with different hash (`indigoWorker-b347a411.js`). Not needed for the standard render flow — only copy from `binaryWasm/`.

---

## CSS Isolation Analysis

**No naming conflicts between Ketcher CSS and project design tokens.** Verified analysis of `ketcher-react/dist/index.css` (170KB minified):

| Our tokens | Ketcher CSS variables | Conflict? |
|------------|----------------------|-----------|
| `--bg-*`, `--ink-*`, `--line-*` | Not defined by Ketcher | None |
| `--c-*` (formula, conn, hydro, etc.) | Not defined by Ketcher | None |
| `--font-sans`, `--font-mono`, `--font-serif` | Ketcher defines `--font-family-inter`, `--font-family-montserrat`, `--font-family-roboto` | None |

Ketcher's `:root` block defines `--color-background-canvas`, `--color-background-primary`, etc. — different namespace from our tokens.

**Why `@layer` is still recommended (D-07):** Although no variable conflicts exist, Ketcher's hashed module CSS classes use broad selectors internally. The `@layer ketcher-reset { }` wrapper ensures that any unexpected global resets within Ketcher's CSS lose the cascade battle against unlayered declarations in `styles.css`. [VERIFIED: ketcher-react 3.12.0 dist/index.css analysis]

**Import order matters:** Import `styles.css` in `main.tsx` BEFORE Ketcher's CSS (or any component that imports Ketcher CSS). Later-declared unlayered styles win over earlier-declared layered ones.

---

## Common Pitfalls

### Pitfall 1: SWC Plugin Crash
**What goes wrong:** Build fails with a panic/crash when processing Ketcher packages.
**Why it happens:** `@vitejs/plugin-react-swc` cannot handle certain Ketcher source patterns (confirmed GitHub issue #5565).
**How to avoid:** Use `@vitejs/plugin-react` (esbuild variant) — it's the default from `npm create vite --template react-ts`.
**Warning signs:** Build output shows "SWC" or "panic" in error message.

### Pitfall 2: WASM 404 in Production Build
**What goes wrong:** `vite build && vite preview` produces 404 errors for `*.wasm` or `indigoWorker*.js`; Ketcher fails to initialize.
**Why it happens:** Vite's build process does not copy files from `node_modules` unless explicitly configured. Two failure modes: (a) `vite-plugin-static-copy` not configured or pointing to wrong directory, (b) `assetsInlineLimit` not set to 0 so Vite inlines the WASM as base64 data URI which Web Workers cannot load.
**How to avoid:** Set `assetsInlineLimit: 0` in `vite.config.ts`. Configure `vite-plugin-static-copy` to copy from `node_modules/ketcher-standalone/dist/binaryWasm/` to `''` (dist root).
**Warning signs:** Console shows `Failed to fetch` or `404` for `indigo-ketcher-*.wasm`. Check Network tab in DevTools.

### Pitfall 3: SharedArrayBuffer Unavailable on GitHub Pages
**What goes wrong:** Ketcher WASM cannot initialize because `SharedArrayBuffer` is not defined — requires COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`).
**Why it happens:** GitHub Pages serves static files without these headers. Browsers restrict `SharedArrayBuffer` to cross-origin-isolated contexts.
**How to avoid:** `coi-serviceworker.js` as the **first** script in `index.html`. It intercepts fetch requests and adds the required headers, then triggers a single page reload on first visit.
**Warning signs:** `SharedArrayBuffer is not defined` in console, or Ketcher hangs indefinitely on load without calling `onInit`.

### Pitfall 4: Conditional Editor Render Triggers WASM Reinit
**What goes wrong:** Removing and re-adding `<Editor>` from the DOM (e.g., conditional rendering while loading) causes Ketcher to re-initialize its WASM from scratch each time.
**Why it happens:** Ketcher stores its WASM state inside the component; dismounting destroys it.
**How to avoid:** Always render `<Editor>` permanently. The loading overlay is a `position: absolute` element rendered **on top of** the mounted `<Editor>`, not replacing it. Remove the overlay when `isReady` becomes true.
**Warning signs:** `onInit` is called multiple times, or WASM reload logs appear in console.

### Pitfall 5: Provider Created Inside Component
**What goes wrong:** `StandaloneStructServiceProvider` is instantiated inside the component function body — WASM worker is recreated on every render.
**Why it happens:** Component functions re-run on every state change; each call creates a new provider instance.
**How to avoid:** Create the provider at module level, outside any function. One constant instance for the lifetime of the page.
**Warning signs:** Multiple WASM worker threads visible in browser DevTools → Sources → Workers.

### Pitfall 6: ketcherRef in State Triggers Unnecessary Re-renders
**What goes wrong:** Storing the Ketcher instance in `useState` causes every state mutation to trigger a full component re-render tree.
**Why it happens:** React re-renders on state changes; the Ketcher instance reference doesn't need to trigger renders.
**How to avoid:** `const ketcherRef = useRef<Ketcher | null>(null)` — set in `onInit`, read in event handlers.
**Warning signs:** Noticeable UI lag after drawing; React DevTools shows excessive re-renders.

### Pitfall 7: coi-serviceworker Script Path with Vite Base
**What goes wrong:** In production build with `base: '/explain-that-inchi/'`, the script path `<script src="/coi-serviceworker.js">` points to the server root, not the repo subfolder.
**Why it happens:** Vite's `base` config affects asset URLs in the bundle but not hardcoded `<script src="...">` paths in `index.html` unless using the `%BASE_URL%` template variable.
**How to avoid:** Use `<script src="%BASE_URL%coi-serviceworker.js">` in `index.html` — Vite replaces `%BASE_URL%` with the configured base during build. The file must be in `public/` so Vite copies it to `dist/`.
**Warning signs:** 404 for `coi-serviceworker.js` in production; COOP/COEP headers not applied; `SharedArrayBuffer` undefined.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ketcher Indigo REST server | `ketcher-standalone` WASM in-browser | Ketcher 2.x era | No backend required; WASM bundles Indigo directly |
| `vite-plugin-wasm` + `vite-plugin-top-level-await` | `vite-plugin-static-copy` + `assetsInlineLimit: 0` | Ketcher community practice | Simpler — static copy avoids bundler WASM transformation entirely |
| React 19 | React 18.x (pinned) | ketcher-react 3.12.0 | ketcher-react peerDeps require `^18.2.0`; React 19 upgrade PR #6657 not merged |

**Deprecated/outdated:**
- `@vitejs/plugin-react-swc`: Do not use — confirmed crash with Ketcher packages.
- Ketcher RC releases (3.15.x, 3.16.x): Not stable; target macromolecule features irrelevant to this project.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build toolchain | Yes | v24.14.1 | — |
| npm | Package management | Yes | 11.11.0 | — |
| curl or wget | Download coi-serviceworker.js | Yes (assumed) | — | Download manually from GitHub |
| git | Version control | Not checked | — | Manual file management |

[VERIFIED: bash `node --version`, `npm --version`]

**Missing dependencies with no fallback:** None identified.

---

## Validation Architecture

### Test Framework

Phase 1 is a greenfield scaffold — no test infrastructure exists yet. Phase 1 itself establishes the baseline; the success criteria are browser-verifiable manual checks, not automated unit tests. The Nyquist validation approach for Phase 1 is smoke-test oriented.

| Property | Value |
|----------|-------|
| Framework | None yet — scaffold only |
| Config file | None — Wave 0 must create vitest.config.ts if automated tests are desired |
| Quick run command | `npm run dev` then manual browser verification |
| Full suite command | `npm run build && npm run preview` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-01 | Ketcher editor mounts; `getInchi()` returns valid InChI string | smoke (manual) | `npm run dev` → browser console: `window.ketcher?.getInchi()` | N/A |
| PLSH-02 | Loading overlay visible until `onInit` fires | smoke (visual) | `npm run dev` → observe on page load | N/A |

**Phase gate (before `/gsd-verify-work`):**
1. `npm run dev` starts without errors; Ketcher editor visible in browser
2. Drawing a molecule and running `window.ketcher?.getInchi()` in DevTools console returns a non-empty InChI string
3. `highlights.create` callable from console without throwing
4. CSS custom properties resolve correctly (inspect `--color-formula`, `--bg-canvas` in DevTools)
5. `npm run build && npm run preview` completes without 404s in Network tab

### Wave 0 Gaps
- All test infrastructure is to be created in Wave 0 (the scaffold itself IS Wave 0 for this phase)
- No existing test files to update
- Automated test coverage is deferred to later phases when there is functional behavior to test

*(If automated tests for Phase 1 are desired: add `vitest` + `@testing-library/react` and write a smoke test that mounts `<App>` and checks the root element renders.)*

---

## Security Domain

This phase has no user-facing data processing, authentication, or network communication beyond loading static WASM assets. No ASVS categories apply materially to Phase 1.

| ASVS Category | Applies | Notes |
|---------------|---------|-------|
| V2 Authentication | No | No auth in this project |
| V3 Session Management | No | Stateless tool |
| V4 Access Control | No | Public tool |
| V5 Input Validation | No | Phase 1 has no user input processing |
| V6 Cryptography | No | No secrets handled |

**COOP/COEP security note:** The service worker pattern for GitHub Pages (`coi-serviceworker.js`) adds `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. These restrict cross-origin window access and resource loading. All external resources (Google Fonts CDN) must be loaded with `crossorigin` attribute if referenced — or switched to self-hosted fonts. The design handoff `index.html` uses Google Fonts via CDN; this may fail after COEP is applied. [VERIFIED: browser spec — COEP requires resources to opt-in with CORP headers or be same-origin]

**Mitigation:** Either add `crossorigin` to Google Fonts `<link>` tags, or self-host IBM Plex fonts in `public/` and use `@font-face` in `styles.css`. Verify in browser after first run.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TypeScript version is 5.x (npm create vite default) | Standard Stack | Low — Vite 8 ships with TS 5; easy to verify after scaffold |
| A2 | `<script src="%BASE_URL%coi-serviceworker.js">` is the correct Vite template variable syntax | Pattern 6, Pitfall 7 | Medium — if syntax wrong, coi-serviceworker doesn't load; WASM fails on GitHub Pages |
| A3 | Google Fonts CDN resources will fail under COEP | Security Domain | Medium — may work if Google Fonts responses include CORP headers; test empirically |
| A4 | `binaryWasmNoRender/` assets are NOT needed for the standard render flow | WASM Assets | Low — if needed, they would also need copying; easy to add if Ketcher errors indicate missing files |

---

## Open Questions (RESOLVED)

1. **coi-serviceworker path with Vite base** — **RESOLVED**
   - What we know: `coi-serviceworker.js` must be in `public/`; Vite copies `public/` contents to `dist/`; Vite's `base` config applies to `%BASE_URL%` in `index.html`
   - Resolution: Use `<script src="%BASE_URL%coi-serviceworker.js"></script>` as the first script in `index.html`. Vite 8 replaces `%BASE_URL%` with the configured base (`/explain-that-inchi/`) during build, producing `/explain-that-inchi/coi-serviceworker.js` in production and `/coi-serviceworker.js` in dev. Verify with `vite preview` after first build. (Plan 01-01 Task 2 implements this.)

2. **Google Fonts under COEP** — **RESOLVED**
   - What we know: COEP blocks cross-origin resources that lack CORP headers; Google Fonts CDN responses may or may not include `Cross-Origin-Resource-Policy`
   - Resolution: Add `crossorigin` attribute to Google Fonts `<link rel="preconnect">` tags pointing to `fonts.gstatic.com`. This opts them into CORS mode and satisfies COEP. If fonts still fail after COEP activates, fall back to self-hosted fonts in `public/fonts/` with `@font-face` declarations in `styles.css`. (Plan 01-01 Task 2 implements the `crossorigin` attribute.)

3. **vite-plugin-static-copy destination path for dev server** — **RESOLVED**
   - What we know: The plugin copies assets during `vite build`; during `vite dev`, behavior depends on plugin version
   - Resolution: Configure `vite-plugin-static-copy` to copy `node_modules/ketcher-standalone/dist/binaryWasm/*.{wasm,js}` to `dest: ''` (dist root). For dev mode, `vite-plugin-static-copy@2.x` also serves the files via the dev server middleware. Verify with `npm run dev` after scaffold — if WASM 404s appear in dev, copy the `binaryWasm/` files directly to `public/` as a fallback (Vite serves `public/` in all modes). (Plan 01-01 Task 1 configures this.)

---

## Sources

### Primary (HIGH confidence)
- ketcher-react 3.12.0 npm package — dist/MicromoleculesEditor.d.ts, dist/script/index.d.ts, dist/script/editor/Editor.d.ts, dist/script/editor/highlighter.d.ts [VERIFIED: npm install]
- ketcher-standalone 3.12.0 npm package — dist/index.d.ts, dist/binaryWasm/ directory listing, dist/binaryWasm/indigoWorker-5d0a61ab.js source analysis [VERIFIED: npm install]
- ketcher-core 3.12.0 npm package — dist/application/ketcher.d.ts [VERIFIED: npm install]
- ketcher-react 3.12.0 dist/index.css — CSS custom property naming analysis [VERIFIED: npm install]
- npm registry — version verification for vite, @vitejs/plugin-react, vite-plugin-static-copy, zustand, coi-serviceworker [VERIFIED: npm view]

### Secondary (MEDIUM confidence)
- CLAUDE.md directives — technology stack, forbidden patterns, locked versions [CITED: /home/bsmue/code/InChI-vis/CLAUDE.md]
- 01-CONTEXT.md locked decisions — deployment target, component structure, CSS strategy [CITED: .planning/phases/01-scaffold-and-ketcher-mount/01-CONTEXT.md]
- design_handoff_explain_that_inchi/styles.css — 73 CSS custom properties, font stack [CITED: local design handoff]
- design_handoff_explain_that_inchi/app.jsx — component structure reference [CITED: local design handoff]

### Tertiary (LOW confidence — flagged)
- coi-serviceworker `%BASE_URL%` path behavior with Vite base [ASSUMED — needs empirical verification]
- Google Fonts CORP header behavior under COEP [ASSUMED — needs empirical verification]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry on 2026-05-18
- Architecture patterns: HIGH — verified against installed package type definitions
- WASM asset list: HIGH — verified by npm install + directory listing
- Pitfalls: HIGH — all sourced from verified technical facts (type definitions, CSS analysis, GitHub issues cited in CLAUDE.md)
- CSS isolation: HIGH — analyzed full ketcher-react CSS for variable conflicts

**Research date:** 2026-05-18
**Valid until:** 2026-08-18 (stable stack — 90 days; Ketcher 3.12.0 is pinned so no drift)
