# Project Research Summary

**Project:** Explain that InChI
**Domain:** Interactive chemistry notation explainer (education tool)
**Researched:** 2026-05-18
**Confidence:** HIGH

## Executive Summary

"Explain that InChI" is a browser-native, single-page interactive explainer for the IUPAC InChI chemical notation string. The closest analogues are regex101 (color-coded notation hover → explanation) and JSON formatters (live feedback, shareable links) — but no equivalent exists for InChI. The design is fully specified and final; research confirms that the stack (Vite 8 + React 18 + ketcher-react 3.12.0 + Zustand 5 + CSS Modules) is the correct minimal choice, and that every major feature is feasible with the planned architecture. The atom-mapping pipeline (draw → WASM → InChI + AuxInfo → canonical-to-Ketcher index map → per-atom highlights) is the highest-risk and highest-value engineering challenge in the project.

The recommended build approach follows a strict dependency order: scaffold and validate Ketcher WASM first (Phase 1), wire the data pipeline before building any display UI (Phase 2), then layer on color-coded display (Phase 3), hover-to-highlight integration (Phase 4), mapping strip and presets (Phase 5), and production polish (Phase 6). This order is driven by the architecture's hard seam: React's declarative model meets Ketcher's imperative DOM singleton. Every downstream feature — color-coded layers, hover-to-highlight, sub-token hover, mapping strip — depends on `getInchi(true)` returning parseable AuxInfo. That dependency must be confirmed working before anything else is built.

The primary risks are concentrated in Phases 1 and 2: the wrong Vite plugin (SWC variant crashes on Ketcher packages), Ketcher's CSS polluting the design token system, WASM/worker file paths breaking in production, and the stale-closure pitfall when wiring the `editor.subscribe('change', handler)` subscription. All of these have known, confirmed workarounds. Phases 3–6 follow well-established React patterns with low implementation risk.

---

## Key Findings

### Recommended Stack

The stack is intentionally minimal. Vite 8 + React 18 + TypeScript is the correct scaffold; React 19 is excluded because `ketcher-react` peer deps are pinned to `^18.2.0` and the upgrade PR was not merged in the 3.12.0 stable release. The three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) must all be pinned to exactly 3.12.0 — they are a monorepo and must stay version-locked. CSS Modules is the correct styling choice because the design handoff uses `oklch()` colors and ~60 CSS custom properties as a structured token system; Tailwind would require duplicating all of these.

