# Pitfalls Research: Explain that InChI

**Domain:** Ketcher + React 18 + WASM chemistry tool
**Researched:** 2026-05-18
**Overall confidence:** MEDIUM — Ketcher API and behavior verified from official GitHub issues and discussions; some internals (exact WASM threading model) require empirical verification at build time

---

## Critical Pitfalls

High-severity: will block progress or require significant rework if not addressed.

---

### 1. Vite + SWC crashes on ketcher-react build

**What goes wrong:**
When scaffolding with `npm create vite@latest -- --template react-swc-ts` (the SWC variant), the production build panics with:

```
width 3 given for non-narrow character
Abort trap: 6
```

SWC's Rust-based compiler cannot process characters inside the ketcher package source tree. The build exits with a non-zero code. This is a known open issue (epam/ketcher#5565, filed Sep 2024, status: open as of research date).

**Why it happens:**
ketcher bundles third-party code that contains Unicode characters SWC cannot handle during its transform phase. The Babel-based `@vitejs/plugin-react` does not have this constraint.

**Warning signs:**
- You chose `--template react-swc-ts` at scaffold time.
- The error appears in `vite build`, not `vite dev`.

**Prevention:**
Use `@vitejs/plugin-react` (Babel-based), not `@vitejs/plugin-react-swc`.

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
export default { plugins: [react()] };
```

Switching is a one-line change. There is no meaningful DX difference for this project.

**Phase:** Scaffold (Phase 1). Must be right before the first build.

---

### 2. ketcher-react/dist/index.css pollutes global styles

**What goes wrong:**
`import 'ketcher-react/dist/index.css'` injects CSS rules that are not scoped to any component class. Rules targeting bare HTML elements (`body`, `button`, `input`, `p`, etc.) override the project's own design tokens and layout. Reported as epam/ketcher#699 and linked to multiple downstream breakages.

**Why it happens:**
Ketcher's stylesheet is an application-level stylesheet, not a component stylesheet. It was written assuming it owns the entire page. The project's `styles.css` design tokens (IBM Plex typefaces, colour system, spacing) will be partially or fully overridden.

**Warning signs:**
- After mounting `<Editor>`, body font changes, button padding shifts, or `--ink` colours stop matching the prototype.
- Typography regression visible even when the Ketcher editor is off-screen.

**Prevention:**
Wrap the `<Editor>` in a containing element and use CSS layer specificity or `@layer` to isolate Ketcher's stylesheet below the project's own tokens. Alternatively, import Ketcher's CSS inside a CSS `@layer` with the lowest priority:

```css
@layer ketcher-reset {
  /* paste or @import ketcher-react/dist/index.css here */
}
```

Or apply a scoping class via PostCSS. Regardless of technique, test the full design token system immediately after the first Ketcher mount — don't assume styles are safe.

**Phase:** Ketcher integration (Phase 2). Verify token integrity with a visual diff against the prototype immediately.

---

### 3. WASM and worker files 404 in production / GitHub Pages deployment

**What goes wrong:**
`ketcher-standalone` loads Indigo as a WASM module inside a Web Worker. In the Vite dev server, imports are resolved against `node_modules`. After `vite build`, the WASM binary and its companion worker script must be present at a URL the browser can reach. If Vite inlines the WASM as base64, or if the deploy base path is wrong, the worker silently fails to start and all structure-service calls hang or reject.

On GitHub Pages the deploy URL is `https://user.github.io/repo-name/`, meaning the Vite `base` option must be `/repo-name/`. If `base` is not set, asset paths in the production bundle resolve from `/` and all WASM fetches 404.

**Why it happens:**
- Vite's default `base: '/'` does not match a GitHub Pages subpath.
- WASM files may be below the `assetsInlineLimit` threshold and get inlined, causing `WebAssembly.instantiateStreaming` to fail because it expects a `Response` object, not a data URL.
- The `staticResourcesUrl` prop on `<Editor>` must point to where Ketcher's `help.md` and `library.sdf` are hosted; in a Vite project this is the `/public` directory, and its URL prefix changes with `base`.

**Warning signs:**
- `vite dev` works; `vite preview` or deployed site shows blank Ketcher / console errors like `WebAssembly streaming compile failed`.
- Network tab shows 404 for `.wasm` or `.js` worker files.

**Prevention:**
1. Set `base` in `vite.config.ts` to match the GitHub Pages subpath:
   ```ts
   export default defineConfig({ base: '/InChI-vis/' });
   ```
