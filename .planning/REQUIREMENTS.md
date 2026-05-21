# Requirements: Explain that InChI

**Defined:** 2026-05-18
**Core Value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.

## v1 Requirements

### Editor

- [x] **EDIT-01**: User can draw and edit molecules using the embedded Ketcher standalone editor (no backend required) — complete Phase 1
- [ ] **EDIT-02**: User can click a preset molecule row in the sidebar to load it into the canvas
- [ ] **EDIT-03**: Canvas overlay shows the current molecule name, molecular formula, and heavy-atom count

### InChI Display

- [ ] **INCHI-01**: InChI string updates live on every structure change (debounced ≤150ms) using Ketcher's built-in WASM InChI library
- [ ] **INCHI-02**: Each InChI layer chunk is rendered in its design-token accent color, separated by `/`, with sub-spans for formula elements, H-counts, and stereo parities
- [ ] **INCHI-03**: Hovering a layer chunk highlights the matching atoms and bonds in the Ketcher canvas and dims all other layer chunks
- [ ] **INCHI-04**: Hovering a sub-token (element symbol, atom number, parity token, H-group) overrides the layer-wide highlight with a more targeted one, suppressing the layer-wide fallthrough entirely

### Explanation

- [ ] **EXPL-01**: Left explanation card shows the currently hovered layer's prose description and a molecule-specific reading-code block
- [ ] **EXPL-02**: Right legend card lists all 11 InChI layer types with color swatches; hovering a row reveals a tooltip with fuller description and example syntax
- [ ] **EXPL-03**: Idle state (no layer hovered) shows the default explanation card content

### Mapping

- [ ] **MAP-01**: Mapping strip below the InChI display shows each atom's Ketcher index → canonical InChI index; identity pairs are dimmed, divergent pairs are highlighted green
- [ ] **MAP-02**: Footnote strip shows the InChI definition and keyboard hint legend (Hover, Click)
- [ ] **MAP-03**: Current molecule state is encoded in the URL (hash or query param) so the page can be bookmarked and linked

### Polish

- [ ] **PLSH-01**: Empty canvas or invalid/disconnected structure shows a placeholder message in the InChI display instead of an error
- [x] **PLSH-02**: WASM initialisation loading state is shown in the editor panel until Ketcher is ready — complete Phase 1
- [ ] **PLSH-03**: Typography (IBM Plex Sans/Serif/Mono), color tokens, spacing, and hover transitions match the design handoff pixel-for-pixel

## v2 Requirements

### Accessibility

- **ACCS-01**: Full keyboard navigation of the InChI layer display (Tab through layers, Enter to activate hover)
- **ACCS-02**: Screen reader labels on all layer color swatches and legend rows

### Content

- **CONT-01**: Additional preset molecules beyond the 5 in the handoff (e.g. amino acids, common drugs)
- **CONT-02**: Molecule search by name or InChI string to load from a library

### Appearance

- **APPR-01**: Dark mode toggle with adapted design tokens
- **APPR-02**: Print styles for the explanation panel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / Indigo server | ketcher-standalone runs entirely in-browser via WASM |
| User accounts / persistence | Stateless educational tool; URL sharing covers the core use case |
| 3D structure viewer | InChI is a 2D notation; 3D adds scope without illuminating InChI |
| Database / substructure search | Shifts product identity away from the explainer tool |
| Mobile-native app | Web-first; Ketcher canvas is not well-suited to touch input |
| Language localisation | English-only for v1; deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-01 | Phase 1 | Pending |
| PLSH-02 | Phase 1 | Pending |
| INCHI-01 | Phase 2 | Pending |
| INCHI-02 | Phase 3 | Pending |
| EXPL-01 | Phase 3 | Pending |
| EXPL-02 | Phase 3 | Pending |
| EXPL-03 | Phase 3 | Pending |
| PLSH-03 | Phase 3 | Pending |
| INCHI-03 | Phase 4 | Pending |
| INCHI-04 | Phase 4 | Pending |
| MAP-01 | Phase 5 | Pending |
| MAP-02 | Phase 5 | Pending |
| EDIT-02 | Phase 5 | Pending |
| EDIT-03 | Phase 5 | Pending |
| MAP-03 | Phase 6 | Pending |
| PLSH-01 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-18*
*Last updated: 2026-05-18 — traceability confirmed against ROADMAP.md*
