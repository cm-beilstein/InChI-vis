# Phase 8: Hydrogen Implicit & Explicit Highlight - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every hydrogen sub-token in the h-layer interactive with per-group granularity:

1. **Sub-token splitting** — Break the h-layer text (e.g. `1-6H,7H2,(H,3,4)`) into individually hoverable spans per comma-separated group.
2. **Implicit H badge** — When hovering a fixed-H sub-token (e.g. `7H2`), overlay a small `H2` SVG text badge above each affected heavy atom in the Ketcher canvas, in addition to highlighting the atom.
3. **Explicit H bond highlight** — When hovering a sub-token that maps to an explicit H atom drawn in the canvas, highlight both the H atom, the heavy atom it bonds to, AND the bond between them.
4. **Mobile H sub-token** — Hovering a `(H,3,4)` tautomeric group highlights all candidate atoms simultaneously in `--c-hydro-mobile`.

Not in scope: per-atom expansion of ranges (e.g. expanding `1-6H` into 6 individual spans), animated tautomer effects, or any changes to the c/t/b/q layers.

</domain>

<decisions>
## Implementation Decisions

### Implicit H visualization
- **D-01:** When hovering a fixed-H sub-token (e.g. `1-6H`, `7H2`), render an SVG `<text>` badge above each corresponding heavy atom showing the H count (`H`, `H2`, `H3`, etc.). Badge appears on hover-in and is removed on hover-out — same lifecycle as highlights. The badge is injected into the Ketcher SVG canvas using the existing `whiteAtomLabels()` / SVG-manipulation pattern already in `useKetcherHighlights.ts`.
- **D-02:** Badge text format: `H` for count=1, `H2` for count=2, etc. Position: above the atom's center point, small font, using the h-layer accent color. Exact positioning and font size are at Claude's discretion — match the visual weight of the atom labels already in the canvas.
- **D-03:** The badge is a separate SVG injection step after `highlights.create()` — it does not modify `HighlightSpec` objects. The cleanup step removes all badge elements by a data attribute (e.g. `data-h-badge="true"`) on mouse-out.

### Sub-token granularity
- **D-04:** The h-layer text is split into per-comma-group spans: each group (e.g. `1-6H`, `7H2`, `(H,3,4)`) becomes its own independently hoverable `<span>` in the InchiSection strip. This requires a new `HLayerText` sub-token component (analogous to `FormulaText`, `ParityText`, etc. already in InchiSection).
- **D-05:** Sub-hover kind for h-layer tokens: `{ kind: 'hAtoms', atoms: number[], count: number }` for fixed-H groups, `{ kind: 'mobileH', atoms: number[] }` for tautomeric groups. These extend the existing `SubHover` union type in the store.
- **D-06:** The whole-h-layer hover (no sub-token selected) retains its current behavior — highlights all H-bearing heavy atoms color-coded by count. Sub-token hover overrides this with the targeted group.

### Explicit H bond highlight
- **D-07:** When a sub-token maps to an explicit H atom in the canvas (i.e. the canonical index is in `hAtomPoolIds` mapping), the highlight spec includes: the H atom pool ID, the heavy atom pool ID, and the bond ID between them. Bond lookup uses the Ketcher molecule struct (`render.ctab.molecule.bonds`) — same approach as the c-layer bond highlight.
- **D-08:** The researcher must verify how to reliably map an explicit H pool ID back to its bonded heavy atom and bond ID from the Ketcher render struct. This is a **research flag** — bond iteration is already done for the c-layer, so the pattern exists.

### Mobile H groups
- **D-09:** Hovering a `(H,3,4)` tautomeric group sub-token highlights all listed candidate atoms simultaneously using `--c-hydro-mobile`. No special animation or dashed border — plain fill highlight consistent with existing mobile-H behavior in the whole-layer case.

### Claude's Discretion
- Exact SVG badge font size, vertical offset, and color (match existing atom label visual weight)
- Whether to extract badge injection into a named helper function (e.g. `renderHBadges()`) alongside the existing `whiteAtomLabels()`
- CSS class naming for the new `HLayerText` component spans

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing h-layer implementation (files that change in Phase 8)
- `src/lib/parseInchi.ts` — `parseHydrogenAtoms()` (line 98), `parseMobileHydrogens()` (line 126): both already implemented and tested; Phase 8 uses their output for sub-token splitting
- `src/lib/highlightUtils.ts` — `case 'h':` in `buildHighlightSpecs` (line 132): current whole-layer highlight logic; Phase 8 extends this with sub-token override via `buildSubHoverSpecs`
- `src/lib/highlightUtils.ts` — `buildSubHoverSpecs` (line 263): existing `case 'element': el: 'H'` handler; Phase 8 adds `case 'hAtoms':` and `case 'mobileH':` cases
- `src/components/InchiSection.tsx` — existing `FormulaText`, `HLayerText`, `ParityText` sub-token components: Phase 8 adds a new `HGroupText` component following the same pattern
- `src/hooks/useKetcherHighlights.ts` — `whiteAtomLabels()` (SVG injection helper): the H-count badge uses the same SVG injection pattern; the cleanup must also remove badge elements

