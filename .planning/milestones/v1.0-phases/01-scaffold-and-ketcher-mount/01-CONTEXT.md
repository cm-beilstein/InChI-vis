# Phase 1: Scaffold and Ketcher Mount - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the Vite + React + TypeScript project from scratch. By the end of this phase: `npm run dev` starts without errors, the Ketcher editor is mounted in the page, `getInchi()` returns a valid InChI string from the browser console, `highlights.create` is callable without throwing, and CSS custom properties from `styles.css` resolve correctly and are not overridden by Ketcher's stylesheet. Everything beyond the editor panel and global layout shell is a stub — no InChI parsing, no layer display, no hover logic.

</domain>

<decisions>
## Implementation Decisions

### Deployment Target
- **D-01:** Deploy to **GitHub Pages** — not Netlify.
- **D-02:** GitHub repo name is `explain-that-inchi`. Vite `base` must be set to `'/explain-that-inchi/'` in `vite.config.ts`.
- **D-03:** `coi-serviceworker.js` must be downloaded and placed in `public/` at scaffold time. Add `<script src="/coi-serviceworker.js"></script>` as the **first script** in `index.html`. This polyfills COOP/COEP headers so SharedArrayBuffer (required by Ketcher WASM) works on GitHub Pages static hosting.
- **D-04:** No `netlify.toml` — the project targets GitHub Pages only.

### App Shell Scope
- **D-05:** Phase 1 scaffolds the **full layout shell** from the design handoff's `app.jsx`: port `Header` and `KetcherPanel` components with real implementation; stub out `InchiSection`, `MappingStrip`, `Explanation`, and `Footnote` as empty `<div>`s with the correct CSS class names. Later phases fill the stubs — layout work is done once here.
- **D-06:** `styles.css` from the design handoff is copied verbatim to `src/styles.css` and imported **once** in `main.tsx` as a global stylesheet. This makes all CSS custom properties (`--color-formula`, `--bg-canvas`, etc.) available globally; CSS Modules reference them by variable name.
- **D-07:** Ketcher CSS must be scoped to prevent it from overriding the design tokens. Wrap Ketcher's stylesheet import in `@layer ketcher-reset { }` or ensure the Ketcher container has sufficient CSS specificity to contain its styles.

### WASM Loading State (PLSH-02)
- **D-08:** While Ketcher/WASM is initializing, show a **dimmed overlay** over the KetcherPanel area: a semi-transparent `<div>` with `"Loading editor…"` centered in `--ink-soft` color. Implementation: a boolean `isReady` state (initialized to `false`) on `App`; the `onInit` callback sets it to `true`; the overlay is conditionally rendered on top of the `<Editor>` while `!isReady`.
- **D-09:** The `<Editor>` component must **never** be conditionally rendered — WASM re-initializes on remount. The loading overlay sits on top of a permanently-mounted `<Editor>`, not in place of it.

### staticResourcesUrl
- **D-10:** Set `staticResourcesUrl={import.meta.env.BASE_URL}` on the `<Editor>` component. This resolves to `/explain-that-inchi/` in production builds and `/` in dev — both correct for Ketcher to locate its WASM assets, `help.md`, and `library.sdf` at the right URL.

### Ketcher Package Versions (locked from project init)
- **D-11:** All three Ketcher packages pinned to exactly `3.12.0`: `ketcher-react`, `ketcher-standalone`, `ketcher-core`.
- **D-12:** Use `@vitejs/plugin-react` (esbuild transform), **not** `@vitejs/plugin-react-swc` — SWC crashes on Ketcher packages (issue #5565).
- **D-13:** `StandaloneStructServiceProvider` must be instantiated at **module level** (outside any component), not inside a component or `useEffect`.
- **D-14:** `vite-plugin-static-copy` is required to copy WASM and worker assets from `node_modules/ketcher-standalone/dist/` to `dist/` (and `public/` for dev). Set `assetsInlineLimit: 0` in Vite config to prevent base64 inlining of WASM files.

### State Architecture (locked from project init)
- **D-15:** React state ownership is flat on `App`. Ketcher instance reference is stored in `useRef`, never in React state — putting it in state would trigger unnecessary re-renders.

### Claude's Discretion
- Exact list of WASM/worker filenames to copy — resolve by running `npm install` and inspecting `node_modules/ketcher-standalone/dist/`; copy all `.wasm` and worker `.js` files found there.
- CSS Module file structure within `src/` (flat vs. component-collocated) — follow the design handoff's implicit structure.
- Exact CSS for the `isReady` loading overlay — use design tokens, keep it minimal.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Handoff (source of truth for layout and tokens)
- `design_handoff_explain_that_inchi/styles.css` — 60+ CSS custom properties using oklch; copy verbatim to `src/styles.css`
- `design_handoff_explain_that_inchi/app.jsx` — reference for App, Header, KetcherPanel, InchiSection, MappingStrip, Explanation, Footnote component structure — port Header and KetcherPanel in Phase 1
- `design_handoff_explain_that_inchi/canvas.jsx` — SVG stand-in for the molecule editor; the real KetcherPanel replaces this entirely
- `design_handoff_explain_that_inchi/index.html` — reference HTML structure

### Project Planning
- `.planning/REQUIREMENTS.md` — EDIT-01 (embed Ketcher standalone) and PLSH-02 (WASM loading state) are Phase 1 requirements
- `.planning/PROJECT.md` — constraints, key decisions, and critical pitfalls

### External (Ketcher)
- Ketcher API: `getInchi(withAuxInfo?: boolean): Promise<string>` and `highlights.create` callable on the `Ketcher` instance from `onInit`
- `vite-plugin-static-copy` docs — required for WASM asset serving
- `coi-serviceworker` (https://github.com/gzuidhof/coi-serviceworker) — service worker polyfill for GitHub Pages COOP/COEP

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design_handoff_explain_that_inchi/styles.css`: Copy verbatim — all CSS tokens are defined here, no changes needed
- `design_handoff_explain_that_inchi/app.jsx` §Header: Port directly to `src/components/Header.tsx` — static markup, no props needed
- `design_handoff_explain_that_inchi/app.jsx` §KetcherPanel: Use as reference for layout; replace the static `.ketcher` div with real `<Editor>` + loading overlay

### Established Patterns
- No existing patterns yet — Phase 1 establishes them
- Component files: TypeScript (`.tsx`), collocated CSS Module (`.module.css`)
- Global styles: `src/styles.css` imported in `main.tsx`

### Integration Points
- `App.tsx` is the root: owns `isReady` state, `ketcherRef`, `<Editor onInit={...}>` mount point
- `main.tsx` is the entry point: imports `src/styles.css`, mounts `<App>` into `#root`

</code_context>

<specifics>
## Specific Ideas

- GitHub Pages URL will be `https://{username}.github.io/explain-that-inchi/`
- `coi-serviceworker.js` causes a single page reload on first visit — this is expected behavior, not a bug
- The loading overlay must sit on top of a permanently-mounted `<Editor>`, not replace it, to avoid WASM re-initialization

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-scaffold-and-ketcher-mount*
*Context gathered: 2026-05-18*
