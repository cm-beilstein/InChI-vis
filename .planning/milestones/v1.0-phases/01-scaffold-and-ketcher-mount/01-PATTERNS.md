# Phase 1: Scaffold and Ketcher Mount - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 9 new files
**Analogs found:** 9 / 9 (all from design handoff — greenfield project, no existing source files)

> **Greenfield note:** No TypeScript/React source files exist in the repo yet.
> All analogs are drawn from `design_handoff_explain_that_inchi/` (the canonical
> design source of truth) and from verified API patterns in RESEARCH.md.
> "Analog" below means "the design handoff file that defines the pattern this
> file must implement."

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `index.html` | config | request-response | `design_handoff_explain_that_inchi/index.html` | exact (port + add coi-serviceworker, Vite module script) |
| `vite.config.ts` | config | — | RESEARCH.md Pattern 4 | research-derived (no analog in codebase) |
| `src/main.tsx` | config/entry | request-response | `design_handoff_explain_that_inchi/index.html` inline render script | exact intent, different mechanism |
| `src/styles.css` | config | — | `design_handoff_explain_that_inchi/styles.css` | exact copy |
| `src/App.tsx` | component | request-response | `design_handoff_explain_that_inchi/app.jsx` §App function | role-match (port to TSX, add Ketcher state) |
| `src/components/Header.tsx` | component | request-response | `design_handoff_explain_that_inchi/app.jsx` §Header | exact (static port) |
| `src/components/Header.module.css` | config | — | `design_handoff_explain_that_inchi/styles.css` `.header` block | exact (extract to module) |
| `src/components/KetcherPanel.tsx` | component | request-response | `design_handoff_explain_that_inchi/app.jsx` §KetcherPanel + RESEARCH.md Pattern 3 | role-match (replace mock with real Editor) |
| `src/components/KetcherPanel.module.css` | config | — | `design_handoff_explain_that_inchi/styles.css` `.ketcher` block | exact (extract to module) |

---

## Pattern Assignments

### `index.html` (config, request-response)

**Analog:** `design_handoff_explain_that_inchi/index.html`

**Port pattern** — keep the font link tags, replace CDN React scripts with Vite module entry, add coi-serviceworker as the first script.

**Font link block** (design handoff lines 8–10 — keep verbatim):
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
```

**coi-serviceworker first script + Vite entry** (replaces design handoff lines 18–29):
```html
<!-- FIRST script — must precede all others for COOP/COEP polyfill -->
<script src="%BASE_URL%coi-serviceworker.js"></script>
<!-- ...rest of <head>... -->
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Critical:** `%BASE_URL%` is the Vite template variable that resolves to `/explain-that-inchi/` in production and `/` in dev. Do NOT hardcode the path. Source: RESEARCH.md Pitfall 7.

---

### `vite.config.ts` (config)

**Analog:** RESEARCH.md Pattern 4 (no codebase analog — greenfield)

**Complete config pattern** (RESEARCH.md lines 246–267):
```typescript
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
```