2. Set `assetsInlineLimit: 0` to prevent WASM inlining:
   ```ts
   build: { assetsInlineLimit: 0 }
   ```
3. Pass `staticResourcesUrl` as the base-aware public URL:
   ```tsx
   <Editor staticResourcesUrl={import.meta.env.BASE_URL} ... />
   ```
4. Test with `vite preview --base /InChI-vis/` before first deploy.

**Phase:** Deployment setup (Phase 1 scaffold), verification in Phase 2 (first Ketcher mount). Do not defer until final deploy.

---

### 4. SharedArrayBuffer / COOP+COEP not set on GitHub Pages

**What goes wrong:**
Indigo's WASM is compiled with Emscripten and uses Web Workers internally. Whether it uses `SharedArrayBuffer` (pthread-style threading) cannot be confirmed without inspecting the build artifacts, but if it does, the browser silently refuses to create `SharedArrayBuffer` unless the page is cross-origin isolated (COOP: `same-origin` + COEP: `require-corp` or `credentialless`). GitHub Pages does not allow setting custom HTTP headers. The symptom is Ketcher appearing to load but all structure operations silently failing.

**Why it happens:**
Chrome 91+ and Firefox require cross-origin isolation for `SharedArrayBuffer`. GitHub Pages serves all responses with a fixed header set it controls.

**Warning signs:**
- `crossOriginIsolated` is `false` in browser devtools console.
- Ketcher editor renders but `getInchi()` / `getMolfile()` never resolve.
- No explicit error — just a stuck Promise.

**Prevention:**
Include `coi-serviceworker` (gzuidhof/coi-serviceworker) in the `public/` directory and load it from `index.html` before any other scripts:

```html
<script src="/coi-serviceworker.js"></script>
```

The service worker intercepts page load, injects synthetic COOP/COEP headers, then reloads once. After that, `crossOriginIsolated === true`. Caveats: causes a single extra page load on first visit; must be served from the same origin (cannot be a CDN URL); requires HTTPS (GitHub Pages satisfies this).

**Empirical check first:** After initial ketcher mount, run `console.log(crossOriginIsolated)`. If `true`, this pitfall does not apply and `coi-serviceworker` is not needed. Only add it if the check fails.

**Phase:** Deployment verification (Phase 2 Ketcher integration, confirmed before Phase N deploy).

---

## Common Mistakes

Medium-severity: wastes development time but recoverable without structural rework.

---

### 5. Stale closure in `editor.subscribe('change', handler)` inside `useEffect`

**What goes wrong:**
The `onInit` callback fires once (when Ketcher is ready). Inside `onInit`, calling `ketcher.editor.subscribe('change', handler)` creates a closure over whatever React state or props exist at that moment. When React re-renders and state updates (e.g., `hoveredLayerIdx`, `auxMap`, `subHover`), the handler still reads the stale original values. The symptom is highlight logic that uses outdated state.

