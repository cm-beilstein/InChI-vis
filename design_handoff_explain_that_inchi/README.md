# Handoff: Explain that InChI

## Overview

A single-page tool for chemists and chemistry students to understand the structure of an InChI (IUPAC International Chemical Identifier) string. Users draw a molecule in an editor; the InChI is computed live and displayed below with each layer colour-coded. Hovering over a layer highlights the corresponding atoms or bonds in the molecule canvas. Hovering also surfaces a per-layer explanation card and the editor↔InChI atom-numbering mapping.

The goal is to demystify a notation that most chemists treat as opaque — by making every chunk of the InChI string interactive and explained.

## About the Design Files

The HTML files in this bundle are **design references**, not production code. They mock the full UX of the app (color system, layer parser, hover interactions, mapping strip) but use a hand-coded SVG molecule renderer and a hard-coded library of five molecules in place of a real chemistry stack. The task for Claude Code is to **recreate this design inside a real frontend codebase** — wiring in the actual Ketcher editor and a real InChI generator so the molecule drawing and the InChI string both become live.

If the user's project has no existing frontend, **Vite + React 18 + TypeScript** is the right choice — it matches what the ketcher-react package expects.

## Fidelity

**High-fidelity.** Colour palette, typography (IBM Plex Sans / Serif / Mono), spacing, hover behaviour, and the entire layer-colouring system are final. Recreate pixel-for-pixel using the codebase's standard styling layer (Tailwind, CSS modules, etc.). The prototype's CSS variables under `:root` in `styles.css` are the canonical design tokens — copy them into wherever the codebase keeps its tokens.

The one thing that is **not** high-fidelity is the molecule canvas itself. The prototype's hand-laid SVG is a stand-in for the real Ketcher editor. Replace it with the actual `ketcher-react` component (see "Real Integrations" below).

---

## What's Real Here vs. What's Mocked

| Aspect | Prototype | Production app needs |
|---|---|---|
| Molecule editor | Hand-drawn SVG, 5 pre-defined molecules | Embed real `ketcher-react` |
| InChI generation | Hard-coded strings per molecule | Generate live from current Ketcher structure via InChI WASM |
| InChI string parsing | Real parser (`parseInchi`, `parseConnectionBonds`, `parseHydrogenAtoms`, `parseStereoParities`) — keep as-is | Same parser is fine |
| Layer → atom highlighting | Real mapping via canonical numbers | Same logic, but feed it the InChI library's **aux-info** atom map (see below) |
| Ketcher ↔ InChI atom mapping | Faked — array order vs. our hand-assigned canonical | Real — pulled from the InChI library's aux-info output |
| Layer explanations + tooltip content | Real, final copy | Keep as-is |
| Color system (per-element, per-parity, per-H-count) | Real, final | Keep as-is |

---

## Real Integrations

### Ketcher (the editor)

Use the npm packages from EPAM:

```bash
npm i ketcher-react ketcher-standalone ketcher-core
```

`ketcher-standalone` is the version that runs entirely in the browser (no Indigo backend service required). It bundles the structure-service WASM internally.

```tsx
import 'ketcher-react/dist/index.css';
import { Editor } from 'ketcher-react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';

const structServiceProvider = new StandaloneStructServiceProvider();

function MoleculeCanvas({ onStructureChange }) {
  return (
    <Editor
      staticResourcesUrl=""
      structServiceProvider={structServiceProvider}
      errorHandler={console.error}
      onInit={(ketcher) => {
        window.ketcher = ketcher;
        ketcher.editor.subscribe('change', async () => {
          const molfile = await ketcher.getMolfile();
          onStructureChange(molfile);
        });
      }}
    />
  );
}
```

Ketcher gives you (asynchronously) `getMolfile()`, `getSmiles()`, and **`getInchi()` + `getInchiKey()`**. The standalone build includes the official InChI library compiled to WASM.

### Atom-number mapping (the key piece for our highlighting)

