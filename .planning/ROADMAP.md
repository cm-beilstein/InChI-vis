# Roadmap: Explain that InChI

**Milestone:** v1.0
**Created:** 2026-05-18
**Phases:** 7 | **Requirements:** 19

## Phases

- [x] **Phase 1: Scaffold and Ketcher Mount** — Vite + React + TS project running with Ketcher mounted, WASM confirmed working, and design tokens intact (complete 2026-05-19)
- [x] **Phase 2: Data Pipeline** — Live InChI + AuxInfo parsing producing correct `layers[]` and `auxMap` in state on every draw event (complete 2026-05-20)
- [x] **Phase 3: InChI Display and Explanation UI** — Color-coded layer strip, explanation cards, and legend rendered from state; full design fidelity (complete 2026-05-21)
- [x] **Phase 4: Hover-to-Highlight Integration** — Hovering a layer or sub-token highlights matching atoms/bonds in the Ketcher canvas (complete 2026-05-22)
- [x] **Phase 5: Mapping Strip and Preset Molecules** — Atom-numbering strip and preset molecule list wired to the full draw-to-display pipeline (complete 2026-05-22)
- [x] **Phase 6: Hydrogen Highlight, Polish, and Deploy** — Hovering H sub-token highlights explicit hydrogens; empty-canvas placeholder; static build deployed (complete 2026-06-01)
- [x] **Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy** — Correct highlight mapping for multi-fragment molecules; p-layer protonation site highlighting; copy-to-clipboard button (complete 2026-06-01)

## Phase Details

### Phase 1: Scaffold and Ketcher Mount

**Goal**: The project builds and runs with Ketcher mounted, `getInchi()` returning a string, `highlights.create` confirmed callable, and design tokens unaffected by Ketcher CSS
**Depends on**: Nothing (first phase)
**Requirements**: EDIT-01, PLSH-02

**Success Criteria** (what must be TRUE):
1. `npm run dev` starts without errors; browser shows the Ketcher editor mounted in the page
2. Drawing any molecule in the editor and calling `getInchi()` from the browser console returns a valid InChI string
3. `highlights.create` can be called from the console without throwing; at least one atom changes color
4. CSS custom properties from `styles.css` (e.g. `--color-formula`) resolve correctly and are not overridden by Ketcher's stylesheet
5. `vite build && vite preview` completes without WASM or worker 404 errors

**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Vite config, deps, design tokens, coi-serviceworker, HTML entry (complete 2026-05-19)
- [x] 01-02-PLAN.md — React shell: App, Header, KetcherPanel with real Editor and loading overlay (complete 2026-05-19)

**UI hint**: yes

### Phase 2: Data Pipeline

**Goal**: Every draw event produces correctly-shaped `layers[]` and `auxMap` in React state, verified by unit tests against real Ketcher 3.12.0 output
**Depends on**: Phase 1
**Requirements**: INCHI-01

**Success Criteria** (what must be TRUE):
1. Drawing a molecule and pausing produces an updated InChI string in the React dev tools state within 150ms of the last change
2. `auxMap` in state contains a correct canonical-to-Ketcher index mapping (verifiable by console inspection for a known molecule)
3. `parseAuxMapping` has a passing unit test using captured real `getInchi(true)` output from Ketcher 3.12.0
4. Drawing then rapidly erasing atoms does not produce stale or mismatched `layers`/`auxMap` pairs; state always reflects the current structure
5. An empty or disconnected canvas produces no thrown exception; `layers` is an empty array and `auxMap` is empty

**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Vitest config fix + parsing library (parseInchi.ts, parseAuxMapping.ts) + unit test stubs (complete 2026-05-20)
- [x] 02-02-PLAN.md — Zustand 5 store with all v1 fields and typed actions (complete 2026-05-20)
- [x] 02-03-PLAN.md — App.tsx subscription wiring (debounce + generation guard) + real AuxInfo fixture (complete 2026-05-20)

**UI hint**: no

### Phase 3: InChI Display and Explanation UI

**Goal**: The color-coded InChI strip, explanation cards, and legend are rendered from live state with full design fidelity and correct idle/hover behavior — no Ketcher highlights yet
**Depends on**: Phase 2
**Requirements**: INCHI-02, EXPL-01, EXPL-02, EXPL-03, PLSH-03

**Success Criteria** (what must be TRUE):
1. The InChI string is displayed with each layer chunk in its design-token accent color, separated by `/`; sub-spans for formula elements, H-counts, and stereo parities are visible
2. Hovering a layer chunk dims all other chunks and updates the left explanation card with the layer's prose description and reading-code block
3. The right legend card lists all 11 layer types with color swatches; hovering a row slides in a tooltip with description and example syntax
4. The idle state (nothing hovered) shows the default explanation card content with no residual hover state from a previous interaction
5. Typography renders in IBM Plex Sans/Serif/Mono; color tokens, spacing, and hover transition timings (160ms, 4px) match the design handoff

