# Features Research: Explain that InChI

**Domain:** Interactive chemistry notation explainer / education tool
**Researched:** 2026-05-18
**Research mode:** Ecosystem + Feasibility

---

## Context

This tool occupies a narrow, well-defined niche: it is an *annotation explainer* for a specific notation string (InChI), not a general-purpose structure editor or database browser. The closest analogues in adjacent domains are regex101 (color-coded pattern explanation + live feedback), JSON formatters with tree-view and permalinks, and chemistry tools like MolView, PubChem Sketcher, and the official InChI Web Demo. The design is fully specified; research scope is confirming what must exist vs. what would differentiate.

---

## Table Stakes

Features whose absence causes immediate drop-off or "broken" perception. Every comparable tool provides these.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Live InChI generation from drawn structure | Core loop: draw → see InChI immediately. Any latency breaks the learning connection. | Med | Already specified. WASM via ketcher-standalone; ~150ms debounce. |
| Color-coded layer display | Color-coding per segment is the universal pattern in every notation explainer (regex101, JSON formatters, InChILayersExplorer Excel tool). Monochrome text is unreadable as a learning surface. | Low | Design tokens and layer colors are fully specified and final. |
| Hover → highlight atoms in canvas | The bidirectional link between notation chunk and structure is the entire value proposition. Without it, this is just a colored string. | High | Core interaction; requires aux-info atom mapping. Most complex feature. |
| Per-layer prose explanation | Users expect to understand *why* each segment exists, not just see it colored. InChI OER materials confirm students need layer-level narrative. | Low | `LAYER_INFO` content is final and ships with the design. |
| Preset example molecules | All notation explainers provide worked examples — regex101 has a community library; JSON formatters paste samples; PubChem Sketcher has example queries. 5 presets cover table stakes. | Low | Molecules and molfiles are final in `molecules.js`. |
| Graceful empty/invalid state | Empty canvas or invalid structure must not crash or show raw error. A "draw a molecule to see its InChI" placeholder is the minimum. | Low | Specified in PROJECT.md as an active requirement. |
| Correct layer parsing (all standard layers) | Formula, c, h, b, t, m, s, q, p, i. Users will quickly notice if, say, stereo layers are not explained or highlighted. | Med | Parsers (`parseInchi`, `parseConnectionBonds`, etc.) ship as final code from `molecules.js`. Port as-is. |
| Responsive enough to be usable at desktop widths | Modern web tools are expected to not break at common desktop browser widths. Full mobile optimization is out of scope, but a 1280px viewport must not cause layout overflow. | Low | Design is single-page; CSS variables are specified. |
| No login / no data sent to server | Chemistry users in research contexts are privacy-conscious. The InChI Web Demo explicitly advertises "no data shared with external servers" as a feature. WASM-only is a selling point, not just a constraint. | Low | Already locked in as architecture; static deploy. |

---

## Differentiators