This is the part that powers everything in the design. When the InChI library canonicalises a structure, it also produces an **aux-info** string that records the canonical-→-original atom mapping. Ketcher exposes this:

```ts
const inchi = await ketcher.getInchi();      // "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H"
const auxinfo = await ketcher.getInchi(true); // includes "/AuxInfo=..."
// or use the lower-level structService directly to get both at once
```

The aux-info has a `/N:` section: `AuxInfo=1/0/N:3,1,5,2,6,4/...`. That comma-separated list **is the mapping** — the *i*-th entry is the original (Ketcher) atom index of canonical atom *i*. Parse it like so:

```ts
function parseAuxMapping(auxinfo: string): Map<number, number> {
  // canonical# (1-based) -> ketcher atom index (0-based, as Ketcher uses)
  const match = auxinfo.match(/\/N:([\d,]+)/);
  if (!match) return new Map();
  const orig = match[1].split(',').map(Number);
  const m = new Map<number, number>();
  orig.forEach((ketcherIdx, i) => m.set(i + 1, ketcherIdx - 1));
  return m;
}
```

This `Map<canonical#, ketcherIdx>` is the single source of truth that drives:
- The "Ketcher → InChI" mapping strip
- All hover-highlighting (a layer references canonical numbers; you look them up in the map to find which Ketcher atoms to highlight)

### Highlighting atoms/bonds inside Ketcher

Ketcher's editor exposes a highlighting API:

```ts
ketcher.editor.highlights.create({ atoms: [3, 7, 11], color: '#5fb070' });
ketcher.editor.highlights.clear();
```

When a user hovers a layer chunk in our colour-coded InChI display:

1. Parse the layer text to extract referenced canonical atom numbers and bonds (functions `parseConnectionBonds`, `parseHydrogenAtoms`, `parseStereoParities` from `molecules.js` in this bundle — port them directly).
2. Translate canonical numbers → Ketcher atom indices via the aux-info map.
3. Call `ketcher.editor.highlights.create({ atoms, bonds, color })` with the layer's accent colour (the `--c-conn`, `--c-hydro-N`, `--c-stereo-plus/minus` tokens defined in `styles.css`).
4. On `mouseleave`, call `ketcher.editor.highlights.clear()`.

For per-atom colour variations (formula → per-element, h-layer → per-H-count, t-layer → per-parity), call `highlights.create` once per colour group — Ketcher supports multiple concurrent highlights.

---

## Screens / Views

There is **one screen**. Top-down:

### 1. Header

- **Title**: "Explain that *InChI*" — "InChI" in italic, slightly muted (`--ink-soft`)
- **Font**: IBM Plex Serif 500, 52px, line-height 1.02, letter-spacing -0.02em
- **Right meta**: two lines of monospace 11px caps-tracked metadata (`InChI v1.07.3 · standard` and a hint about hovering)
- **Bottom border**: 1px `--line`

### 2. Ketcher panel (`.ketcher`)

A bordered card laid out as a 3-column grid: `56px | 1fr | 240px`.

- **Left (`.toolbar`)**: vertical strip of square tool buttons (Draw, atom shortcuts, ring, double-bond, wedge, erase, clear) — the active one is filled with `--ink`. In the prototype these are static decorative chrome; in the real app they become Ketcher's own toolbar (don't draw your own).
- **Middle (`.canvas-wrap`)**: the Ketcher editor itself. Dotted-grid background in the prototype (`radial-gradient` of 1.5px dots on 24px spacing). Replace with `<Editor>` from `ketcher-react`.
  - Top-left overlay (`.canvas-meta`): pulsing green dot + molecule name + formula + heavy-atom count. Keep this; update on every structure change.
- **Right (`.mol-list`)**: list of preset example molecules. Each row is a clickable button — clicking should call `ketcher.setMolecule(...)` to load that structure. Active row has a left ink-coloured border and white background.

### 3. InChI display (`.inchi-display`)