**Plans**: 5 plans

Plans:
- [x] 03-01-PLAN.md — InChI section layout and layer strip (complete 2026-05-21)
- [x] 03-02-PLAN.md — FormulaText, HLayerText, ParityText, ConnectionText sub-token components (complete 2026-05-21)
- [x] 03-03-PLAN.md — Explanation card and layerInfo prose (complete 2026-05-21)
- [x] 03-04-PLAN.md — Legend card with color swatches and CSS-only tooltips (complete 2026-05-21)
- [x] 03-05-PLAN.md — Idle state, hover transitions, and integration wiring (complete 2026-05-21)

**UI hint**: yes

### Phase 4: Hover-to-Highlight Integration

**Goal**: Hovering a layer chunk or sub-token drives atom and bond highlights in the Ketcher canvas, with sub-token hover overriding layer-wide highlights
**Depends on**: Phase 3
**Requirements**: INCHI-03, INCHI-04

**Success Criteria** (what must be TRUE):
1. Hovering a layer chunk (e.g. the `c` connection layer) highlights the corresponding atoms and bonds in the Ketcher canvas in the layer's accent color
2. Moving the cursor off the layer chunk clears all highlights; the canvas returns to its default appearance
3. Hovering a sub-token (element symbol, atom number, parity token, H-group) overrides the layer highlight with a targeted per-atom or per-bond highlight; the layer-wide highlight is fully suppressed
4. Rapidly switching hover between layers does not accumulate stale highlights; each hover event produces a clean highlight state

**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Wave 0 test scaffolding for highlight spec builders (complete 2026-05-21)
- [x] 04-02-PLAN.md — buildHighlightSpecs, buildSubHoverSpecs, useKetcherHighlights hook (complete 2026-05-21)
- [x] 04-03-PLAN.md — Wire useKetcherHighlights into App.tsx + UAT (complete 2026-05-22)

**UI hint**: no

### Phase 5: Mapping Strip and Preset Molecules

**Goal**: The atom-numbering mapping strip renders correct canonical-to-Ketcher index pairs, and loading a preset molecule triggers the full draw-to-display pipeline end-to-end
**Depends on**: Phase 2
**Requirements**: MAP-01, MAP-02, EDIT-02, EDIT-03

**Success Criteria** (what must be TRUE):
1. The mapping strip below the InChI display shows each atom's Ketcher index paired with its canonical InChI index; identity pairs are visually dimmed, divergent pairs are highlighted green
2. Clicking a preset molecule in the sidebar loads it into the canvas and the full pipeline (InChI generation, layer parsing, mapping strip, explanation card) updates correctly within one debounce cycle
3. The canvas overlay shows the current molecule name, molecular formula, and heavy-atom count for both drawn and preset molecules
4. Footnote strip below the mapping strip displays the InChI definition text and the Hover/Click keyboard hint legend

**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — molecules.ts data, deriveMappingPairs, MappingStrip + Footnote components (complete 2026-05-22)
- [x] 05-02-PLAN.md — KetcherPanel 2-column grid layout, canvas overlay, mol-list sidebar (complete 2026-05-22)
- [x] 05-03-PLAN.md — App.tsx wiring: selectedMolId state, handleMolSelect, render MappingStrip + Footnote (complete 2026-05-22)

**UI hint**: yes

### Phase 6: Hydrogen Highlight, Polish, and Deploy

**Goal**: Hovering the H sub-token in the molecular formula highlights explicit hydrogens in the Ketcher canvas; the app handles edge cases gracefully and deploys cleanly as a static build
**Depends on**: Phase 5
**Requirements**: INCHI-05, PLSH-01

**Success Criteria** (what must be TRUE):
1. When explicit hydrogens are shown in the canvas and the user hovers the H sub-token in the molecular formula layer, the hydrogen atoms are highlighted in the Ketcher canvas
2. An empty canvas or invalid/disconnected structure shows a placeholder message in the InChI display instead of an error or blank space
3. `vite build` produces a clean static bundle; deploying to Netlify or GitHub Pages serves the app with WASM assets loading correctly (no 404s, `crossOriginIsolated` check passes)
4. The WASM loading state (1-3s cold start) shows a visible spinner or skeleton in the editor panel; the rest of the UI is not blocked

**Plans**: 4 plans

Plans:
- [ ] 06-00-PLAN.md — Wave 0 test stubs: InchiSection empty-state tests (PLSH-01) + highlightUtils H-branch tests (INCHI-05)
- [ ] 06-01-PLAN.md — INCHI-05: hAtomPoolIds store field, App.tsx H pool collection, highlightUtils H-branch, useKetcherHighlights threading
- [ ] 06-02-PLAN.md — PLSH-01: InchiSection empty-state render + CSS; Footnote removed from App.tsx (D-03)
- [ ] 06-03-PLAN.md — Deploy: GitHub Actions workflow (.github/workflows/deploy.yml) + README.md