This is a confirmed pattern in Ketcher-specific community discussion (epam/ketcher Discussion #6156, "Handling Stale State Values in Event Handlers with Editor.subscribe").

**Why it happens:**
The subscription is created once inside `onInit`, which itself runs once. React's closure model means the handler captures variables by value at creation time.

**Prevention:**
Store mutable state in a `useRef` and read `.current` inside the handler. Never read React state directly inside a Ketcher subscription callback:

```ts
const auxMapRef = useRef<Map<number, number>>(new Map());
// On every auxMap state update:
useEffect(() => { auxMapRef.current = auxMap; }, [auxMap]);

// Inside onInit:
ketcher.editor.subscribe('change', async () => {
  // Read from ref, never from closed-over state:
  const map = auxMapRef.current;
  ...
});
```

**Cleanup:** The subscribe API returns a `Subscription` object. Use `ketcher.editor.unsubscribe('change', subscription)` in a cleanup path. Because `onInit` is not inside a standard `useEffect`, store the subscription reference on a ref and unsubscribe on component unmount via a separate `useEffect` cleanup.

**Phase:** Phase 2 (Ketcher integration + structure-change pipeline). Get the ref pattern right from the first subscriber.

---

### 6. `getInchi(true)` return format — concatenated string, not two separate values

**What goes wrong:**
The README gotcha says: "`getInchi(true)` returns both InChI and aux-info concatenated." Concretely, calling `ketcher.getInchi(true)` (with `withAuxInfo = true`) returns a single `Promise<string>`. The resolved string contains the InChI line followed by a newline, then the AuxInfo line:

```
InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H
AuxInfo=1/0/N:3,1,5,2,6,4/E:(1,2,3,4,5,6)/...
```

Code that tries to destructure two values (`const [inchi, aux] = await getInchi(true)`) gets `undefined` for the second variable. Code that expects a structured object crashes silently. The atom mapping is therefore never parsed, and the entire highlighting system does not function.

**Why it happens:**
The API is not well-documented. The boolean parameter exists but is not described in the public README. The concatenation format follows the raw InChI library output.

**Warning signs:**
- `auxMap` is always empty.
- Mapping strip shows all pairs as identity.
- No highlights appear on hover.

**Prevention:**
Split on newline after the `await`:

```ts
async function fetchInchiAndAux(ketcher: Ketcher) {
  const raw = await ketcher.getInchi(true);
  const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
  const inchi = lines.find(l => l.startsWith('InChI=')) ?? '';
  const auxinfo = lines.find(l => l.startsWith('AuxInfo=')) ?? '';
  return { inchi, auxinfo };
}
```

Alternatively, use the lower-level `ketcher.editor.structService` to call `getInChIAuxInfo` directly and get two separate fields — but this is a private/internal API with no stability guarantees.

**Phase:** Phase 3 (structure-change pipeline + aux-info parsing). Write a unit test for `parseAuxMapping` immediately to confirm the split produces correct `/N:` data.

---

### 7. `setMolecule()` called inside `onInit` causes rendering artifacts

**What goes wrong:**
The preset molecule list requires loading a molecule when the user clicks a row. If `ketcher.setMolecule(molfile)` is called directly inside `onInit` (for initial load), or if it is called from a click handler before Ketcher has finished its internal initialization, the molecule may disappear from the canvas after the first user action (e.g., clicking "Aromatize"). This is a confirmed bug in epam/ketcher#1174.

**Why it happens:**
Ketcher's internal render state is not fully settled when `onInit` fires. The `setMolecule` call races with an internal reset cycle.

**Warning signs:**
- Preset molecule loads visually on start, then disappears after the first toolbar click.
- No error in console.

**Prevention:**
Either use a `setTimeout(() => ketcher.setMolecule(mol), 0)` deferred call (or a small delay if zero-tick is insufficient), or use the `moleculeData` prop on `<Editor>` for the initial load and reserve `setMolecule` for user-triggered preset switches (which happen after the editor is fully ready).

**Phase:** Phase 2 (preset molecule list integration).

---

### 8. `onInit` fires twice in React StrictMode (dev mode)

**What goes wrong:**
In React 18 StrictMode (the default in Vite's React template), the `<Editor>` component mounts, unmounts, and remounts. Ketcher versions around 3.0.0-rc embed their own `<StrictMode>` inside the editor component, causing `onInit` to fire twice even in non-StrictMode parent apps (epam/ketcher#6375). In the 2.x series the behaviour is driven by the outer app's StrictMode. Either way, the subscription to `'change'` fires twice, the `window.ketcher` reference is reassigned, and any cleanup logic attached to the first init is orphaned.

**Why it happens:**
React 18 StrictMode deliberately double-invokes effects in dev mode to surface cleanup bugs. This is dev-only; production builds do not double-mount.

**Warning signs:**
- `onInit` console.log appears twice in dev.
- Two `'change'` subscriptions accumulate after every hot reload.
- Stale subscriptions accumulate across hot reloads, causing duplicate `getInchi` calls per change event.

**Prevention:**
- Store the Ketcher instance and subscription on refs, not in component state.
- Guard initialization with a flag ref:
  ```ts
  const ketcherInitialized = useRef(false);
  // in onInit:
  if (ketcherInitialized.current) return;
  ketcherInitialized.current = true;
  ```
- This is a development-only problem. Do not strip StrictMode to paper over it.

**Phase:** Phase 2 (Ketcher integration). Put the guard in before any other subscription logic.

---

### 9. `highlights.create` index numbering and multi-highlight model

**What goes wrong:**
Two related mistakes appear together:

**a) Index convention confusion.** Ketcher's `highlights.create({ atoms: [...] })` accepts **0-based** atom indices (matching the internal graph representation). The aux-info `/N:` mapping, per the design handoff's `parseAuxMapping` function, outputs `ketcherIdx - 1` — i.e., it already converts to 0-based. Using 1-based canonical numbers directly as atom indices produces off-by-one highlights (wrong atoms light up).

**b) Accumulating highlights without clearing.** Each call to `highlights.create` adds a new highlight layer. Calling it without a preceding `highlights.clear()` on every hover event causes highlights to stack, visually corrupting the canvas. The clear must precede every new create call (or use the returned handle to delete individual highlights if selective removal is needed).