A bordered card containing the live InChI string, broken into clickable layer chunks separated by `/`. Each chunk is wrapped in `<span class="inchi-layer" data-layer={type}>` and coloured by its `data-layer` attribute via the CSS in the prototype.

Layer types and their colours (CSS variable → semantic):
- `version` → `--c-version` (neutral grey)
- `formula` → `--c-formula` (blue) — but per-element sub-spans override (`--c-el-C` etc.)
- `c` → `--c-conn` (green)
- `h` → `--c-hydro` (amber) — sub-spans override by H count (`--c-hydro-1` through `--c-hydro-4`)
- `q`, `p` → `--c-charge`, `--c-proton` (purple/magenta)
- `b`, `t`, `m`, `s` → `--c-stereo` (rose) — t and b sub-spans split into `--c-stereo-plus` (rose) and `--c-stereo-minus` (indigo) by parity sign
- `i` → `--c-isotope` (teal)

Hover behaviour on a layer chunk:
- That chunk's background tints to its `-bg` variant
- All other chunks dim (`.dim` class, opacity 0.35)
- Atoms/bonds in the Ketcher canvas highlight according to the layer's semantics (see "Highlighting" above)
- Explanation card updates

**Sub-token hover (finer grain than the whole layer):**
Each layer is built from a sequence of independently-hoverable sub-spans. Hovering a sub-token overrides the layer-wide highlight with a more targeted one:
- **Formula** — each element chunk (`C8`, `H10`, `N4`, `O2`) hovers separately. Hover `N4` → only nitrogen atoms halo.
- **c-layer** — every atom number is its own sub-token. Hover `7` → only atom 7 halos, and only bonds incident to atom 7 turn green.
- **h-layer** — each `nHm` group and each `(H,…)` mobile-H group hovers separately. Hover `1-3H3` → only atoms 1, 2, 3 show their H₃ labels.
- **t- and b-layers** — each parity token (`14-`, `17+`) hovers separately. Hover `17+` → only that stereocenter halos, in the positive-parity rose.

When sub-hover is active, the **layer-wide highlight must be fully suppressed** (no fall-through). The prototype enforces this in `MoleculeCanvas`:
```js
if (subHover) {
  const sub = subHaloFor(atom);
  if (sub) haloColor = sub;
  // intentionally no else-branch — layer-wide highlights stay off
}
```
The corresponding `LayerText`/`FormulaText`/`ConnectionText`/`HLayerText`/`ParityText` components in `app.jsx` show the canonical sub-span wrapping pattern. Port them as-is.

The `LayerText` component in `app.jsx` shows how to render colored sub-spans for formula/t/b/h layers — port as-is.

### 4. Mapping strip (`.mapping`)

