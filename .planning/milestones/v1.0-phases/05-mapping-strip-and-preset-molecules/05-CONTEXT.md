# Phase 5: Mapping Strip and Preset Molecules - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement three independent UI features on top of the existing Phase 2-4 pipeline:

1. **MappingStrip**: A read-only display strip showing each atom's Ketcher draw-order rank → canonical InChI index, with identity pairs dimmed and divergent pairs highlighted green. Reads from the existing Zustand store.
2. **Footnote**: A static strip below MappingStrip with InChI definition text and keyboard hint legend.
3. **Preset molecule list**: A sidebar in KetcherPanel allowing users to click a preset name to fetch and load it from PubChem. The active preset's name is shown in the canvas overlay.

No new store fields needed. No new parsing logic needed. No URL state (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Preset Molecule Set
- **D-01:** Include all 10 molecules from the design handoff: Methane, Ethanol, Benzene, Acetic acid, L-Alanine, Vanillin, Caffeine, (S)-Nicotine, Melatonin, Naloxone. The roadmap says "5 presets" but the design handoff has 10 — use all 10.

### Preset Molecule Format
- **D-02:** Fetch from PubChem REST API at click time. Use the SDF endpoint: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/SDF`. PubChem supports CORS so browser fetch works. Pass the SDF string directly to `ketcher.setMolecule()`. No hardcoded MOL/SMILES in source.
- **D-03:** Use specific PubChem CIDs (not name-based lookup) to guarantee correct stereoisomers for L-Alanine, (S)-Nicotine, etc. The researcher MUST verify the correct CIDs for all 10 molecules and confirm each SDF is the intended stereoisomer. Suspected CIDs to verify: Methane=297, Ethanol=702, Benzene=241, Acetic acid=176, L-Alanine=5950, Vanillin=1183, Caffeine=2519, (S)-Nicotine=89594, Melatonin=896, Naloxone=5284596.
- **D-04:** Loading state: while a PubChem fetch is in-flight, disable all preset buttons (or show a spinner on the active one) to prevent concurrent fetches. On network failure, log to console and leave the current canvas unchanged.

### Active Preset State
- **D-05:** `selectedMolId: string | null` lives in App.tsx as `useState`. No Zustand store change needed. App.tsx passes `selectedMolId` down to KetcherPanel (for the mol-list active state and canvas overlay name).

### Canvas Overlay Content
- **D-06:** The overlay is always visible (when canvas is non-empty). Content:
  - **Preset active**: show name (from the selected preset metadata) + formula (from `layers[0].text`) + heavy-atom count (`Object.keys(atomElements).length`)
  - **User-drawn (no preset selected)**: show formula + count only — no name field rendered.
  - **Empty canvas**: hide overlay entirely (guard: `layers.length === 0`).

### Mapping Strip Data Derivation
- **D-07:** MappingStrip reads `auxMap` (canonical → Ketcher pool ID) and `atomElements` (canonical → element symbol) directly from the Zustand store. No new store field needed. To derive display pairs:
  1. Collect all pool ID values: `const poolIds = Object.values(auxMap).sort((a,b) => a-b)` — pool IDs are monotonically assigned in draw order, so sorted order = draw order.
  2. For each canonical atom c: `ketcherRank = poolIds.indexOf(auxMap[c]) + 1`, `canonical = c`, `el = atomElements[c]`.
  3. Sort pairs by `ketcherRank` ascending for natural left-to-right reading order.
  - Identity pair: `ketcherRank === canonical` → dimmed CSS class.
  - Divergent pair: `ketcherRank !== canonical` → green highlight CSS class.

### Non-spatial Layer Guard
- **D-08:** MappingStrip renders an empty state (or nothing) when `Object.keys(auxMap).length === 0` (empty canvas).

### Layout / Component Placement
- **D-09:** Component hierarchy in App.tsx: `<KetcherPanel>` (with mol-list sidebar + canvas overlay) → `<InchiSection>` → `<MappingStrip>` → `<Footnote>` → `<Explanation>`. MappingStrip and Footnote are new sibling components rendered between InchiSection and Explanation.

### Typography Weights (Design-Handoff Waiver)
- **D-10:** The mapping strip and mol-list use three font weights (400 regular, 500 medium, 600 semibold), all locked from `src/styles.css` / the canonical design handoff. Weight 400 = base text; weight 500 = interactive/label emphasis (`.pair .k`, `.mol-name`); weight 600 = canonical index emphasis (`.pair .c`). Collapsing any two weights would break the established typographic hierarchy in the pair chip display. The 2-weight UI checker rule is waived for this phase — all three weights are pre-existing committed values in the design token file, not new decisions.

### Spacing Non-Multiples (Design-Handoff Waiver)
- **D-11:** Three spacing values from `src/styles.css` are not multiples of 4: `18px` (`.mapping` padding-inline), `10px` (`.mol-item` padding-block), `14px` (`.canvas-meta` left). All three are pixel-exact values from the committed design handoff. Rounding any to the nearest 4× multiple would visually diverge from the upstream design contract. The 4× spacing rule is waived for these three values — they are locked, not new decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Handoff
- `design_handoff_explain_that_inchi/app.jsx` — `MappingStrip` component (lines ~230–270): exact rendering logic, CSS classes (`pair`, `identity`, `diverges`, `mapping-label`, `pairs`, `k`, `arrow`, `c`, `el`), sort order, identity guard
- `design_handoff_explain_that_inchi/app.jsx` — `Footnote` component: static text, `key-hint` class
- `design_handoff_explain_that_inchi/app.jsx` — `KetcherPanel` component: mol-list sidebar (class `mol-list`, `mol-list-header`, `mol-item`, active state), canvas-meta overlay (class `canvas-meta`, `dot`, `canvas-wrap`)
- `design_handoff_explain_that_inchi/molecules.js` — the 10-molecule `MOLECULES` array: id, name, formula, inchi fields (use for display metadata; ignore atom/bond coordinate data since we fetch from PubChem)
- `design_handoff_explain_that_inchi/styles.css` — CSS classes: `.mapping`, `.mapping-label`, `.pairs`, `.pair`, `.identity`, `.diverges`, `.k`, `.arrow`, `.c`, `.el`, `.footnote`, `.key-hint`, `.mol-list`, `.mol-item`, `.canvas-meta`, `.dot`

### Existing Implementation
- `src/store.ts` — `auxMap: AuxMap` (canonical → pool ID), `atomElements: Record<number, string>`, `layers: Layer[]` — all needed by MappingStrip and canvas overlay
- `src/App.tsx` — `ketcherRef`, `isReady`, `isHighlightingRef`; Phase 5 adds `selectedMolId` state + `handleMolSelect` handler here
- `src/components/KetcherPanel.tsx` — needs new props: `selectedMolId`, `onMolSelect`, `moleculeMetadata` (name/formula/count) for overlay; mol-list sidebar added here

### External APIs
- PubChem REST SDF endpoint: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/SDF`
- PubChem supports CORS — browser fetch is allowed
- Researcher must verify CIDs for all 10 molecules and confirm stereoisomer correctness

### Phase Planning Files
- `.planning/REQUIREMENTS.md` — MAP-01, MAP-02, EDIT-02, EDIT-03 are the Phase 5 requirements
- `.planning/ROADMAP.md` — Phase 5 success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store.ts` — `auxMap`, `atomElements`, `layers` already in store. MappingStrip subscribes to these directly with selectors. No store changes.
- `src/App.tsx` — Pattern: `useState` for local UI state (`isReady` is already there). `selectedMolId` follows the same pattern. `handleMolSelect` is an async function that fetches from PubChem and calls `ketcherRef.current.setMolecule()`.
- `design_handoff_explain_that_inchi/molecules.js` — The 10 `MOLECULES` objects contain `id`, `name`, `formula`, `inchi` fields that can be ported verbatim as a TypeScript constants array. The atom/bond coordinate fields are not needed (discarded — we fetch from PubChem instead).

### Established Patterns
- CSS Modules + CSS custom property tokens: every new component gets its own `.module.css` file.
- Store selectors: `const auxMap = useInchiStore(s => s.auxMap)` — component re-renders only when this slice changes.
- Conditional rendering with `isReady` guard (already in KetcherPanel) — apply same guard for overlay if needed.

### Integration Points
- `handleMolSelect` in App.tsx: fetches PubChem SDF → calls `ketcherRef.current.setMolecule(sdf)`. The existing `handleChange` (subscribed to editor 'change') will fire automatically after setMolecule() updates the canvas — no separate InChI generation call needed.
- MappingStrip is a pure display component. It only reads from the store; it writes nothing.
- KetcherPanel gains a mol-list sidebar and canvas overlay. The `<Editor>` itself does not change (still always rendered, same props).

</code_context>

<specifics>
## Specific Requirements

- MAP-01: Mapping strip renders canonical→Ketcher pairs; identity pairs dimmed; divergent pairs highlighted green
- MAP-02: Footnote strip: InChI definition text + Hover/Click keyboard hint
- EDIT-02: Preset list loads molecule into canvas on click; full pipeline (InChI, layers, mapping) updates
- EDIT-03: Canvas overlay shows molecule name (presets only), formula, heavy-atom count
- All 10 design-handoff molecules included as presets
- PubChem CIDs must be verified by researcher before plan is written
- Loading state during PubChem fetch (disable buttons)
- Graceful error handling on network failure (log, leave canvas unchanged)

</specifics>

<deferred>
## Deferred Ideas

- MAP-03 (shareable URL): deferred to Phase 6 per ROADMAP
- Preset molecule count (roadmap said 5 vs 10): resolved — use all 10 from design handoff

</deferred>

---

*Phase: 05-mapping-strip-and-preset-molecules*
*Context gathered: 2026-05-22*
