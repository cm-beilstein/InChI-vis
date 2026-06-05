# Phase 2: Data Pipeline - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Ketcher's `editor.subscribe('change', handler)` event into a reactive pipeline that calls `getInchi(true)` (with AuxInfo), debounces the result, parses it into `layers[]` and `auxMap`, and stores everything in a Zustand store. Unit test `parseAuxMapping` against captured real Ketcher 3.12.0 output. No UI rendering — this phase is pure data plumbing.

</domain>

<decisions>
## Implementation Decisions

### State Store
- **D-01:** Introduce **Zustand 5** in Phase 2. State has been flat on `App` through Phase 1 (D-15) — Phase 2 is the right moment to introduce it because multiple future components (InchiSection, MappingStrip, Explanation, Phase 4 highlights) will read `layers` and `auxMap`.
- **D-02:** Define **all v1 store fields** now, even if hover fields stay null until Phase 3: `inchi: string`, `layers: Layer[]`, `auxMap: Record<number, number>`, `hoverIdx: number | null`, `subHover: SubHover | null`. No store changes needed in later phases — just actions.
- **D-03:** App's `ketcherRef` stays on `App` as a `useRef` (not in the store) — it's a DOM-level handle, not UI state.

### Debounce Pipeline
- **D-04:** Use **trailing-edge debounce at 150ms** — state updates only after drawing pauses for 150ms. This is the ≤150ms requirement's implementation. Pattern: `setTimeout` / `clearTimeout` inside the subscribe handler.
- **D-05:** Use a **generation counter** (incrementing ref) to ignore stale WASM results. When debounce fires, capture the current generation. After `getInchi(true)` resolves, only apply the result if the generation still matches. This prevents a slow call from a previous draw overwriting a newer state.

### Layer Shape
- **D-06:** `layers[]` is enriched — each layer object holds `{ type, prefix, text, atoms: number[], bonds: number[][] }`. Phase 2 parses each layer's text to extract canonical atom indices (`atoms`) and bond pairs (`bonds`). This is more work in Phase 2 but makes Phase 4 straightforward.
- **D-07:** `layer.atoms[]` uses **canonical (InChI) numbering** (1-based, as they appear in the InChI text). Phase 4 translates via `auxMap` when calling `highlights.create()`. Keeps parsing pure and decoupled from the Ketcher draw order.
- **D-08:** `layer.bonds[]` contains canonical atom-pair tuples `[a, b]` derived from the connection layer. For non-connection layers that don't reference bonds directly, `bonds` is `[]`.
- **D-09:** Parsing functions for each layer type should mirror the design handoff's helpers (`parseConnectionBonds`, `parseHydrogenAtoms`, `parseStereoAtoms`) — port them to TypeScript rather than reinventing.

### `auxMap` Shape
- **D-10:** `auxMap` is `Record<number, number>` — keyed by **canonical** atom index (1-based), value is the **Ketcher** atom index (0-based, as `highlights.create` expects). Derived from the `N:` section of AuxInfo.
- **D-11:** AuxInfo format from `getInchi(true)`: the string is `InChI=...\nAuxInfo=...`. Split on `\nAuxInfo=` to get the two parts. The `N:` field in AuxInfo lists Ketcher draw-order positions in canonical order. Research must verify the exact format against real 3.12.0 output and write a unit test.

### Empty State Behavior
- **D-12:** On empty canvas, store holds: `inchi: ''`, `layers: []`, `auxMap: {}`, hover fields unchanged. No null values — empty arrays/objects everywhere. Components render nothing when `layers.length === 0`.
- **D-13:** Empty-canvas detection happens **after** `getInchi()` — call it, and if the result is `'InChI=1S//'` or equivalent (no formula layer), reset to empty arrays. No pre-call canvas inspection.

### Claude's Discretion
- File location for the Zustand store (e.g. `src/store.ts` or `src/stores/inchi.ts`)
- Whether to use `zustand/middleware` (e.g. `devtools` wrapper for dev) or plain store
- Exact TypeScript types for `Layer`, `SubHover`, `AuxMap`
- Vitest setup and test file location for `parseAuxMapping` unit test
- Whether to export `parseInchi` and `parseAuxMapping` from the same file or separate modules

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Handoff (source of truth for data shapes)
- `design_handoff_explain_that_inchi/molecules.js` — contains `parseInchi()` (target layer shape), `parseConnectionBonds()`, `parseHydrogenAtoms()`, `parseStereoAtoms()`, `parseMobileHydrogens()` — port these to TypeScript
- `design_handoff_explain_that_inchi/app.jsx` — shows how `layers[]` is consumed by `InchiSection`, `MappingStrip`, and `Explanation` — defines what the store must produce

### Project Planning
- `.planning/REQUIREMENTS.md` — INCHI-01 (live InChI, debounced ≤150ms) is the sole Phase 2 requirement
- `.planning/STATE.md` — Research flag: "`getInchi(true)` exact return format — split on `AuxInfo=` prefix; verify against real 3.12.0 output and write unit test"

### Phase 1 Context
- `.planning/phases/01-scaffold-and-ketcher-mount/01-CONTEXT.md` — D-13 through D-15 carry forward; D-15 (flat state on App) is superseded by D-01 above for data state (ketcherRef stays as useRef)

### External
- Ketcher API: `getInchi(withAuxInfo?: boolean): Promise<string>` — `true` overload returns InChI + AuxInfo block; `editor.subscribe('change', handler)` is the change event bus
- Zustand v5 docs: `create()` API — no `combine()` needed for a single store; `zustand/middleware` `devtools` wrapper optional

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/App.tsx` — owns `ketcherRef` (useRef<Ketcher|null>); the subscribe call will go in a `useEffect` that runs once after `isReady` is true
- `window.ketcher` is also set in `handleInit` (added during UAT) — useful for console debugging during Phase 2 development
- `design_handoff_explain_that_inchi/molecules.js` — `parseInchi()`, `parseConnectionBonds()`, `parseHydrogenAtoms()`, `parseStereoAtoms()`, `parseMobileHydrogens()` are ready to port to TypeScript

### Established Patterns
- Component CSS: CSS Modules (`.module.css` collocated with `.tsx`) — no changes needed in Phase 2 (no UI)
- Global styles: `src/styles.css` imported in `main.tsx` — no changes
- Vite config: no changes needed for this phase
- TypeScript: strict mode, `noImplicitAny` — all types must be explicit

### Integration Points
- `src/App.tsx` `handleInit` → fire `useEffect` subscription after `isReady` becomes true
- New `src/store.ts` → imported by `App.tsx` (to dispatch updates) and future Phase 3 components (to read state)
- New `src/lib/parseInchi.ts` (or similar) → pure functions, importable by Vitest unit tests

</code_context>

<specifics>
## Specific Ideas

- The design handoff's `MOLECULES` array shows the expected output shape in concrete terms: `mol.atoms[i].canonical` is what `auxMap` maps to, and `layers[i].atoms` comes from parsing `layers[i].text`
- The AuxInfo `N:` field research flag in STATE.md should be the first thing the researcher verifies — the rest of the parsing plan depends on confirming the format
- Vitest unit test: capture `getInchi(true)` output for at least benzene (a simple molecule with a known canonical permutation), hardcode it in the test, and assert `parseAuxMapping` returns the correct mapping

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-05-20*
