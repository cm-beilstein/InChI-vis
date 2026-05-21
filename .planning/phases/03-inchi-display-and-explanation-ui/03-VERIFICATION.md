---
phase: 03-inchi-display-and-explanation-ui
verified: 2026-05-21T09:45:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Draw benzene; hover each layer; confirm c-layer reading shows 'C₁–C₂' (not '#1–#2') with IBM Plex Mono at 19px; confirm 160ms transition is perceptible; confirm tooltip slides in on legend row hover"
    expected: "Color-coded InChI strip with per-layer accent colors, explanation card updates on hover, reading-code block uses element labels, legend tooltip slides in, IBM Plex fonts loaded"
    why_human: "Typography (IBM Plex Sans/Serif/Mono confirmed by Network panel), visual transition timings, tooltip slide animation, and pixel-for-pixel design fidelity cannot be verified by grep or TypeScript; SC-5 partially confirmed by checkpoint check 1-5/7 but font load (check 6) was explicitly noted as unconfirmed in 03-05-SUMMARY.md"
---

# Phase 3: InChI Display and Explanation UI — Verification Report

**Phase Goal:** The color-coded InChI strip, explanation cards, and legend are rendered from live state with full design fidelity and correct idle/hover behavior — no Ketcher highlights yet
**Verified:** 2026-05-21T09:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The InChI string is displayed with each layer chunk in its design-token accent color, separated by `/`; sub-spans for formula elements, H-counts, and stereo parities are visible | ✓ VERIFIED | `InchiSection.tsx` renders `inchiSlash` separator and per-layer `var(--c-${swatchVar(l.type)})` inline color. `LayerText.tsx` dispatches to `FormulaText`, `HLayerText`, `ParityText`, `ConnectionText` with EL_CLASS and hydro/parity subtokens. CSS Module has 12+ `[data-layer]` attribute selectors. |
| 2 | Hovering a layer chunk dims all other chunks and updates the left explanation card with the layer's prose description and reading-code block | ✓ VERIFIED | `InchiSection.tsx` applies `styles.dim` (opacity 0.35) to non-hovered layers. `Explanation.tsx` reads `hoverIdx` from store, selects `LAYER_INFO[layer.type]` prose, and calls `readingFor(layer, atomElements)` for the reading-code block via `dangerouslySetInnerHTML`. |
| 3 | The right legend card lists all 11 layer types with color swatches; hovering a row slides in a tooltip with description and example syntax | ✓ VERIFIED | `Legend.tsx` renders `ALL_LAYERS` with 11 entries (confirmed by `grep -c "{ type:" = 11`). `Legend.module.css` has `.legendRow:hover .legendTip` CSS-only tooltip with `transition: opacity 160ms ease, transform 160ms ease`. No `useState` for tooltip visibility. |
| 4 | The idle state (nothing hovered) shows the default explanation card content with no residual hover state from a previous interaction | ✓ VERIFIED | `Explanation.tsx` renders `DEFAULT_INFO.title` ("Hover any layer") and blurb when `hoverIdx === null`. `InchiSection.tsx` `onMouseLeave` calls `setHover(null)` and `setSubHover(null)` to clear residual state. `--accent` always set to `var(--ink-faint)` in idle state. |
| 5 | Typography renders in IBM Plex Sans/Serif/Mono; color tokens, spacing, and hover transition timings (160ms, 4px) match the design handoff | ? UNCERTAIN | CSS modules reference `var(--font-mono)`, `var(--font-sans)`, `var(--font-serif)` throughout. Transition values `160ms ease` on `.inchiLayer` and `120ms` on `.inchiSubtoken` confirmed by grep. Spacing values (`28px 32px`, `22px 24px`, `6px 22px`, `margin-top: 14px`, `gap: 18px`) match handoff exactly. **However**, the 03-05-SUMMARY.md notes that check 6 (IBM Plex font network confirmation) "could not be verified in tester's environment" — the font load itself needs human confirmation in a fresh browser. |

**Score:** 4/5 truths verified (SC-5 partial — CSS correct, font load unconfirmed)

### Deferred Items

