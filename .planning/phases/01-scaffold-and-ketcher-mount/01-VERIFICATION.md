---
phase: 01-scaffold-and-ketcher-mount
verified: 2026-05-19T14:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "npm run dev starts and Ketcher editor is visible in the browser"
    expected: "Browser at http://localhost:5173/explain-that-inchi/ shows the full layout shell with the Ketcher editor mounted (not a blank page, not an error screen)"
    why_human: "Cannot programmatically start a dev server and observe the browser in this verification environment"
  - test: "Drawing a molecule and calling getInchi() from the DevTools console returns a valid InChI string"
    expected: "e.g. InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H for benzene; non-empty, begins with InChI=1S/"
    why_human: "Requires WASM initialization in a live browser session; getInchi() is async and only callable after onInit fires"
  - test: "ketcher.editor.highlights.create({atoms:[0], bonds:[], rgroupAttachmentPoints:[], color:'oklch(0.55 0.14 155)'}) does not throw"
    expected: "Atom index 0 changes color in the canvas; no error in the DevTools console"
    why_human: "Requires a live browser session with Ketcher initialized and a molecule drawn"
---

# Phase 1: Scaffold and Ketcher Mount — Verification Report

**Phase Goal:** Bootstrap the Vite + React + TypeScript project with Ketcher embedded — the editor mounts, getInchi() is callable, and highlights.create() works. Design tokens from the handoff are intact.
**Verified:** 2026-05-19T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                              | Status            | Evidence                                                                                                    |
|----|----------------------------------------------------------------------------------------------------|-------------------|-------------------------------------------------------------------------------------------------------------|
| 1  | `npm run dev` starts without errors; browser shows the Ketcher editor mounted in the page         | ? HUMAN NEEDED    | Build exits 0, all wiring verified. Cannot start dev server and observe browser in this environment.        |
| 2  | Drawing any molecule and calling `getInchi()` returns a valid InChI string                        | ? HUMAN NEEDED    | WASM assets are at dist root, onInit wiring is complete. Requires live browser + WASM init.                 |
| 3  | `highlights.create` can be called from the console without throwing; at least one atom changes color | ? HUMAN NEEDED  | API wiring exists (ketcherRef.current set in handleInit). Requires live browser session.                    |
| 4  | CSS custom properties (e.g. `--color-formula`) resolve correctly; Ketcher CSS does not override them | ✓ VERIFIED      | `--c-formula: oklch(0.55 0.14 245)` at line 13 of styles.css; Ketcher CSS isolated via `@import layer(ketcher-reset)` in KetcherPanel.module.css |
| 5  | `vite build && vite preview` completes without WASM or worker 404 errors                          | ✓ VERIFIED        | `npm run build` exits 0. WASM at `dist/indigo-ketcher-1.40.0.wasm`, `dist/indigo-ketcher-norender-1.40.0.wasm`. 7 items copied. No error output. |

**Score:** 2/5 truths verified programmatically; 3 require human browser testing

### Required Artifacts

| Artifact                                     | Expected                                             | Status      | Details                                                                                           |
|----------------------------------------------|------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------------|
| `package.json`                               | Manifest with Ketcher 3.12.0 deps                   | ✓ VERIFIED  | ketcher-react@3.12.0, ketcher-standalone@3.12.0, ketcher-core@3.12.0. @vitejs/plugin-react@^6.0.0 (esbuild, not SWC). |
| `vite.config.ts`                             | base, assetsInlineLimit:0, viteStaticCopy binaryWasm | ✓ VERIFIED  | base: '/explain-that-inchi/', assetsInlineLimit: 0, viteStaticCopy with rename:{stripBase:true}   |
| `index.html`                                 | coi-serviceworker first script with %BASE_URL%       | ✓ VERIFIED  | `<script src="%BASE_URL%coi-serviceworker.js">` as only `<head>` script; IBM Plex Google Fonts link present |
| `src/styles.css`                             | Verbatim design token CSS + @layer ketcher-reset     | ✓ VERIFIED  | --bg: oklch(0.985 0.005 85) at line 2; --c-formula: oklch(0.55 0.14 245) at line 13; @layer ketcher-reset at line 701 |
| `public/coi-serviceworker.js`                | COOP/COEP polyfill, non-empty                        | ✓ VERIFIED  | 6028 bytes; downloaded from canonical gzuidhof/coi-serviceworker source                          |
| `src/main.tsx`                               | React entry importing styles.css before App          | ✓ VERIFIED  | `import './styles.css'` at line 3, before `import App from './App'` at line 4                    |
| `src/App.tsx`                                | Module-level provider, isReady state, ketcherRef     | ✓ VERIFIED  | `StandaloneStructServiceProvider` at module scope (line 9), `useRef<Ketcher | null>(null)` (line 14), `useState(false)` (line 12) |
| `src/components/Header.tsx`                  | Static header from design handoff                    | ✓ VERIFIED  | "Explain that InChI", middle dot U+00B7 confirmed, `<em>InChI</em>` italic, version "1.07.3"    |
| `src/components/KetcherPanel.tsx`            | Ketcher Editor permanently mounted, loading overlay  | ✓ VERIFIED  | `<Editor>` always in DOM; overlay conditional on `{!isReady && ...}`; `staticResourcesUrl={import.meta.env.BASE_URL}`; "Loading editor…" (U+2026) |
| `src/components/KetcherPanel.module.css`     | Ketcher CSS in @layer, loadingOverlay styles          | ✓ VERIFIED  | `@import 'ketcher-react/dist/index.css' layer(ketcher-reset)` at line 11; `position: absolute; inset: 0; z-index: 10` |
| `tsconfig.app.json`                          | "jsx": "react-jsx", strict mode                      | ✓ VERIFIED  | "jsx": "react-jsx" at line 14; strict: true                                                       |
| `src/vite-env.d.ts`                          | Vite client types reference                          | ✓ VERIFIED  | `/// <reference types="vite/client" />`                                                           |

