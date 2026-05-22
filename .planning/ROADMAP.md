# Roadmap: Explain that InChI

**Milestone:** v1.0
**Created:** 2026-05-18
**Phases:** 6 | **Requirements:** 16

## Phases

- [x] **Phase 1: Scaffold and Ketcher Mount** — Vite + React + TS project running with Ketcher mounted, WASM confirmed working, and design tokens intact (complete 2026-05-19)
- [ ] **Phase 2: Data Pipeline** — Live InChI + AuxInfo parsing producing correct `layers[]` and `auxMap` in state on every draw event
- [ ] **Phase 3: InChI Display and Explanation UI** — Color-coded layer strip, explanation cards, and legend rendered from state; full design fidelity
- [ ] **Phase 4: Hover-to-Highlight Integration** — Hovering a layer or sub-token highlights matching atoms/bonds in the Ketcher canvas
- [ ] **Phase 5: Mapping Strip and Preset Molecules** — Atom-numbering strip and preset molecule list wired to the full draw-to-display pipeline
- [ ] **Phase 6: Shareable URL, Polish, and Deploy** — Production build with URL sharing, graceful error states, and confirmed static deployment

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
- [ ] 02-01-PLAN.md — Vitest config fix + parsing library (parseInchi.ts, parseAuxMapping.ts) + unit test stubs
- [ ] 02-02-PLAN.md — Zustand 5 store with all v1 fields and typed actions
- [ ] 02-03-PLAN.md — App.tsx subscription wiring (debounce + generation guard) + real AuxInfo fixture

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

**Plans**: TBD
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

**Plans**: TBD
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

**Plans**: TBD
**UI hint**: yes

### Phase 6: Shareable URL, Polish, and Deploy

**Goal**: The application is production-ready with URL-encoded molecule state, graceful handling of all edge cases, and a confirmed working static deployment
**Depends on**: Phase 5
**Requirements**: MAP-03, PLSH-01

**Success Criteria** (what must be TRUE):
1. The current molecule structure is encoded in the URL (hash or query param); loading the URL in a new tab restores the same molecule and InChI display
2. An empty canvas or invalid/disconnected structure shows a placeholder message in the InChI display instead of an error or blank space
3. `vite build` produces a clean static bundle; deploying to Netlify or GitHub Pages serves the app with WASM assets loading correctly (no 404s, `crossOriginIsolated` check passes)
4. The WASM loading state (1-3s cold start) shows a visible spinner or skeleton in the editor panel; the rest of the UI is not blocked

**Plans**: TBD
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
| MAP-03 | Phase 6 | Molecule state encoded in URL for bookmarking and sharing |
| PLSH-01 | Phase 6 | Empty/invalid structure shows placeholder, not error |

**Coverage:** 16/16 requirements mapped ✓

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold and Ketcher Mount | 2/2 | Complete | 2026-05-19 |
| 2. Data Pipeline | 0/3 | Not started | - |
| 3. InChI Display and Explanation UI | 0/? | Not started | - |
| 4. Hover-to-Highlight Integration | 0/? | Not started | - |
| 5. Mapping Strip and Preset Molecules | 0/? | Not started | - |
| 6. Shareable URL, Polish, and Deploy | 0/? | Not started | - |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-05-20 — Phase 2 planned (3 plans); ready to execute*