Horizontal panel under the InChI display showing `Ketcher → InChI: 1→1 2→2 3→4 4→6 5→5 6→3 ...`. Each pair is a chip:
- Identity pairs (Ketcher # = canonical #): grey, dimmed (`.identity`)
- Divergent pairs: green border + `--c-conn-bg` background (`.diverges`)
- Element symbol appended in small faint type

If every pair is identity, show "(identity — drawing order already matches the canonical numbering)" in italic.

In production, build this from the parsed aux-info mapping. Sort by Ketcher index.

### 5. Explanation panel (`.explain`)

Two-column grid. Each column is a card (border, rounded 6px, accent stripe on the left edge).

- **Left card (`.card`)**: current-layer explanation. Updates as the user hovers different layer chunks. Three sections:
  1. Layer tag (small monospace caps + colored swatch) showing the layer prefix (e.g. "c-layer")
  2. Layer title in IBM Plex Serif 26px (e.g. "Connection layer")
  3. Layer body (prose)
  4. Reading code block (`.layer-eg`) showing a plain-English read-out of the *current molecule's* version of that layer — e.g. for benzene's c-layer: "C₁–C₂ · C₂–C₄ · C₄–C₆ · ..."
- **Right card (`.legend-card`)**: full layer legend. One row per layer type (11 rows), each showing colour swatch, key glyph, name, short description. Rows for layers not present in the current molecule are dimmed (`.muted`).
  - **On row hover**: a dark tooltip (`.legend-tip`) slides in from the right edge of the card, ~300px wide, with the fuller layer description from `LAYER_INFO[type].blurb` and an example syntax line at the bottom (`e.g. c1-2(4)3-5`).

### 6. Footnote

Single horizontal strip below `.explain`, monospace 11px caps-tracked, with two halves: definition of InChI on the left and a key-hint legend on the right (`<kbd>Hover</kbd>`, `<kbd>Click</kbd>`).

---

## Interactions & Behavior

- **Switch molecule**: click any row in the example list. In production, `ketcher.setMolecule(molfile)` and let the change-subscription pipeline rebuild everything else.
- **Hover layer chunk**: as described in "InChI display" above. 160ms ease transition.
- **Hover legend row**: tooltip fades + slides in from the right (4px translateX). 160ms.
- **Mouseleave InChI**: clear hover state, clear Ketcher highlights, explanation reverts to idle.
- **Live update**: on every Ketcher structure change, re-fetch InChI + aux-info, re-parse, re-render. Debounce ~150ms to avoid hammering during drag.

## State Management

Minimal — single component or Zustand/Jotai store, your call.

```ts
type AppState = {
  molfile: string;            // current structure, source of truth from Ketcher
  inchi: string;              // computed on every molfile change
  layers: Layer[];            // parsed from inchi
  auxMap: Map<number, number>;// canonical# -> ketcher atom index
  hoveredLayerIdx: number | null;
  subHover: SubHover | null;  // sub-token currently pointed at, if any
};

type SubHover =
  | { kind: "element"; el: string }                       // formula: hover "N4"
  | { kind: "atom"; canonical: number }                   // c-layer: hover atom number
  | { kind: "stereo"; atom: number; sign: "+" | "-" }     // t/b-layer: hover parity token
  | { kind: "hAtoms"; atoms: number[]; count: number }    // h-layer: hover "1-3H3"
  | { kind: "mobileH"; atoms: number[] };                 // h-layer: hover "(H,3,4)"
```

Effects:
- `molfile` changes → recompute inchi + aux-info → reparse layers + map → clear both hovers
- `hoveredLayerIdx` changes → push layer-wide highlights to Ketcher, update explanation card
- `subHover` changes → if set, push the more targeted highlights and suppress layer-wide ones; if cleared, fall back to layer-wide

## Design Tokens

All of these live in `styles.css` `:root`. Copy them verbatim into the project's token file (or import the file directly as a CSS module).

**Surfaces**
- `--bg` `oklch(0.985 0.005 85)` — page background, warm off-white
- `--bg-canvas` `oklch(0.995 0.003 85)` — card / canvas surface
- `--bg-panel` `oklch(0.97 0.006 85)` — sidebars / inset panels
- `--line` `oklch(0.88 0.008 250)` — primary borders
- `--line-soft` `oklch(0.93 0.006 250)` — hover backgrounds

**Ink**
- `--ink` `oklch(0.20 0.015 255)` — primary text
- `--ink-soft` `oklch(0.45 0.015 255)` — secondary text
- `--ink-faint` `oklch(0.65 0.012 255)` — tertiary / metadata

**Layer accents** (all consistent chroma ~0.14, lightness ~0.55, varying hue)
- `--c-version` neutral grey · `--c-formula` 245° blue · `--c-conn` 155° green · `--c-hydro` 65° amber · `--c-charge` 305° violet · `--c-proton` 325° magenta · `--c-stereo` 25° rose · `--c-isotope` 200° teal. Each has a `-bg` variant at lightness ~0.95 for tinting.

**Element colours** (`--c-el-C/H/N/O/S/P/F/Cl/Br/I`): hue and chroma tuned per element. C is near-black, N blue, O red, S amber, etc. Each has a `-bg` variant.

**Parity colours**
- `--c-stereo-plus` rose 25°, `--c-stereo-minus` indigo 265°

**H-count shading** (lightness ramp, hue 65°)
- `--c-hydro-1` lightness 0.75 · `--c-hydro-2` 0.62 · `--c-hydro-3` 0.50 · `--c-hydro-4` 0.38 · `--c-hydro-mobile` 0.55 italic

**Typography**
- Sans: IBM Plex Sans 400/500/600
- Serif: IBM Plex Serif 400/500 (titles only)
- Mono: IBM Plex Mono 400/500/600
- All loaded from Google Fonts

**Spacing & radii**
- Card padding `22px 24px` · radius `6px`
- Border `1px solid var(--line)`
- Section gap `36px`, micro-gap `8–12px`

## Files in This Bundle

- `index.html` — shell that loads everything
- `styles.css` — full stylesheet incl. all CSS variables; the **canonical design source**
- `molecules.js` — molecule data (5 pre-built molecules) + InChI parsers (`parseInchi`, `parseConnectionBonds`, `parseHydrogenAtoms`, `parseMobileHydrogens`, `parseStereoAtoms`). The parsers transfer directly to the production app.
- `layers-info.js` — per-layer copy (`LAYER_INFO`), idle-state copy, the `readingFor()` function that turns a layer into a plain-English sentence in context. **Use this content as-is in the production app.**
- `canvas.jsx` — SVG molecule renderer. Replace entirely with `ketcher-react`.
- `app.jsx` — top-level React component, including the `LayerText` formula/t/b/h sub-renderers, the `MappingStrip` component, the `Explanation` panel, and the `Legend` panel with tooltips. Reference for the UI structure.

## Assets

No image assets. Everything is HTML/CSS/SVG/text. Fonts come from Google Fonts (IBM Plex Sans/Serif/Mono). The "dotted grid" canvas background is a CSS `radial-gradient`.

## Suggested Build Order

1. **Scaffold**: Vite + React 18 + TS. Add Tailwind or vanilla CSS modules — your call. Import the CSS variables from `styles.css`.
2. **Drop in Ketcher**: get `ketcher-react` mounted with `StandaloneStructServiceProvider`. Verify `getInchi()` works.
3. **Wire structure-change subscription**: every change → fetch `getInchi(true)` → parse → set state.
4. **Port the parsers**: `parseInchi`, `parseConnectionBonds`, `parseHydrogenAtoms`, `parseStereoParities` from `molecules.js`. They're plain JS, no React deps. Add `parseAuxMapping` (see code block above).
5. **Build the InChI display** with `LayerText` from `app.jsx`. Verify the colour system matches the prototype exactly — formula sub-spans per element, h sub-spans per count, t sub-spans per parity sign.
6. **Wire hover → highlight**: hook `onMouseEnter` on each layer chunk to push highlights into Ketcher. Use the aux-info map to translate canonical → editor indices.
7. **Mapping strip**: render from the aux-info map. Identity rows dimmed, divergent rows green.
8. **Explanation panel + legend**: port `LAYER_INFO` from `layers-info.js`, `readingFor` from same. Build the legend tooltip with CSS as in the prototype.

## Known Gotchas

- **`getInchi(true)` returns both InChI and aux-info concatenated** with a newline (or as one of Ketcher's return formats — check the version). You may need to call the lower-level `structService.getInChIAuxInfo` directly.
- **Ketcher's highlights API has changed between versions** — `highlights.create`/`highlights.clear` is the 2.x+ form. If you're on older Ketcher, the API was `editor.highlight(atoms)`.
- **Stereo parities are computed from the canonical numbering**, so they automatically reflect whatever the user drew — no manual stereo handling needed.
- **Mobile-H groups** (e.g. `(H,3,4)` in the h-layer) — when highlighting, halo all atoms in the group with the `--c-hydro-mobile` colour rather than per-count shading.
- **Empty / invalid structures**: Ketcher's `getInchi` will throw or return empty for disconnected fragments / valence errors. Handle gracefully — show "draw a valid molecule" placeholder in the InChI display.