### Existing H infrastructure (no logic change needed, but context required)
- `src/store.ts` — `hAtomPoolIds: number[]` field (Phase 6): pool IDs of explicit H atoms collected from `render.ctab.molecule.atoms`; Phase 8 uses this to detect explicit H for bond-highlight path
- `src/App.tsx` lines 98–103 — `hAtomPoolIds` collection loop: model for how to read atom labels from Ketcher struct; Phase 8 bond lookup follows same `render.ctab.molecule` access pattern

### SubHover type extension
- `src/store.ts` — `SubHover` union type: Phase 8 adds `{ kind: 'hAtoms'; atoms: number[]; count: number }` and `{ kind: 'mobileH'; atoms: number[] }` variants (D-05)

### Design handoff (prior phase reference)
- `design_handoff_explain_that_inchi/canvas.jsx` — `showHydrogenHalo` pattern: reference for how the design handoff expects H-layer hover to look

### Project planning
- `.planning/REQUIREMENTS.md` — no existing requirement covers this; Phase 8 adds new requirement INCHI-08
- `.planning/ROADMAP.md` — Phase 8 is new; must be appended

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `whiteAtomLabels(svgRoot, specs)` in `useKetcherHighlights.ts` — SVG text injection pattern; H-count badge reuses the same DOM-injection approach with a `data-h-badge` attribute for targeted cleanup
- `parseHydrogenAtoms(text)` in `parseInchi.ts` — returns `Record<canonicalIndex, hCount>`; drives sub-token splitting and badge text
- `parseMobileHydrogens(text)` in `parseInchi.ts` — returns flat atom number array; drives mobile-H sub-token
- `hydroColor(count)` in `highlightUtils.ts` — maps H count to CSS var; already used in the whole-layer case; reused per-group in sub-token case
- `expandLayerText(text)` in `highlightUtils.ts` — handles multi-fragment h-layer splitting; sub-token logic must run after this expansion

### Established Patterns
- Sub-token components (`FormulaText`, `ParityText`): each maps layer text → array of `<span>` with `onMouseEnter`/`onMouseLeave` setting sub-hover state; `HGroupText` follows exactly this pattern
- `SubHover` union in store: adding new kinds requires updating the union type + `buildSubHoverSpecs` switch + the component that emits the event
- SVG badge cleanup: must use a data attribute selector (e.g. `[data-h-badge]`) and remove on every hover-out — same as `whiteAtomLabels` cleanup which removes by `data-white-label`

### Integration Points
- `src/store.ts` — add `hAtoms` and `mobileH` to `SubHover` union
- `src/lib/highlightUtils.ts` — add `case 'hAtoms':` and `case 'mobileH':` to `buildSubHoverSpecs`; add H bond lookup for explicit H path
- `src/components/InchiSection.tsx` — replace current h-layer plain text with `<HGroupText>` component
- `src/hooks/useKetcherHighlights.ts` — add H-count badge injection step after `highlights.create()`; add badge cleanup in the `finally` / hover-out path

</code_context>

<specifics>
## Specific Requirements

- Badge text: `H` (count=1), `H2`, `H3`, etc. — positioned above the atom in the h-layer accent color
- Badge lifetime: exactly matches highlight lifetime — injected after `highlights.create()`, removed on hover-out (in the same cleanup path as `whiteAtomLabels`)
- Sub-token granularity: per comma-separated group (not per individual atom)
- Explicit H: highlight atom + heavy atom + bond between them (all three)
- Mobile H: highlight all candidate atoms in `--c-hydro-mobile`, no animation

</specifics>

<deferred>
## Deferred Ideas

- Per-atom expansion of ranges (e.g. `1-6H` → 6 individually hoverable `1H`, `2H`, ... spans) — too wide for large molecules
- Animated / dashed-border tautomer visualization — scope creep; plain fill is sufficient
- Shareable URL (MAP-03) — previously deferred to v2

</deferred>

---

*Phase: 08-hydrogen-implicit-explicit-highlight*
*Context gathered: 2026-06-05*