**Warning signs:**
- Hovering a layer highlights the wrong atoms (shifted by one).
- After several hovers the canvas is covered in highlight colours that don't go away.

**Prevention:**
```ts
ketcher.editor.highlights.clear();
if (atomIndices.length > 0) {
  ketcher.editor.highlights.create({ atoms: atomIndices, color });
}
```

For sub-token hover that needs multiple colour groups (e.g., per-element formula colours), issue multiple sequential `create` calls after a single `clear` — do not `clear` between each `create`.

**Phase:** Phase 4 (hover → highlight wiring).

---

### 10. Async race condition when debouncing the `'change'` subscription

**What goes wrong:**
`getInchi(true)` is asynchronous and takes ~50–200ms depending on molecule size (WASM round-trip). If the user draws quickly, multiple `'change'` events fire before the previous `getInchi` call resolves. The last-started call may resolve before an earlier one, causing the InChI display to momentarily show a stale structure's InChI string before being overwritten.

**Why it happens:**
Promises do not have built-in cancellation. Without a version guard, out-of-order resolutions corrupt the displayed state.

**Warning signs:**
- InChI display flickers during rapid drawing.
- Occasionally shows the wrong layer count for a fraction of a second.

**Prevention:**
Use a generation counter. Discard results from any call that is not the latest:

```ts
let callGen = 0;
ketcher.editor.subscribe('change', debounce(async () => {
  const myGen = ++callGen;
  const raw = await ketcher.getInchi(true);
  if (myGen !== callGen) return; // superseded
  // update state...
}, 150));
```

The 150ms debounce from the design handoff is already specified; combine it with the generation guard.

**Phase:** Phase 3 (structure-change pipeline). Must be in place before integrating state updates.

---

## Watch List

Low-severity: monitor during development; address if they manifest.

---

### 11. TypeScript gaps — `window.ketcher`, internal editor types

Ketcher packages ship type declarations, but the `window.ketcher` global is not typed. Accessing `window.ketcher` without augmentation produces a TS error. The `editor.highlights` and `editor.subscribe` signatures are part of the internal `Editor` type from `ketcher-core`; they are exported but not prominently documented.

**Workaround:** Augment the Window interface:
```ts
// src/types/ketcher.d.ts
import type { Ketcher } from 'ketcher-core';
declare global {
  interface Window { ketcher: Ketcher; }
}
```

For `highlights.create`, the return type is an opaque handle. If selective per-handle deletion is needed later, check the type declaration in `ketcher-core`'s `src/domain/entities/highlight.ts`. For this project, `highlights.clear()` clears all and is sufficient.

**Phase:** Phase 1 (scaffold). Add the augmentation file before the first `window.ketcher` access.

---

### 12. `getInchi()` throws on empty canvas / valence errors

Ketcher's InChI call rejects if the canvas has no atoms, or if the structure has a valence error. The known error message is: `IndigoException: inchi-wrapper: Indigo-InChI: InChI generation failed: Empty structure`. An unhandled rejection crashes the change-handler pipeline and leaves the UI in a broken state.

**Prevention:**
Wrap every `getInchi` call in try/catch and handle the empty/error case by displaying a placeholder in the InChI display panel:

```ts
try {
  const raw = await ketcher.getInchi(true);
  // update state...
} catch {
  setInchiError('Draw a valid molecule to see InChI.');
}
```

**Phase:** Phase 3 (structure-change pipeline).

---

### 13. Ketcher version drift — 2.x vs 3.x API surface

