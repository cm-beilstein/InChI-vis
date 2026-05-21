# Explain that InChI

## What This Is

A single-page public web tool for chemists and chemistry students to understand the structure of an InChI (IUPAC International Chemical Identifier) string. Users draw a molecule in an embedded Ketcher editor; the InChI is computed live and displayed below with each layer colour-coded and interactive. Hovering over a layer highlights the corresponding atoms or bonds in the molecule canvas and surfaces a per-layer explanation card.

## Core Value

Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Embed real `ketcher-react` editor with `StandaloneStructServiceProvider` (no backend required)
- [ ] Live InChI generation from Ketcher's current structure via its built-in WASM InChI library
- [ ] Parse aux-info atom mapping (canonical# → Ketcher atom index) from `getInchi(true)`
- [ ] InChI string displayed as clickable, colour-coded layer chunks per the design token system
- [ ] Layer-level hover: highlights matching atoms/bonds in Ketcher canvas, dims other layers, updates explanation card
- [ ] Sub-token hover (formula element, c-layer atom, t/b-layer parity token, h-layer group) with layer-wide suppression
- [ ] Mapping strip: Ketcher → canonical numbering, identity pairs dimmed, divergent pairs highlighted green
- [ ] Explanation panel: left card (current-layer prose + reading code), right card (full layer legend with tooltips)
- [ ] Example molecule list (5 presets) that loads via `ketcher.setMolecule()`
- [ ] Pixel-perfect typography (IBM Plex Sans/Serif/Mono), colour tokens, and layout from the design handoff
- [ ] Graceful empty/invalid-structure handling in the InChI display
- [ ] Static build deployable to GitHub Pages or Netlify (no server required)

### Out of Scope

- Backend / server — ketcher-standalone runs entirely in-browser via WASM
- User accounts or persistence — stateless tool, no login
- Mobile-native app — web-first; responsive enough to be usable but not optimised for touch
- Additional molecules beyond the 5 in the handoff — content expansion deferred

## Context

The design reference lives in `./design_handoff_explain_that_inchi/`. The files there include:
- `styles.css` — canonical design tokens (copy verbatim)
- `molecules.js` — 5 preset molecules + InChI parsers (`parseInchi`, `parseConnectionBonds`, `parseHydrogenAtoms`, `parseMobileHydrogens`, `parseStereoAtoms`) — port as-is
- `layers-info.js` — per-layer copy (`LAYER_INFO`), `readingFor()` function — port as-is
- `app.jsx` — reference for `LayerText`, `MappingStrip`, `Explanation`, `Legend` component structure
- `canvas.jsx` — SVG stand-in for the molecule editor; replace entirely with `ketcher-react`

The parsers and layer content are final and transfer directly. The molecule canvas and InChI generation are the only parts that change from mock to real.

## Constraints

- **Tech stack**: Vite + React 18 + TypeScript — matches what `ketcher-react` expects
- **No backend**: `ketcher-standalone` provides WASM InChI; everything runs in-browser
- **Styling**: vanilla CSS modules or Tailwind — must preserve the CSS variable token system from `styles.css`
- **Deployment**: static build (GitHub Pages or Netlify); no server-side rendering
- **Fidelity**: high — colour palette, typography, spacing, and hover behaviour are final from the handoff

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite + React 18 + TypeScript | Specified in design handoff; required by `ketcher-react` | — Pending |
| `ketcher-standalone` (no Indigo backend) | Browser-only deployment requirement | — Pending |
| Port parsers from `molecules.js` verbatim | Parsers are final, tested, and domain-correct | — Pending |
| Aux-info `getInchi(true)` for atom mapping | Only source of canonical→Ketcher mapping needed for highlights | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-18 after initialization*