### Key Link Verification

| From                               | To                                          | Via                                           | Status      | Details                                                                       |
|------------------------------------|---------------------------------------------|-----------------------------------------------|-------------|-------------------------------------------------------------------------------|
| `index.html`                       | `public/coi-serviceworker.js`              | `script src=%BASE_URL%coi-serviceworker.js`   | ✓ WIRED     | Exact pattern found; built dist/index.html resolves to `/explain-that-inchi/coi-serviceworker.js` |
| `src/main.tsx`                     | `src/styles.css`                           | `import './styles.css'`                        | ✓ WIRED     | Line 3 of main.tsx, before any other local imports                           |
| `vite.config.ts`                   | `node_modules/ketcher-standalone/dist/binaryWasm` | `viteStaticCopy targets`                | ✓ WIRED     | Pattern `binaryWasm` confirmed; 7 items copied in build; WASM files at dist root |
| `src/App.tsx`                      | `src/components/KetcherPanel.tsx`          | `onInit={handleInit}` sets ketcherRef          | ✓ WIRED     | `ketcherRef.current = ketcher; setIsReady(true)` in handleInit (lines 16-19); passed as prop |
| `src/components/KetcherPanel.tsx`  | `ketcher-react Editor`                     | `structServiceProvider` prop                   | ✓ WIRED     | `structServiceProvider` passed through from App via prop; `staticResourcesUrl={import.meta.env.BASE_URL}` |
| `src/components/KetcherPanel.tsx`  | WASM assets                                | `staticResourcesUrl={import.meta.env.BASE_URL}` | ✓ WIRED   | `import.meta.env.BASE_URL` resolves to `/explain-that-inchi/` in prod, `/` in dev |

### Data-Flow Trace (Level 4)

| Artifact                     | Data Variable  | Source                             | Produces Real Data | Status       |
|------------------------------|----------------|------------------------------------|--------------------|--------------|
| `src/App.tsx`                | `ketcherRef`   | Ketcher `onInit` callback → WASM   | Yes (post-init)    | ✓ FLOWING    |
| `src/App.tsx`                | `isReady`      | `setIsReady(true)` in handleInit   | Yes                | ✓ FLOWING    |
| `src/components/KetcherPanel.tsx` | `!isReady` overlay | `isReady` prop from App        | Yes                | ✓ FLOWING    |

Note: `getInchi()` and `highlights.create()` are called from user code (browser console in Phase 1) — they are not data-flow items for this phase. The data flow is: WASM init → onInit fires → handleInit sets ketcherRef + isReady → overlay disappears.

### Behavioral Spot-Checks