As of research date (2026-05), the latest ketcher-react on npm is 3.x. The design handoff was written against the 2.x API (`highlights.create` / `highlights.clear`, `editor.subscribe`, `getInchi`). The 3.x series added macromolecule mode and moved to React 19 peer dependency (tracked in epam/ketcher#6657). The core small-molecule API used by this project (`getInchi`, `getMolfile`, `subscribe`, highlights) did not change in ways visible from release notes, but was not verified against every minor 3.x release.

**Risk:** Pinning to the latest 3.x and discovering a small API breakage mid-build.

**Mitigation:** Pin to an explicit minor version in `package.json` (`"ketcher-react": "3.x.y"`) so the CI lockfile is deterministic. Do not use `^` or `~` ranges. Check the release notes for every version bump before updating.

**Phase:** Phase 1 (scaffold). Lock the version before the first `npm install`.

---

### 14. GitHub Pages WASM MIME type

GitHub Pages now serves `.wasm` files with the correct `application/wasm` MIME type (confirmed via GitHub community discussions; the historical Jekyll-local issue was with `jekyll serve`, not the live site). This is not expected to be a problem in production, but `vite preview` served locally may serve WASM with `application/octet-stream` on some systems, which causes `WebAssembly.instantiateStreaming` to fail with a MIME type error.

**Mitigation:** Use `vite preview` (which uses esbuild's server) rather than a plain `python3 -m http.server` for local production testing.

**Phase:** Pre-deployment testing.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| 1 — Scaffold | Vite template selection | SWC crash on ketcher build (#1) | Use `@vitejs/plugin-react`, not SWC variant |
| 1 — Scaffold | Vite base path | 404 on GitHub Pages (#3) | Set `base: '/InChI-vis/'`, `assetsInlineLimit: 0` |
| 1 — Scaffold | TypeScript types | `window.ketcher` TS error (#11) | Add `ketcher.d.ts` augmentation |
| 1 — Scaffold | Version pinning | API drift (#13) | Lock to exact version, no `^` |
| 2 — Ketcher mount | CSS pollution | Design token override (#2) | CSS layer isolation, visual diff after first mount |
| 2 — Ketcher mount | StrictMode | `onInit` double-fire (#8) | Initialization guard ref |
| 2 — Ketcher mount | COOP/COEP | `crossOriginIsolated: false` (#4) | Check first; add coi-serviceworker if needed |
| 2 — Ketcher mount | Stale closures | Subscription reads stale state (#5) | Ref-based state for subscription callbacks |
| 2 — Ketcher mount | Preset loading | `setMolecule` in onInit crash (#7) | Defer with setTimeout or `moleculeData` prop |
| 3 — InChI pipeline | getInchi(true) format | Concatenated string, not object (#6) | Split on newline; unit test `parseAuxMapping` |
| 3 — InChI pipeline | Async race | Stale getInchi result (#10) | Generation counter + 150ms debounce |
| 3 — InChI pipeline | Empty structure | Unhandled rejection (#12) | try/catch every getInchi call |
| 4 — Hover highlighting | Index confusion | 1-based vs 0-based off-by-one (#9a) | Confirm aux-info map already outputs 0-based |
| 4 — Hover highlighting | Highlight stacking | Canvas covered in stale highlights (#9b) | Always `clear()` before `create()` |
| N — Deploy | GitHub Pages worker files | WASM 404 (#3) | `vite preview` test before push; verify base path |
| N — Deploy | SharedArrayBuffer | COOP headers missing (#4) | coi-serviceworker if `crossOriginIsolated: false` |

---

## Sources

- epam/ketcher Issue #5565 — SWC build panic: https://github.com/epam/ketcher/issues/5565
- epam/ketcher Issue #699 — CSS not component-scoped: https://github.com/epam/ketcher/issues/699
- epam/ketcher Issue #6375 — onInit fires twice in dev mode: https://github.com/epam/ketcher/issues/6375
- epam/ketcher Issue #1174 — setMolecule in onInit race: https://github.com/epam/ketcher/issues/1174
- epam/ketcher Discussion #6156 — Stale state in editor.subscribe: https://github.com/epam/ketcher/discussions/6156
- epam/ketcher Discussion #4050 — highlights.create API confirmed: https://github.com/epam/ketcher/discussions/4050
- epam/ketcher Discussion #586 — onInit setTimeout pattern: https://github.com/epam/ketcher/discussions/586
- epam/ketcher Issue #667 — AuxInfo in standalone mode: https://github.com/epam/ketcher/issues/667
- gzuidhof/coi-serviceworker — COOP/COEP for static hosting: https://github.com/gzuidhof/coi-serviceworker
- GitHub community discussion #13309 — COOP/COEP on GitHub Pages: https://github.com/orgs/community/discussions/13309
- Tom Ayac blog post (2025-03) — coi-serviceworker for GitHub Pages: https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/
- Vite static asset handling — assetsInlineLimit, base path: https://vite.dev/guide/assets
- Design handoff README.md — Known Gotchas section (project-local)