**Core technologies:**
- Vite 8 + `@vitejs/plugin-react` (esbuild): build tool — NOT the SWC variant (confirmed crash on Ketcher packages, issue #5565)
- React 18.2: UI framework — required by ketcher-react peer deps; React 19 not compatible with 3.12.0 stable
- TypeScript 5.x: language — `ketcher-core` ships its own declarations
- `ketcher-react` 3.12.0: molecule editor component — provides `<Editor>` with `onInit` and `staticResourcesUrl`
- `ketcher-standalone` 3.12.0: WASM provider — `StandaloneStructServiceProvider`; no server required; must version-lock with above
- `ketcher-core` 3.12.0: types — `Ketcher` type for `onInit` callback; must version-lock with above
- Zustand 5: state management — justified by cross-tree state sharing (`hoveredLayerIdx`, `subHover`) without prop-drilling
- CSS Modules + CSS custom properties: styling — preserves oklch tokens and the full design token system verbatim
- `vite-plugin-static-copy`: required to copy WASM/worker assets from `node_modules` to `dist/` at known URLs
- Netlify (primary deploy): supports custom COOP/COEP headers via `netlify.toml`; GitHub Pages is fallback with `coi-serviceworker`

### Expected Features

**Must have (table stakes):**
- Live InChI generation from drawn structure — the core learning loop; any latency breaks the educational connection
- Color-coded layer display — universal pattern in all notation explainers; monochrome is not usable as a teaching surface
- Hover layer → highlight atoms in canvas — the entire value proposition; requires aux-info atom mapping
- Per-layer prose explanation — users need to understand why each segment exists, not just see it colored
- Preset example molecules — all notation explainers provide worked examples
- Graceful empty/invalid state — explicitly required in PROJECT.md; `getInchi()` throws on empty canvas
- Correct layer parsing for all standard layers — formula, c, h, b, t, m, s, q, p, i; parsers ship as final code in handoff
- Responsive layout at 1280px — not mobile-optimized, but must not overflow at common desktop widths
- No login / no data sent to server — WASM-only is a selling point for privacy-conscious research users

**Should have (differentiators — none exist in any current InChI tool):**
- Sub-token hover (formula element, c-layer atom, h-group, parity token) — fully specified; most complex feature
- Atom-numbering mapping strip (Ketcher index → canonical index) — genuine teaching moment; no existing tool exposes this
- Per-layer reading code (plain-English interpretation via `readingFor()`) — regex101 pattern applied to InChI; content ships with handoff
- Full layer legend with slide-in tooltip blurbs — interactive reference panel; content final in `LAYER_INFO`
- Bidirectional color semantics (per-element formula, per-parity stereo, per-H-count) — intra-layer color gradations that carry semantic meaning

**Defer (v1+):**
- Shareable URL with molecule state — strong candidate; MolView and regex101 both support it; not in current PROJECT.md scope but low-cost to add once state model exists
- 3D molecular viewer — out of scope; InChI is 2D by nature; MolView already does this better
- Database search / PubChem lookup — shifts product from "teach InChI" to "find molecule"; wrong direction
- Mobile/touch-optimized input — Ketcher touch support is limited; chemistry audience is desktop-first
- Reaction/RInChI support — separate layer semantics and parser; out of scope for standard InChI explainer

### Architecture Approach

The architecture is a single-screen React SPA with one hard seam: React's declarative model vs. Ketcher's imperative DOM singleton. Ketcher is initialized once via `onInit`, stored in a `useRef` (never in state, never passed as a prop), and controlled exclusively through method calls. React pushes highlight commands to Ketcher via `useEffect`; Ketcher pushes change events to React via `editor.subscribe('change', handler)`. State is flat and owned by App: `inchi`, `layers`, `auxMap`, `hoveredLayerIdx`, `subHover`, `selectedMolId`, `ketcherReady`. The `StandaloneStructServiceProvider` must be created at module level (outside any component) to avoid re-initialization on render.

**Major components:**
1. `App` — root state owner; owns Ketcher ref; drives highlight side-effects via `useEffect`
2. `KetcherPanel` → `Editor` + `MoleculeList` — Ketcher mount point; preset switching; Editor must never be conditionally rendered
3. `InchiDisplay` → `LayerChip[]` → `LayerText` → sub-renderers (`FormulaText`, `ConnectionText`, `ParityText`, `HLayerText`) — color-coded InChI strip with layer and sub-token hover events
4. `MappingStrip` — reads `auxMap`; renders canonical↔Ketcher atom index pairs; pure display
5. `ExplanationPanel` → `ExplanationCard` + `Legend` → `LegendRow[]` — reads `hoveredLayerIdx`; ports `LAYER_INFO` and `readingFor()` from handoff

### Critical Pitfalls

1. **SWC plugin crashes on Ketcher packages** — Use `@vitejs/plugin-react` (esbuild-based), never `@vitejs/plugin-react-swc`. SWC's Rust compiler panics on Unicode characters in Ketcher's source tree. Confirmed open issue #5565. Must be right at scaffold time; one-line fix.

2. **Ketcher CSS pollutes global design tokens** — `import 'ketcher-react/dist/index.css'` injects un-scoped rules that override custom properties and layout. Wrap in `@layer ketcher-reset { }` so it ranks below the project token layer. Validate token integrity with a visual diff immediately after first Ketcher mount.

3. **WASM/worker files 404 in production** — Vite does not automatically copy WASM assets to `dist/`. Must use `vite-plugin-static-copy`, set `assetsInlineLimit: 0` to prevent base64 inlining, and set `base: '/InChI-vis/'` for GitHub Pages. Validate with `vite preview` before first deploy.

4. **`getInchi(true)` returns a concatenated string, not two values** — The resolved `Promise<string>` contains InChI and AuxInfo as newline-separated lines. Destructuring two values returns `undefined` for aux-info, making `auxMap` permanently empty and silently disabling all highlighting. Split on `AuxInfo=` prefix; write a unit test for `parseAuxMapping` immediately.

5. **Stale closures in `editor.subscribe('change', handler)`** — The subscription callback is created once in `onInit` and captures stale state. Read mutable state through `useRef` inside the handler. Guard re-initialization with a `ketcherInitialized` ref to handle React 18 StrictMode's double-mount behavior.

---

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the build order confirmed in ARCHITECTURE.md, six phases are warranted. The ordering is dictated by a single rule: the Ketcher WASM + AuxInfo pipeline must be proven correct before any display or interaction work begins.

### Phase 1: Scaffold and Ketcher Mounting

**Rationale:** Everything downstream depends on a working Ketcher instance that can call `getInchi()` and `highlights.create`. This must be proven first — before any UI, state, or parser code. Critical pitfalls #1, #2, #3, and #4 all manifest during this phase.

**Delivers:** Running Vite 8 + React 18 + TS project with `<Editor>` mounted, `getInchi()` returning a string in the console, `highlights.create` confirmed working, and design tokens intact.

**Must avoid:**
- SWC plugin (use `@vitejs/plugin-react`)
- Conditional rendering of `<Editor>` (WASM re-initializes on remount)
- `StandaloneStructServiceProvider` created inside component render
- `^` semver ranges on ketcher packages (lock to 3.12.0 exact)
- Ketcher CSS overriding design tokens (CSS `@layer` isolation)
- Wrong `base` path or WASM inlining (`assetsInlineLimit: 0`, `vite-plugin-static-copy`)

**Research flag:** None — all decisions are resolved with known patterns.

### Phase 2: Data Pipeline (InChI + AuxInfo Parsing)

**Rationale:** `layers[]` and `auxMap` are consumed by every feature in Phases 3–5. Until these are proven correct on real Ketcher 3.12.0 output, nothing downstream can be validated. This phase has no UI — it produces only correctly-shaped state in the console.

**Delivers:** Debounced `'change'` subscription producing correct `layers[]` and `auxMap` in React state on every draw event.

**Must implement:**
- `splitInchiAndAux` — split on `AuxInfo=` prefix; verify format against real 3.12.0 output
- Port parsers from `molecules.js`: `parseInchi`, `parseConnectionBonds`, `parseHydrogenAtoms`, `parseMobileHydrogens`, `parseStereoAtoms`
- `parseAuxMapping` with unit test using captured real molecule output
- Generation counter to discard stale `getInchi` results from rapid drawing
- `latestHandlerRef` pattern to avoid stale closures in subscription callback
- `ketcherInitialized` guard ref for StrictMode double-mount
- `try/catch` on every `getInchi` call (empty canvas throws `IndigoException`)
- Deferred `setMolecule` for preset initial load (`setTimeout(fn, 0)` or `moleculeData` prop)

**Research flag:** MEDIUM — `getInchi(true)` return format must be empirically verified against 3.12.0; also check `crossOriginIsolated` to confirm whether COOP/COEP headers are required.

### Phase 3: Color-Coded InChI Display and Explanation Panel

**Rationale:** Display is testable against hardcoded `layers[]` data before highlights are wired. Building and validating visual output before adding the imperative Ketcher side-effects keeps concerns cleanly separated.

**Delivers:** Color-coded InChI strip with working layer-level dim/active hover, `ExplanationCard` updating on layer hover, `Legend` with tooltip slide-in animations (160ms, 4px). No Ketcher highlights yet.

**Implements:**
- `InchiDisplay` → `LayerChip[]` → `LayerText` dispatcher → sub-renderers
- `FormulaText`, `ConnectionText`, `ParityText`, `HLayerText` with per-span event emission
- `hoveredLayerIdx` and `subHover` state on App
- `ExplanationPanel` and `Legend` with `LegendRow[]` (port `LAYER_INFO` and `readingFor()`)
- Sub-hover suppression rule: clear `subHover` when switching layers

**Research flag:** None — design is fully specified; component boundaries are clear.

### Phase 4: Ketcher Highlight Integration

**Rationale:** Depends on Phase 2 (`auxMap` correct), Phase 3 (hover state wired), and Phase 1 (highlights API confirmed). Building last in this group avoids wiring the imperative side-effect until all inputs are stable.

**Delivers:** Hovering a layer highlights corresponding atoms/bonds in the Ketcher canvas; sub-token hover overrides with targeted per-element, per-parity, per-H-count highlights.

**Must implement:**
- `resolveLayerAtoms` / `resolveLayerBonds` (canonical → Ketcher 0-based index via `auxMap`)
- `resolveSubHoverGroups` (per sub-hover kind: element, atom, stereo, hAtoms/mobileH)
- `useEffect` highlight dispatch: always `clear()` before `create()`; multiple sequential `create()` calls for multi-color layers; single `clear` before the group
- Index convention: aux-info map already outputs 0-based Ketcher indices; do not subtract 1 again
- Sub-hover suppression: when `subHover` is set, skip layer-wide highlight entirely

**Research flag:** MEDIUM — `highlights.create` multi-call accumulation behavior must be validated against 3.12.0 at integration time (confirmed from Discussion #4050 but against an earlier version).

### Phase 5: Mapping Strip and Preset Molecules

**Rationale:** `MappingStrip` depends on a correct `auxMap` (Phase 2). Preset molecule switching depends on a stable change-event pipeline. Both are independent of the display and highlight work but require the pipeline to be solid before testing.

**Delivers:** Atom-numbering mapping strip showing canonical↔Ketcher index pairs (with identity/divergent visual distinction), and a preset molecule list that triggers the full draw-to-display pipeline.

**Implements:**
- `MappingStrip` — reads `auxMap`, derives identity vs. divergent pairs, handles "drawing order matches" message
- `MoleculeList` — reads `molecules.js` preset data, calls `ketcher.setMolecule()` on click, handles loading state during pipeline rebuild

**Research flag:** None — well-defined; logic is specified in handoff.

### Phase 6: Polish, Edge Cases, and Deployment

**Rationale:** All functional features are complete; this phase targets production quality and correctness at boundary conditions.

**Delivers:** Production build with graceful error states, WASM loading UX, typography, accessibility pass, and a confirmed working static deployment.

**Includes:**
- Empty/invalid structure placeholder (surfaced from `try/catch` in Phase 2)
- `ketcherReady` gate: show spinner/skeleton while WASM initializes (1–3s cold start)
- Typography check (IBM Plex Sans/Serif/Mono via Google Fonts)
- Accessibility pass: keyboard-navigable layer hover, aria labels on MappingStrip
- `vite build` + `vite preview` validation before first deploy
- COOP/COEP check: if `crossOriginIsolated === false` and WASM fails, add `coi-serviceworker` to `public/`
- Netlify `netlify.toml` COOP/COEP headers for primary deploy target

**Research flag:** None — standard deployment patterns; all issues have known solutions.

### Phase Ordering Rationale

- Phases 1 and 2 are non-negotiable first because the entire feature tree depends on a working Ketcher WASM + AuxInfo pipeline. No UI work is meaningful until `auxMap` is confirmed correct on real Ketcher output.
- Phase 3 precedes Phase 4 because hover state must exist before highlight dispatch can be wired. Building display first also enables visual validation with mock data.
- Phase 5 is last in the functional group because `MappingStrip` and presets are independent features that add no risk to Phase 4's highlight integration.
- Phase 6 is always last — polish and deployment validation require all features to be functionally complete.
- The shareable URL feature (identified as strong v1+ candidate in FEATURES.md) can slot into Phase 6 at low marginal cost; the state model is already in place after Phase 2.

### Research Flags

Phases needing empirical validation during implementation:
- **Phase 2:** `getInchi(true)` return format — must verify the exact line separator and `AuxInfo=` prefix format against the installed 3.12.0 package. Write a unit test with captured real output as the first artifact of this phase.
- **Phase 2:** COOP/COEP requirement — whether `crossOriginIsolated` must be `true` for Indigo WASM in 3.12.0 is not determinable without running the app. Check immediately after first mount in Phase 1.
- **Phase 4:** `highlights.create` multi-call accumulation — confirm multiple sequential calls accumulate correctly in 3.12.0 before building `resolveSubHoverGroups`.

Phases with standard, well-documented patterns (no additional research needed):
- **Phase 1:** Vite scaffold, plugin selection, CSS layer isolation, `vite-plugin-static-copy` configuration
- **Phase 3:** React component structure, CSS Modules with custom properties, event propagation
- **Phase 5:** Preset list, deferred `setMolecule` pattern
- **Phase 6:** Netlify headers, `coi-serviceworker`, Google Fonts loading

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology choices verified against official sources, npm registry, and confirmed Ketcher GitHub issues. Version constraints (React 18, SWC exclusion, exact Ketcher version) are empirically grounded. |
| Features | HIGH | Table stakes confirmed by analogy to regex101/JSON formatter norms and by surveying all existing InChI tools. Differentiators confirmed absent from all current tools. Anti-features confirmed by PROJECT.md constraints. |
| Architecture | HIGH | Component boundaries derived directly from design handoff `app.jsx`. Integration patterns (subscription, highlight dispatch, debounce, stale-closure avoidance) verified against official Ketcher repo and confirmed community discussions. |
| Pitfalls | MEDIUM | SWC crash, CSS pollution, WASM 404, stale closures all confirmed from official issues with known workarounds. WASM threading model and exact `getInchi(true)` format require empirical verification on the installed package. |

**Overall confidence:** HIGH

### Gaps to Address

- **WASM threading model:** Whether Indigo 1.40 (shipped with ketcher-standalone 3.12.0) requires `SharedArrayBuffer` is unconfirmed. Empirical check: `console.log(crossOriginIsolated)` after first mount in Phase 1. If `false` and InChI generation works, COOP/COEP headers are not needed. If `false` and generation fails, add `coi-serviceworker`.

- **`getInchi(true)` exact format:** Documented as InChI + AuxInfo concatenated. The separator must be validated against actual 3.12.0 output. `splitInchiAndAux` should split on `AuxInfo=` prefix as the safer approach. Write a unit test in Phase 2 with captured real output.

- **Exact WASM asset paths in ketcher-standalone 3.12.0:** The `viteStaticCopy` target paths are placeholders. Inspect `node_modules/ketcher-standalone/dist/` after `npm install` to confirm exact file names before Phase 1 build validation.

- **`staticResourcesUrl` correct value in Vite 8:** In Create React App this was `process.env.PUBLIC_URL`. In Vite the equivalent is `import.meta.env.BASE_URL` or `''`. Verify which value resolves WASM asset requests correctly during Phase 1 integration.

- **Shareable URL scope decision:** Research identifies this as a strong v1+ candidate (MolView and regex101 both provide it). Needs a product decision: include in Phase 6 or defer to v2. The state model needed (molfile encoding in URL hash) is low-cost to add once the Zustand store is in place.

---

## Sources

### Primary (HIGH confidence)
- Design handoff `app.jsx` and `README.md` (project-local) — canonical component structure, parser logic, layer content
- Ketcher GitHub official repo (epam/ketcher) — API surface, release notes, confirmed bugs and workarounds
- ketcher-react npm registry (Snyk version data) — version confirmation (3.12.0 stable as of 2026-03-04)
- Vite official docs (vite.dev/guide, v8) — configuration, `optimizeDeps.exclude`, `assetsInlineLimit`
- Zustand v5 announcement (pmnd.rs) — React 18 requirement, API surface

### Secondary (MEDIUM confidence)
- epam/ketcher Issue #5565 — SWC panic confirmed, workaround validated
- epam/ketcher Issue #699 — Ketcher CSS pollution confirmed
- epam/ketcher Issue #6375 — StrictMode double-init confirmed
- epam/ketcher Issue #1174 — `setMolecule` in `onInit` race confirmed
- epam/ketcher Discussion #6156 — stale state in `editor.subscribe` confirmed
- epam/ketcher Discussion #4050 — `highlights.create` API confirmed (earlier version)
- ketcher-core structService types (unpkg 2.26.0) — `ChemicalMimeType.InChIAuxInfo` exists
- IUPAC InChI-Web-Demo (GitHub) — feature gap analysis
- InChI OER materials (PMC, DivCHED) — educational context and user expectations
- Tom Ayac blog (2025-03) — `coi-serviceworker` pattern for GitHub Pages

### Tertiary (LOW confidence / needs validation)
- Indigo WASM threading model — inferred from Emscripten build flags; not confirmed for distributed npm binary
- `getInchi(true)` exact return format — documented behavior; separator must be verified against 3.12.0 output
- RC release API changes (3.15.x, 3.16.x) — reviewed but not exhaustively; using 3.12.0 stable avoids this uncertainty

---
*Research completed: 2026-05-18*
*Ready for roadmap: yes*