Features that no current InChI-specific tool provides, or where this tool meaningfully exceeds the state of the art.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Sub-token hover (formula element, c-layer atom number, h-group, parity token) | The official InChI Web Demo generates the InChI string but does not explain or highlight individual parts. InChILayersExplorer is a static Excel spreadsheet with 2D/3D rendering but no hover interactivity. No existing browser tool links sub-token hover to atom highlights. | High | Fully specified in design handoff. Requires per-span event handling and multiple concurrent Ketcher highlight groups. |
| Atom-numbering mapping strip (Ketcher index → canonical index) | No existing InChI tool exposes the canonical renumbering. This is invisible to users of every current tool, including PubChem Sketcher and the InChI Web Demo. Showing *why* atom 3 became canonical atom 6 is a genuine teaching moment. | Med | Aux-info `/N:` parsing is specified and code-snippet is provided in handoff. |
| Per-layer reading code (plain-English interpretation of the current molecule's layer) | `readingFor()` from `layers-info.js` generates a natural-language read-out: "C₁–C₂ · C₂–C₄ ...". Regex101 shows this pattern for regex (hover a token → see its plain English), but no InChI tool does it. | Low | Content logic ships with design; complexity is integration, not authoring. |
| Full layer legend with slide-in tooltip blurbs | A persistent reference panel that explains all 11 layer types simultaneously, with richer tooltip detail on hover. The InChILayersExplorer has static column headers; nothing provides an interactive reference this contextual. | Low-Med | Legend content is final in `LAYER_INFO`. Tooltip animation is specified (160ms, 4px slide). |
| Bidirectional color semantics (per-element colors in formula, per-parity in stereo, per-H-count in h-layer) | Most tools use a single color per layer. This tool uses intra-layer color gradations that carry semantic meaning (rose vs. indigo for +/- stereo; lightness ramp for H-count). No existing tool does this. | Med | CSS variables and sub-span rendering are fully specified. |
| Free drawing → explanation (not just lookup by name/SMILES) | PubChem, MolView, and NCI Resolver accept an identifier and return a structure. This tool runs the reverse teaching flow: draw anything → immediately see its InChI annotated. The direction matters for education. | Med | Ketcher embedding is the primary implementation risk. |
| Shareable URL with molecule state | MolView (2024 redesign) and regex101 both support permalink/shareable links. The InChI Web Demo does not. Encoding the current molfile as a URL hash or query param lets educators share "here, look at this molecule's InChI" links. | Med | **Not specified in current PROJECT.md** — treat as a strong v1+ candidate. Adds high value at low marginal cost once the state model exists. |

---

## Anti-Features (deliberately exclude for v1)

Things that would hurt velocity, add maintenance surface, or dilute the focused value proposition.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| 3D molecular viewer | MolView, ChemDoodle, and PubChem already do 3D. Adding a 3D viewer doubles complexity and competes with tools that are better at it. The InChI string is 2D by nature (stereo is encoded in the notation, not a 3D conformer). | Keep Ketcher's 2D editor; the 2D structure is the right pairing for an InChI explainer. |
| Database search / PubChem lookup by name | This is a drawing and explanation tool. Adding a search box shifts the product from "teach me InChI" to "find me a molecule", which is already well-served by PubChem, MolView, and ChemSpider. | The 5 preset molecules cover worked examples; user draws their own for exploration. |
| User accounts / saved sessions | Stateless tools with zero friction have higher educational adoption. Auth adds maintenance cost, privacy obligations, and a signup barrier that kills casual classroom use. | If persistence is needed later, URL-encoded state (shareable link) achieves ~90% of the value with zero backend. |
| Export to MOL/SDF/CDXML file formats | Ketcher supports ~15 export formats. Exposing them adds UI complexity and sets the expectation that this is a structure-drawing tool rather than an explainer. | Ketcher's built-in toolbar gives power users access to export if they need it; no need to surface it prominently. |
| Reaction/multi-component drawing | Reactions require a separate InChI layer (RInChI). Out of scope for the standard InChI explainer and would require separate parser logic, separate UI, and different layer semantics. | Scope to single-molecule standard InChI only. |
| Mobile-first or touch-optimized input | Structure drawing on touch is a hard UX problem (Ketcher's touch support is limited). Optimizing for mobile at v1 would consume significant effort for an audience that primarily uses desktop/laptop for chemistry work. | Responsive enough to not break on tablet; explicitly not touch-optimized. |
| AI/LLM-generated layer explanations | The `LAYER_INFO` content is hand-authored, domain-accurate, and final. LLM-generated explanations would introduce errors in a context where precision matters (InChI layer semantics are exact). | Use the curated `LAYER_INFO` and `readingFor()` content as designed. |
| Inorganics / RInChI support | The InChI standard for inorganics (Inorganic InChI prototype, 2024) is still a prototype. Attempting to handle it in v1 would introduce edge cases in parsing and highlighting. | Scope to organic/standard InChI. Add a graceful message if input produces a non-standard InChI. |

---

## Feature Dependencies

```
Ketcher embedding
  └── Live InChI generation (requires ketcher.getInchi())
        └── InChI parsing (parseInchi → layers[])
              ├── Color-coded layer display (layer type → CSS token)
              │     └── Layer hover → explanation card update
              └── Aux-info parsing (parseAuxMapping → Map<canonical, ketcherIdx>)
                    ├── Layer hover → atom highlights in Ketcher canvas
                    │     └── Sub-token hover → targeted atom highlights (overrides layer-wide)
                    └── Mapping strip rendering (Ketcher→canonical pairs)

Color-coded layer display
  └── Sub-span rendering (FormulaText, ConnectionText, HLayerText, ParityText)
        └── Sub-token hover (finer granularity than layer-level)

Layer hover → explanation card
  └── Layer legend (full legend is always visible; per-layer card updates on hover)
        └── Legend row hover → tooltip slide-in

Preset example molecules
  └── Molecule list UI (click → ketcher.setMolecule() → triggers structure-change pipeline)
        └── [same pipeline as Ketcher embedding above]

Shareable URL (v1+ candidate, not yet in scope)
  └── State model (molfile / inchi / layers in app state)
        └── URL encoding of molfile or InChI
```

**Critical path:** Ketcher embedding → WASM InChI → aux-info parsing. Everything else is blocked on these three working correctly. The atom-mapping pipeline is the highest-risk dependency because Ketcher's `getInchi(true)` API behavior varies across versions.

**Independent of the critical path:** Layer legend, explanation card copy, preset molecule list, and the static CSS/design system can be built in parallel before Ketcher is wired up (using mock data).

---

## Competitive Landscape Summary

| Tool | Draws structures | Generates InChI | Explains layers | Hover highlights | Sub-token hover | Atom mapping strip | Shareable link |
|---|---|---|---|---|---|---|---|
| **This tool** | Yes (Ketcher) | Yes (WASM) | Yes (all layers) | Yes | Yes | Yes | No (v1) |
| InChI Web Demo (IUPAC) | Yes (Ketcher) | Yes | No | No | No | No | No |
| InChILayersExplorer (Excel) | No (paste InChI) | No | Partial (static color) | No | No | No | No |
| PubChem Sketcher | Yes | Yes (output) | No | No | No | No | No |
| MolView (2024) | Yes | Display only | No | No | No | No | Yes |
| regex101 | n/a | n/a | Yes (hover tokens) | n/a | Yes | n/a | Yes |

The gap this tool fills: the InChI Web Demo has the right structure editor and WASM library but provides zero explanation. The InChILayersExplorer has explanation intent but is static (Excel), not interactive, and has no hover-to-highlight. This tool is the first browser-native, fully interactive InChI annotation explainer.

---

## Confidence Assessment

| Area | Confidence | Basis |
|---|---|---|
| Table stakes (live generation, color-coding, hover) | HIGH | Design is final; corroborated by regex101/JSON formatter ecosystem norms |
| Differentiators (sub-token hover, mapping strip) | HIGH | No existing InChI tool found with these features after surveying InChI Trust, PubChem, InChI Web Demo |
| Anti-features (no backend, no auth, no 3D) | HIGH | Confirmed by PROJECT.md constraints + well-established pattern that stateless tools win in education contexts |
| Shareable URL as v1+ candidate | MEDIUM | Pattern is universal in comparable tools (MolView, regex101); not in current spec, would need explicit decision |
| Accessibility requirements | MEDIUM | WCAG 2.1 AA is standard; chemistry tools specifically have poor accessibility track record; Ketcher itself has limited screen-reader support |

---

## Sources consulted

- [IUPAC InChI-Web-Demo (GitHub)](https://github.com/IUPAC-InChI/InChI-Web-Demo)
- [InChI OER — PMC article on education materials](https://pmc.ncbi.nlm.nih.gov/articles/PMC11003456/)
- [InChI OER DivCHED presentation](https://confchem.ccce.divched.org/2020CCCENLP1)
- [MolView features page (2024)](https://molview.com/features/)
- [PubChem Sketcher](https://pubchem.ncbi.nlm.nih.gov//edit3/index.html)
- [regex101 — notation explainer UX reference](https://regex101.com/)
- [regex101 FAQ / permalink patterns](https://github.com/firasdib/Regex101/wiki/FAQ)
- [JSON Formatter with shareable links](https://jsonformatter.org/)
- [Lewis Structure Explorer: Accessible by Design — JChem Ed](https://pubs.acs.org/doi/10.1021/acs.jchemed.4c00187)
- [SVG Accessibility — W3C Wiki](https://www.w3.org/wiki/SVG_Accessibility)
- [Ketcher (EPAM)](https://lifescience.opensource.epam.com/ketcher/)