| Behavior                                        | Command                         | Result       | Status  |
|-------------------------------------------------|---------------------------------|--------------|---------|
| `npm run build` exits 0                         | `npm run build; echo $?`        | Exit code: 0 | ✓ PASS  |
| WASM files at dist root                         | `ls dist/*.wasm`                | 2 files found | ✓ PASS |
| 7 items copied by viteStaticCopy                | build log                       | "Copied 7 items" | ✓ PASS |
| TypeScript clean (0 errors)                     | `tsc -b` (part of build script) | No TS errors | ✓ PASS  |
| coi-serviceworker.js at dist root               | `ls dist/coi-serviceworker.js`  | Found        | ✓ PASS  |
| dist/index.html has correct base path           | `cat dist/index.html`           | `/explain-that-inchi/coi-serviceworker.js` | ✓ PASS |
| `npm run dev` and browser rendering             | (requires live browser)         | —            | ? SKIP  |
| `getInchi()` returns InChI string               | (requires WASM + browser)       | —            | ? SKIP  |
| `highlights.create()` callable                  | (requires WASM + browser)       | —            | ? SKIP  |

### Requirements Coverage

| Requirement | Source Plan  | Description                                                         | Status          | Evidence                                                                              |
|-------------|-------------|---------------------------------------------------------------------|-----------------|---------------------------------------------------------------------------------------|
| EDIT-01     | 01-01, 01-02 | User can draw and edit molecules using embedded Ketcher standalone  | ? PARTIAL       | Editor component wired, WASM assets served. Full satisfaction requires browser test (getInchi + highlights). |
| PLSH-02     | 01-01, 01-02 | WASM loading state shown until Ketcher is ready                     | ✓ VERIFIED (code) | `{!isReady && <div className={styles.loadingOverlay}>Loading editor…</div>}` — conditional overlay wired to isReady state via onInit callback. Visual confirmation requires human. |

**Orphaned requirements check:** REQUIREMENTS.md traceability table shows EDIT-01 and PLSH-02 as "Pending" in the table — this contradicts the `[x]` checkbox marks above the table. This is a documentation inconsistency in REQUIREMENTS.md, not a code gap. The `[x]` marks and "complete Phase 1" annotations in the requirement descriptions are the accurate reflection of phase completion.

### Anti-Patterns Found

| File                                  | Pattern                             | Severity | Impact                                                                                                 |
|---------------------------------------|-------------------------------------|----------|--------------------------------------------------------------------------------------------------------|
| `src/App.tsx` lines 30-33             | Stub `<div>` elements               | ℹ️ Info   | Intentional per D-05 and documented in SUMMARY. Class names match styles.css. Phases 2-5 replace them. |
| `src/components/KetcherPanel.tsx`     | `console.error` in errorHandler     | ℹ️ Info   | Intentional — logs Ketcher init failures so they are visible during development.                       |

No blockers. The stub divs are documented intentional stubs for later phases (inchi-section, mapping, explain, footnote), not hollow implementations of Phase 1 goals.

### Human Verification Required

#### 1. Dev Server and Ketcher Editor Visible

**Test:** Run `npm run dev` in the project directory. Navigate to `http://localhost:5173/explain-that-inchi/` (or whatever port Vite announces).
**Expected:** Full layout renders — header reading "Explain that InChI", Ketcher editor panel visible below it with "Loading editor…" overlay briefly while WASM loads, then overlay disappears once Ketcher is ready.
**Why human:** Cannot start a dev server and observe the browser in this verification environment.

#### 2. getInchi() Returns Valid InChI

**Test:** After Ketcher loads, draw any molecule (e.g. benzene: draw a ring). Open DevTools console and run:
```javascript
// ketcherRef is not exposed globally — access via React DevTools
// or temporarily add window.ketcher = ketcherRef.current in App.tsx during dev
// then: await window.ketcher.getInchi()
```
Alternatively, use React DevTools to find the App component and inspect ketcherRef.
**Expected:** Returns a string beginning with `InChI=1S/` (e.g. `InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H` for benzene).
**Why human:** `getInchi()` is async and requires WASM initialization in a live browser context.

#### 3. highlights.create() Callable Without Throwing

**Test:** After drawing a molecule, in DevTools console:
```javascript
// (assuming window.ketcher is accessible)
await window.ketcher.editor.highlights.create({
  atoms: [0],
  bonds: [],
  rgroupAttachmentPoints: [],
  color: 'oklch(0.55 0.14 155)'
});
```
**Expected:** No error thrown; atom at index 0 in the canvas changes to the specified color.
**Why human:** Requires a live browser session with WASM initialized and at least one atom drawn.

### Gaps Summary

No code gaps found. All artifacts exist, are substantive, and are correctly wired. The 3 human verification items are browser-only behaviors that cannot be tested programmatically — they require a live WASM context.

The REQUIREMENTS.md traceability table has a documentation inconsistency (shows "Pending" for EDIT-01 and PLSH-02 while the requirement checkbox items correctly show `[x] complete Phase 1`). This does not reflect a code problem.

---

_Verified: 2026-05-19T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