**UI hint**: no

### Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy

**Goal**: Hovering C-layer or formula layer tokens for multi-fragment molecules (e.g. `InChI=1S/C7H8.C6H6/...`) highlights the correct atoms; hovering `p+N` highlights the protonation-site atoms; a copy-to-clipboard button appears at the end of the InChI strip — all guarded by unit tests
**Depends on**: Phase 6
**Requirements**: INCHI-06, INCHI-07, PLSH-04

**Success Criteria** (what must be TRUE):
1. For `InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H`, hovering the formula layer highlights all 13 heavy atoms; hovering the `c` layer highlights the correct bonds and atoms for both fragments independently
2. For `InChI=1S/C17H14N2/...p+1`, hovering the `p` layer highlights all heteroatom (non-C, non-H) atoms from the formula — the q-layer stores only a single net-charge integer and cannot identify per-atom protonation sites
3. A copy icon appears at the right end of the InChI display box; clicking it copies the verbatim InChI string to the clipboard and shows a brief "Copied!" confirmation
4. All existing highlight tests continue to pass; new unit tests cover multi-fragment `parseAuxMapping`, multi-fragment `enrichLayers`, and `buildHighlightSpecs` for the `p` layer type

**Plans**: 3 plans

Plans:
- [x] 07-00-PLAN.md — Wave 0 RED test stubs: multi-fragment parseAuxMapping + enrichLayers (INCHI-06), p-layer highlight (INCHI-07), copy button (PLSH-04) (complete 2026-06-01)
- [x] 07-01-PLAN.md — INCHI-06: fix parseAuxMapping fragment offset + fix enrichLayers c/h/t/b per-fragment parsing (complete 2026-06-01)
- [x] 07-02-PLAN.md — INCHI-07: p-layer case in buildHighlightSpecs; PLSH-04: copy button in InchiSection (complete 2026-06-01)

**UI hint**: no

## Requirement Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| EDIT-01 | Phase 1 | Embedded Ketcher standalone editor, no backend |
| PLSH-02 | Phase 1 | WASM initialisation loading state shown until Ketcher is ready |
| INCHI-01 | Phase 2 | Live InChI generation, debounced ≤150ms, WASM-based |
| INCHI-02 | Phase 3 | Color-coded layer chunks with sub-spans per design tokens |
| EXPL-01 | Phase 3 | Left explanation card: prose + reading-code on hover |
| EXPL-02 | Phase 3 | Right legend card: 11 layer types, color swatches, tooltips |
| EXPL-03 | Phase 3 | Idle state shows default explanation card content |
| PLSH-03 | Phase 3 | Typography, color tokens, spacing, hover transitions match handoff |
| INCHI-03 | Phase 4 | Layer hover highlights matching atoms/bonds in Ketcher canvas |
| INCHI-04 | Phase 4 | Sub-token hover overrides layer highlight with targeted highlight |
| MAP-01 | Phase 5 | Mapping strip: Ketcher index → canonical index; identity dimmed, divergent green |
| MAP-02 | Phase 5 | Footnote strip: InChI definition + keyboard hint legend |
| EDIT-02 | Phase 5 | Preset molecule list loads molecule into canvas on click |
| EDIT-03 | Phase 5 | Canvas overlay: molecule name, formula, heavy-atom count |
| INCHI-05 | Phase 6 | Hovering H sub-token highlights explicit hydrogen atoms in Ketcher canvas |
| PLSH-01 | Phase 6 | Empty/invalid structure shows placeholder, not error |
| INCHI-06 | Phase 7 | Multi-fragment molecules highlight correct atoms/bonds per fragment on layer hover |
| INCHI-07 | Phase 7 | Hovering p-layer highlights protonation-site atoms (q-layer or heteroatom fallback) |
| PLSH-04 | Phase 7 | Copy-to-clipboard button copies verbatim InChI string with visual confirmation |

**Coverage:** 19/19 requirements mapped ✓

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold and Ketcher Mount | 2/2 | Complete | 2026-05-19 |
| 2. Data Pipeline | 3/3 | Complete | 2026-05-20 |
| 3. InChI Display and Explanation UI | 5/5 | Complete | 2026-05-21 |
| 4. Hover-to-Highlight Integration | 3/3 | Complete | 2026-05-22 |
| 5. Mapping Strip and Preset Molecules | 3/3 | Complete | 2026-05-22 |
| 6. Hydrogen Highlight, Polish, and Deploy | 4/4 | Complete | 2026-06-01 |
| 7. Multi-Fragment Highlighting, p-Layer, and Copy | 3/3 | Complete | 2026-06-01 |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-01 — Phase 7 complete; all 7 phases done, 23/23 plans*
