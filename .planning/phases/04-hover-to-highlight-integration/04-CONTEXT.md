# Phase 4: Hover-to-Highlight Integration - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Read `hoverIdx` and `subHover` from the Zustand store (already written by Phase 3 InChI strip components) and translate them into `ketcher.highlights.create()` calls on the Ketcher canvas. Use `auxMap` to map canonical atom indices → Ketcher 0-based draw-order indices. Use `layer.atoms[]` and `layer.bonds[]` (already parsed in Phase 2) as the highlight target sets.

No new store fields. No new parsing logic. No mapping strip (Phase 5). No preset molecules (Phase 5). No URL state (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Non-spatial Layers
- **D-01:** When the user hovers version (`1S`), charge (`q`), or proton (`p`) layers, the Ketcher canvas stays completely unchanged — no highlights are fired. Only the explanation card updates to show the layer description. This matches canvas.jsx's explicit comment: "no canvas highlight (no spatial meaning here)".

### Bond Highlighting
- **D-02:** Follow canvas.jsx high-fidelity exactly — the c-layer (connection) highlights the specific bonds described in the connection text, not just the atom endpoints. All other layers highlight atoms only. The researcher must verify how Ketcher's highlight API exposes bond IDs so that canonical bond pairs from `layer.bonds[]` can be passed correctly.

### Highlight Color Fidelity
- **D-03:** Match canvas.jsx color richness exactly:
  - Formula layer → per-element color via `elementColor(el)` → e.g., `var(--c-formula)` (all atoms get formula color regardless of element, per canvas.jsx `showFormulaHalo` logic)
  - Hydrogen layer → per-H-count shading: `hydroColor(count)` — `hydro1`/`hydro2`/`hydro3`/`hydro4` and `hydro-mobile`
  - Stereo layers (t, b, m, s) → parity color via `parityColor(sign)` for t-layer; `var(--c-stereo)` for others
  - Connection layer → `var(--c-conn)` for both atoms and bonds
  - CSS variables must be resolved to concrete hex/rgba values at runtime using `getComputedStyle(document.documentElement).getPropertyValue('--c-formula')` etc. Do NOT hard-code hex values.

### Stale Highlight Cleanup
- **D-04:** Prefer atomic replace: if the Ketcher `highlights` API supports passing a complete new highlight set that replaces the prior one in a single call, use that approach — no flicker. The researcher must confirm the exact `highlights.create` / `highlights.update` / `highlights.clear` API shape from Ketcher 3.12.0 source or docs. If only clear+create is available, use that as fallback — brief single-frame flicker is acceptable.

### Sub-token Highlight Suppression
- **D-05:** When `subHover` is non-null (user is hovering a specific sub-token), the layer-wide highlight is fully suppressed. Only the sub-token targeted atoms (or bonds) are highlighted. This matches ROADMAP success criterion 3 and canvas.jsx's sub-hover mode.

### Highlight Trigger Architecture
- **D-06:** Claude's discretion — whether to use a `useEffect` in App.tsx subscribing to the store, a standalone `useKetcherHighlights` hook, or a Zustand subscriber outside React. The key constraint: `ketcherRef` is on App.tsx (never in the store), so the highlight call site must have access to both the `Ketcher` instance and the store state.

### Claude's Discretion
- Exact Ketcher `highlights` API shape (researcher must verify from 3.12.0 source/docs)
- Whether bond highlight IDs are 0-based indices or atom-pair tuples in the Ketcher API
- File location for highlight logic (new file vs co-located with App.tsx)
- How to expose `ketcherRef` to the highlight logic if it moves out of App.tsx

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Handoff (primary source of truth for highlight behavior)
- `design_handoff_explain_that_inchi/canvas.jsx` — complete per-layer highlight logic: `subHaloFor()`, `connBondSet`, `hMap`, `mobileSet`, `stereoSet`, `parityMap`, `showFormulaHalo`, `showCanonical`, `hideAllNums`; this is the behavioral spec for Phase 4
- `design_handoff_explain_that_inchi/app.jsx` — `subHoverProps()` helper (lines 131–148), `KetcherPanel` props (`highlightedLayer`, `subHover`), layer-wide suppress logic
- `design_handoff_explain_that_inchi/layers-info.js` — `elementColor()`, `hydroColor()`, `parityColor()` — CSS var token names used by the highlight color system

### Existing Phase Implementation
- `src/store.ts` — `hoverIdx: number | null`, `subHover: SubHover | null`, `auxMap: Record<number, number>`, `setHover`, `setSubHover` — all already defined
- `src/lib/parseInchi.ts` — `Layer`, `SubHover`, `LayerType` types; `layer.atoms[]` (canonical) and `layer.bonds[]` (canonical pairs) fields
- `src/App.tsx` — `ketcherRef` (the `Ketcher` instance handle); highlight calls must have access to this ref
- `src/components/InchiSection.tsx` — already calls `setHover(i)` and `setSubHover(null)` on mouse events; Phase 4 does NOT change InchiSection
- `src/components/LayerText.tsx` — already calls `setSubHover({kind, ...})` via `subHoverProps`; Phase 4 does NOT change LayerText

### Project Planning
- `.planning/REQUIREMENTS.md` — INCHI-03, INCHI-04 are the Phase 4 requirements
- `.planning/phases/02-data-pipeline/02-CONTEXT.md` — D-06 (`layer.atoms[]`/`layer.bonds[]` enriched), D-07 (canonical numbering), D-10 (`auxMap` shape: canonical→Ketcher 0-based)
- `.planning/phases/01-scaffold-and-ketcher-mount/01-CONTEXT.md` — `highlights.create` confirmed callable on the `Ketcher` instance from `onInit`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store.ts` — `useInchiStore` with selectors for `hoverIdx`, `subHover`, `layers`, `auxMap`. Phase 4 subscribes to these (or uses `useInchiStore.subscribe(...)` outside React) to fire highlights.
- `src/App.tsx` — `ketcherRef.current` is the live `Ketcher` instance; `isReady` signals when it's safe to call highlight APIs.
- `design_handoff_explain_that_inchi/layers-info.js` — `elementColor`, `hydroColor`, `parityColor` CSS token name functions are already ported to `src/lib/layerInfo.ts`. Use these to look up which CSS var to resolve.

### Established Patterns
- CSS variable resolution: `getComputedStyle(document.documentElement).getPropertyValue('--token-name').trim()` — standard browser API, no library needed.
- Event subscription: `ketcher.editor.subscribe('change', handler)` pattern already established in App.tsx; highlight calls will likely follow a similar subscription or `useEffect` pattern.
- Store outside-React access: `useInchiStore.getState()` already used in event handlers in InchiSection.tsx — same pattern applies for highlight logic.

### Integration Points
- Phase 4 new code connects at: `ketcherRef.current.highlights` (Ketcher canvas API) and the Zustand store state (`hoverIdx`, `subHover`).
- No modifications needed to: InchiSection.tsx, LayerText.tsx, Explanation.tsx, Legend.tsx, or any Phase 3 components.
- App.tsx will likely gain a `useEffect` or subscription that bridges store state → Ketcher highlight calls.

</code_context>

<specifics>
## Specific Requirements

- Sub-token hover fully suppresses layer-wide highlight — verified by user and in ROADMAP success criterion 3
- CSS vars must be resolved at runtime, not hard-coded to hex
- Atomic highlight replace preferred over clear+set to avoid flicker; researcher must confirm what the Ketcher 3.12.0 `highlights` API supports
- Version/charge/proton layers: explanation card updates but canvas is untouched

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-hover-to-highlight-integration*
*Context gathered: 2026-05-21*