**Critical rules:**
- Use `@vitejs/plugin-react` (esbuild), NOT `@vitejs/plugin-react-swc` — SWC crashes on Ketcher (issue #5565)
- `assetsInlineLimit: 0` is mandatory — WASM as base64 data URI cannot be loaded by Web Workers
- `base: '/explain-that-inchi/'` must match the GitHub Pages repo name exactly

---

### `src/main.tsx` (entry, request-response)

**Analog:** `design_handoff_explain_that_inchi/index.html` inline render script (lines 27–29)

**Design handoff pattern** (lines 27–29):
```javascript
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
```

**Port to main.tsx** — add global styles import before App mount:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';                    // global design tokens — imported ONCE here
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Critical:** `styles.css` is imported here and ONLY here. It must be the first import before any component that might pull in Ketcher CSS. This establishes the cascade order: design tokens (unlayered) beat Ketcher CSS (in `@layer ketcher-reset`). Source: CONTEXT.md D-06, RESEARCH.md Pattern 5.

---

### `src/styles.css` (config)

**Analog:** `design_handoff_explain_that_inchi/styles.css`

**Copy verbatim** — do not modify any values. The file defines 60+ CSS custom properties in oklch color space that all components reference. Key token namespaces:

- `--bg-*` — background surfaces (lines 2–4)
- `--ink-*` — text and foreground (lines 5–8)
- `--line-*` — border/divider colors (lines 8–9)
- `--c-*` — InChI layer accent colors and element colors (lines 12–68)
- `--font-sans`, `--font-mono`, `--font-serif` — IBM Plex font stacks (lines 70–72)

**Design token sample** (design handoff styles.css lines 1–9):
```css
:root {
  --bg: oklch(0.985 0.005 85);
  --bg-canvas: oklch(0.995 0.003 85);
  --bg-panel: oklch(0.97 0.006 85);
  --ink: oklch(0.20 0.015 255);
  --ink-soft: oklch(0.45 0.015 255);
  --ink-faint: oklch(0.65 0.012 255);
  --line: oklch(0.88 0.008 250);
  --line-soft: oklch(0.93 0.006 250);
}
```

Add this block at the END of the copied file to layer-isolate Ketcher's CSS:
```css
/* Ketcher CSS isolation — must appear after all token definitions */
@layer ketcher-reset {
  /* Ketcher's own stylesheet is imported inside this layer via a component CSS file */
}
```

---

### `src/App.tsx` (component, request-response)

**Analog:** `design_handoff_explain_that_inchi/app.jsx` §App function (lines 5–36) + RESEARCH.md Pattern 2

**Imports pattern** (from RESEARCH.md Pattern 1 + Pattern 2):
```typescript
import { useState, useRef } from 'react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { Ketcher } from 'ketcher-core';
import { Header } from './components/Header';
import { KetcherPanel } from './components/KetcherPanel';

// Module-level provider — NEVER inside a component or useEffect
const structServiceProvider = new StandaloneStructServiceProvider();
```

**Core component pattern** (design handoff app.jsx lines 5–36, ported to TSX with D-08, D-09, D-15):
```typescript
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const ketcherRef = useRef<Ketcher | null>(null);  // useRef, NOT useState (D-15)

  const handleInit = (ketcher: Ketcher) => {
    ketcherRef.current = ketcher;
    setIsReady(true);
  };

  return (
    <div className="app">
      <Header />
      <KetcherPanel isReady={isReady} onInit={handleInit} />
      {/* Phase 1 stubs — filled in later phases with correct CSS class names */}
      <div className="inchi-section" />
      <div className="mapping" />
      <div className="explain" />
      <div className="footnote" />
    </div>
  );
}
```

**Critical:** `structServiceProvider` is at module scope (D-13). `ketcherRef` uses `useRef` not `useState` (D-15). Stub `<div>`s use the exact class names from the design handoff so later phases only need to replace the div with the real component.

**Anti-pattern** (do NOT write):
```typescript
// WRONG — provider inside component re-creates WASM worker on every render
function App() {
  const provider = new StandaloneStructServiceProvider(); // BAD
  const [ketcher, setKetcher] = useState<Ketcher>(); // BAD — use useRef
}
```

---

### `src/components/Header.tsx` (component, request-response)

**Analog:** `design_handoff_explain_that_inchi/app.jsx` §Header (lines 38–50)

**Direct port — no logic, no props:**

Design handoff source (lines 38–50):
```jsx
function Header() {
  return (
    <header className="header">
      <h1>
        Explain that <em>InChI</em>
      </h1>
      <div className="meta">
        <div>InChI v<b>1.07.3</b> · standard</div>
        <div>Hover any coloured chunk · the structure responds</div>
      </div>
    </header>
  );
}
```

**Port to TypeScript:**
```typescript
export function Header() {
  return (
    <header className="header">
      <h1>
        Explain that <em>InChI</em>
      </h1>
      <div className="meta">
        <div>InChI v<b>1.07.3</b> · standard</div>
        <div>Hover any coloured chunk · the structure responds</div>
      </div>
    </header>
  );
}
```

Class names (`header`, `meta`) map to CSS rules in `styles.css` lines 93–127. No CSS Module needed unless project convention requires collocated modules — the classes are defined globally in `styles.css`.

---

### `src/components/Header.module.css` (config)

**Analog:** `design_handoff_explain_that_inchi/styles.css` `.header` block (lines 93–127)

If using a CSS Module (collocated pattern), extract the header block:

**CSS block to extract** (design handoff styles.css lines 93–127):
```css
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 28px;
}
.header h1 {
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 52px;
  line-height: 1.02;
  letter-spacing: -0.02em;
  margin: 0;
}
.header .meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  text-align: right;
  line-height: 1.7;
}
```

**Note:** Since `styles.css` is imported globally and these classes are not hashed, the Header component can simply use `className="header"` without a CSS Module. Only create `Header.module.css` if you want local scoping; if so, update the component to use `styles.header` from the imported module.

---

### `src/components/KetcherPanel.tsx` (component, request-response)

**Analog:** `design_handoff_explain_that_inchi/app.jsx` §KetcherPanel (lines 53–101) + RESEARCH.md Pattern 3

**Design handoff structure to match** (app.jsx lines 53–101):
- Outer `<section>` wrapper
- `.section-label` with two spans (label + hint text)
- `.ketcher` grid container (becomes the Editor host)

**Port to TSX with real Ketcher Editor** (RESEARCH.md Pattern 3, lines 196–238):
```typescript
import { Editor } from 'ketcher-react';
import type { Ketcher } from 'ketcher-core';
import { structServiceProvider } from '../App';  // or pass as prop

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
        {/* Editor ALWAYS rendered — never conditional (D-09) */}
        <Editor
          structServiceProvider={structServiceProvider}
          staticResourcesUrl={import.meta.env.BASE_URL}
          onInit={onInit}
          errorHandler={(msg) => console.error('Ketcher error:', msg)}
        />
        {/* Loading overlay sits ON TOP of Editor, not replacing it */}
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
```

**Critical:** `<Editor>` is ALWAYS rendered regardless of `isReady` (D-09). The overlay uses `position: absolute; inset: 0` to cover the Editor area without unmounting it. `staticResourcesUrl={import.meta.env.BASE_URL}` resolves to `/explain-that-inchi/` in production and `/` in dev (D-10).

**Anti-pattern** (do NOT write):
```typescript
// WRONG — conditional render reinitializes WASM
{isReady ? <Editor ... /> : <div>Loading…</div>}
```

---

### `src/components/KetcherPanel.module.css` (config)

**Analog:** `design_handoff_explain_that_inchi/styles.css` `.ketcher` block (lines 144–153)

**CSS block to reference** (design handoff styles.css lines 144–153):
```css
.ketcher {
  display: grid;
  grid-template-columns: 56px 1fr 240px;
  background: var(--bg-canvas);
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  min-height: 380px;
}
```

**Note:** Since the real Ketcher Editor fills the full `.ketcher` container (replacing the mock toolbar + canvas + mol-list grid), the `grid-template-columns` may need to be simplified to a single column. Adapt the layout but preserve `background`, `border`, `border-radius`, `min-height`, and `overflow: hidden` which contain the Ketcher UI.

Add Ketcher CSS import layered inside this module or in a companion file:
```css
@layer ketcher-reset {
  @import 'ketcher-react/dist/index.css';
}
```

---

## Shared Patterns

### Design Token Usage
**Source:** `design_handoff_explain_that_inchi/styles.css` lines 1–73 (`:root` block)
**Apply to:** All component CSS — reference variables by name, never hardcode colors or fonts

CSS Modules reference design tokens like:
```css
.someClass {
  color: var(--ink);
  background: var(--bg-canvas);
  font-family: var(--font-mono);
  border: 1px solid var(--line);
}
```

Loading overlay background color uses the `--bg` token value with opacity:
```css
background: oklch(0.985 0.005 85 / 0.85);  /* = var(--bg) at 85% opacity */
/* Note: CSS variables cannot be used directly inside oklch() alpha slot */
```

### CSS Class Naming Convention
**Source:** `design_handoff_explain_that_inchi/styles.css` throughout
**Apply to:** All components in Phase 1

The design handoff uses flat BEM-adjacent class names, not CSS Modules. Phase 1 can use these directly as global class names (since `styles.css` is imported globally) OR wrap them in CSS Modules. Decision (Claude's Discretion): use global class names for structural layout classes (`.app`, `.header`, `.ketcher`, `.section-label`) that are defined in `styles.css`, and add collocated CSS Module files only when a component needs new styles not in `styles.css`.

### Stub Component Pattern
**Apply to:** `InchiSection`, `MappingStrip`, `Explanation`, `Footnote` stubs in `App.tsx`

From design handoff app.jsx, each section uses a specific top-level class name. Stubs must preserve these class names for layout:
```typescript
<div className="inchi-section" />   // → <InchiSection> in Phase 2
<div className="mapping" />          // → <MappingStrip> in Phase 3+
<div className="explain" />          // → <Explanation> in Phase 3+
<div className="footnote" />         // → <Footnote> in Phase 3+
```

### Module-Level Provider Pattern
**Source:** RESEARCH.md Pattern 1 (lines 148–158)
**Apply to:** `src/App.tsx` (and any file that needs to share the Ketcher instance)

```typescript
// At module scope — outside any function or class
const structServiceProvider = new StandaloneStructServiceProvider();
```

This singleton is created once when the module loads and survives for the page lifetime. Never recreate it inside a component, hook, or effect.

### TypeScript Typing for Ketcher
**Source:** RESEARCH.md Verified API Reference (lines 330–407)
**Apply to:** `App.tsx`, `KetcherPanel.tsx`

```typescript
import type { Ketcher } from 'ketcher-core';          // type for onInit callback
import { Editor } from 'ketcher-react';                // React component
import { StandaloneStructServiceProvider } from 'ketcher-standalone'; // provider
```

Use `import type` for `Ketcher` to avoid pulling in runtime code for a type-only import.

---

## No Analog Found

All Phase 1 files have analogs (either from the design handoff or RESEARCH.md verified patterns). There are no files requiring novel pattern invention.

| File | Analog Source | Notes |
|------|---------------|-------|
| `public/coi-serviceworker.js` | External download | Not authored — downloaded from `https://github.com/gzuidhof/coi-serviceworker`. No pattern needed; place as-is in `public/`. |

---

## Metadata

**Analog search scope:** `design_handoff_explain_that_inchi/` (all 7 files), RESEARCH.md patterns
**Files scanned:** 7 design handoff files (app.jsx, canvas.jsx, index.html, styles.css, molecules.js, layers-info.js, README.md)
**Existing source files (outside design handoff):** 0 — fully greenfield
**Pattern extraction date:** 2026-05-19