None — all Phase 3 success criteria are addressed in this phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/__tests__/layerInfo.test.ts` | Test stubs for layerInfo.ts exports | ✓ VERIFIED | 24 tests across 6 describe blocks; all green |
| `src/lib/__tests__/parseAuxMapping.test.ts` | Extended tests for rA: parsing | ✓ VERIFIED | Contains `parseAtomElements` describe block with 4 tests |
| `src/__tests__/store.test.ts` | Extended store test for atomElements | ✓ VERIFIED | `beforeEach` includes `atomElements: {}`; has `setInchiData with 4 args` test |
| `src/lib/parseAuxMapping.ts` | `parseAtomElements` + extended `parseInchiWithAux` | ✓ VERIFIED | `export function parseAtomElements` at line 49; `atomElements` in return type at line 88 |
| `src/store.ts` | `atomElements` field + 4-arg `setInchiData` | ✓ VERIFIED | Interface line 13, setInchiData line 17, initial state line 33, setter line 36 |
| `src/App.tsx` | `setInchiData` called with `atomElements` | ✓ VERIFIED | 3 call sites: success path line 59, two reset paths lines 56+62 |
| `src/lib/layerInfo.ts` | TypeScript port of layers-info.js; ≥150 lines | ✓ VERIFIED | 298 lines; 12 exports (LAYER_INFO, DEFAULT_INFO, subscript, formulaReading, ELEMENT_NAMES, elementColor, hydroColor, parseStereoParities, parityColor, swatchVar, readingFor, LayerInfoEntry) |
| `src/components/InchiSection.module.css` | CSS Module for InChI strip | ✓ VERIFIED | Contains `inchiLayer`, 27 `var(--` references, `[data-layer]` attribute selectors, verbatim transition values |
| `src/components/LayerText.tsx` | Sub-token renderers | ✓ VERIFIED | Exports `LayerText`; contains `EL_CLASS` static lookup; `setSubHover` wired via `subHoverProps` |
| `src/components/InchiSection.tsx` | InChI strip component | ✓ VERIFIED | Exports `InchiSection`; reads from `useInchiStore`; sets `data-layer`; `onMouseLeave` clears hover |
| `src/components/Explanation.tsx` | Left explanation card | ✓ VERIFIED | Exports `Explanation`; `dangerouslySetInnerHTML` for reading-code; `--accent` always set; renders `DEFAULT_INFO` in idle |
| `src/components/Explanation.module.css` | CSS Module for explanation card | ✓ VERIFIED | Contains `.card`, `overflow: visible` on `.legendCard`, `transition: background 200ms` on `::before`, `@media (max-width: 900px)` |
| `src/components/Legend.tsx` | Right legend card | ✓ VERIFIED | Exports `Legend`; 11-entry `ALL_LAYERS`; no `useState`; `swatchVar` for swatch colors |
| `src/components/Legend.module.css` | CSS Module for legend card | ✓ VERIFIED | `.legendRow:hover .legendTip` CSS-only trigger; `transition: opacity 160ms ease, transform 160ms ease`; tooltip arrow via `::after` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/App.tsx` | `src/store.ts` | `setInchiData(result.inchi, result.layers, result.auxMap, result.atomElements)` | ✓ WIRED | Line 59 confirmed; both reset paths also pass 4 args |
| `src/lib/parseAuxMapping.ts` | `rA:` field in AuxInfo | `parseAtomElements` | ✓ WIRED | Parses `/`-split body, finds `rA:` part, extracts atom count + greedy 2-char symbols |
| `src/components/InchiSection.tsx` | `src/store.ts` | `useInchiStore(state => state.layers)` | ✓ WIRED | Line 15-16 selectors; `useInchiStore.getState()` for event handlers |
| `src/components/InchiSection.tsx` | `src/components/LayerText.tsx` | `<LayerText layer={l} />` | ✓ WIRED | Line 11 import; used in render loop |
| `src/components/InchiSection.module.css` | `src/styles.css` | `var(--token)` references | ✓ WIRED | 27 `var(--` references consume CSS custom properties from design token system |
| `src/components/Explanation.tsx` | `src/lib/layerInfo.ts` | `import { LAYER_INFO, DEFAULT_INFO, readingFor, swatchVar }` | ✓ WIRED | Line 9 import confirmed |
| `src/components/Legend.tsx` | `src/lib/layerInfo.ts` | `import { LAYER_INFO, swatchVar }` | ✓ WIRED | Line 7 import confirmed |
| `src/App.tsx` | `src/components/InchiSection.tsx` | `<InchiSection />` | ✓ WIRED | Line 6 import; line 86 usage |
| `src/App.tsx` | `src/components/Explanation.tsx` | `<Explanation />` | ✓ WIRED | Line 7 import; line 87 usage |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Explanation.tsx` | `atomElements` | `useInchiStore(state => state.atomElements)` → set by `setInchiData(…, result.atomElements)` → `parseAtomElements(auxBody)` from WASM AuxInfo | Yes — `parseAtomElements` reads `rA:` field from real WASM output; not a static fallback | ✓ FLOWING |
| `Explanation.tsx` | `layer` (hoverIdx) | `useInchiStore(state => state.hoverIdx)` → set by `setHover(i)` on `InchiSection` hover | Yes — event-driven from user interaction | ✓ FLOWING |
| `Legend.tsx` | `presentTypes` | `useInchiStore(state => state.layers)` → set by `setInchiData` from WASM pipeline | Yes — same pipeline as Phase 2 | ✓ FLOWING |
| `InchiSection.tsx` | `layers` | `useInchiStore(state => state.layers)` → populated by Phase 2 data pipeline | Yes — real WASM InChI output | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 302 tests pass | `npx vitest run` | 302 passed (22 test files) | ✓ PASS |
| TypeScript clean | `npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| `layerInfo.ts` exports ≥11 symbols | `grep -c "^export" src/lib/layerInfo.ts` | 12 exports | ✓ PASS |
| `ALL_LAYERS` has 11 entries | `grep -c "{ type:" src/components/Legend.tsx` | 11 | ✓ PASS |
| No `useState` for legend tooltip | `grep "useState" src/components/Legend.tsx` | No matches | ✓ PASS |
| EL_CLASS static lookup present | `grep "EL_CLASS" src/components/LayerText.tsx` | Static `Record<string, string>` confirmed | ✓ PASS |
| IBM Plex font rendering in browser | Browser DevTools Network tab | SKIP — requires running browser | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| INCHI-02 | 03-01, 03-02, 03-03, 03-04 | Each InChI layer chunk rendered in design-token accent color, separated by `/`, with sub-spans | ✓ SATISFIED | `InchiSection.tsx` renders per-layer accent color via `swatchVar`; `LayerText.tsx` provides FormulaText/ConnectionText/HLayerText/ParityText sub-renders; CSS Module has `[data-layer]` selectors for sub-span styling |
| EXPL-01 | 03-03, 03-05 | Left explanation card: prose description + reading-code on hover | ✓ SATISFIED | `Explanation.tsx` renders `LAYER_INFO[layer.type]` prose and `readingFor(layer, atomElements)` HTML via `dangerouslySetInnerHTML`; both idle and active states implemented |
| EXPL-02 | 03-05 | Right legend card: 11 layer types with color swatches; tooltip on row hover | ✓ SATISFIED | `Legend.tsx` with 11 `ALL_LAYERS` entries; CSS-only tooltip via `.legendRow:hover .legendTip`; swatches use `swatchVar` color tokens |
| EXPL-03 | 03-01, 03-03, 03-05 | Idle state shows default explanation card content | ✓ SATISFIED | `Explanation.tsx` renders `DEFAULT_INFO.title` ("Hover any layer") when `hoverIdx === null`; `onMouseLeave` on InchiSection clears hover state |
| PLSH-03 | 03-04, 03-05 | Typography, color tokens, spacing, hover transitions match design handoff | PARTIAL — CSS confirmed; font load needs human | CSS Modules use `var(--font-mono/sans/serif)` tokens; transition values `160ms ease` and `120ms` confirmed verbatim; spacing values match handoff; IBM Plex font rendering requires browser confirmation |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/InchiSection.tsx` | 21 | `return null` | ℹ️ Info | Intentional empty-canvas guard — `if (layers.length === 0) return null;`. Not a stub; correct behavior per SC-1 (nothing shown on empty canvas). |

No blocking stubs, placeholder comments, or disconnected data paths found.

### Human Verification Required

#### 1. IBM Plex Font Rendering + Visual Design Fidelity

**Test:** Run `npm run dev`, open browser, draw benzene (6-membered ring). In DevTools Network tab, filter by "plex" or "font" to confirm IBM Plex Sans, Mono, and Serif font files are loaded. Then inspect the InChI display area: confirm 19px IBM Plex Mono, the explanation card title in IBM Plex Serif, and the body in IBM Plex Sans.

**Expected:**
- Network panel shows IBM Plex font requests loading successfully (not 404)
- InChI strip renders at `font-size: 19px` in IBM Plex Mono; section label at 10.5px
- Explanation card title renders in IBM Plex Serif at 26px
- Explanation body renders in IBM Plex Sans at 14.5px
- Hover transition on layer chips is visually perceptible at ~160ms (not instantaneous, not laggy)
- Legend tooltip slides in from right with translateX 4px → 0 animation (~160ms)

**Why human:** The CSS font references (`var(--font-mono)`, etc.) resolve only at runtime when the font files are actually served. The CSS tokens are correct but `@font-face` declarations in `styles.css` must load successfully. The 03-05-SUMMARY explicitly noted check 6 (font network confirmation) was unverifiable in the tester's environment. Visual animation timing and pixel accuracy cannot be asserted by grep or TypeScript.

### Gaps Summary

No gaps found. All 5 plans executed correctly — test files, data layer, layerInfo port, InChI strip components, and explanation/legend cards are all substantively implemented and wired. The single human verification item is about runtime font loading confirmation, which cannot be checked statically.

---

_Verified: 2026-05-21T09:45:00Z_
_Verifier: Claude (gsd-verifier)_
