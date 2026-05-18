# Architecture Research: Explain that InChI

**Researched:** 2026-05-18
**Overall confidence:** HIGH (core component structure derived directly from design handoff source; Ketcher API patterns verified against official repo and npm type definitions)

---

## System Overview

A single-screen, single-page React app. The user draws a molecule in a Ketcher editor; Ketcher's WASM InChI library computes the InChI string live; React state distributes that string and its parsed layers to display and interaction components. No backend, no routing, no persistence.

The hard architectural seam is between React's declarative model and Ketcher's imperative API. Ketcher is a DOM singleton (one instance per page), initialized once via `onInit`, and controlled exclusively through method calls (`getInchi`, `setMolecule`, `highlights.create`). React never owns the Ketcher DOM. Ketcher pushes change events to React; React pushes highlight commands to Ketcher. That asymmetry drives every structural decision below.

---

## Component Boundaries

```
App (root state owner)
├── Header                        (static, no props)
├── KetcherPanel
│   ├── Editor [ketcher-react]    (imperative DOM; ref held by App)
│   │   └── canvas-meta overlay  (reads: mol metadata from App state)
│   └── MoleculeList             (reads: selected mol id; emits: onSelect)
├── InchiDisplay
│   ├── LayerChip[]               (reads: layer[]; emits: onLayerEnter/Leave)
│   │   └── LayerText             (dispatches to sub-renderers below)
│   │       ├── FormulaText       (emits: onSubHover element)
│   │       ├── ConnectionText    (emits: onSubHover atom)
│   │       ├── ParityText        (emits: onSubHover stereo)
│   │       └── HLayerText        (emits: onSubHover hAtoms/mobileH)
├── MappingStrip                  (reads: auxMap; pure display)
├── ExplanationPanel
│   ├── ExplanationCard           (reads: hoveredLayer; pure display)
│   └── Legend
│       └── LegendRow[]          (reads: layerTypes present in molecule)
└── Footnote                      (static)
```

**Direction rules:**
- Data flows DOWN as props.
- Events flow UP as callbacks (onLayerEnter, onSubHover, onSelect).
- Ketcher highlight calls flow OUT from App (or a dedicated hook) directly to the Ketcher instance — never through React props.
- The Ketcher instance is never passed as a prop. It is stored in a `useRef` on App and accessed by the highlight-dispatch logic co-located with App.

---

## Data Flow

### Molecule change pipeline

```
User draws in Ketcher
  → ketcher.editor.subscribe('change', handler)   [registered in onInit]
  → handler fires (debounced 150ms)
  → await ketcher.getInchi(true)                  [returns InChI + AuxInfo concatenated]
  → parse InChI string   → layers[]               [parseInchi from molecules.js]
  → parse AuxInfo /N:    → auxMap Map<canonical,ketcherIdx>  [parseAuxMapping]
  → App.setState({ inchi, layers, auxMap })
  → InchiDisplay re-renders, MappingStrip re-renders
  → hoveredLayerIdx and subHover reset to null
```

### Hover pipeline

```
User hovers LayerChip i
  → onMouseEnter fires on LayerChip
  → App.setState({ hoveredLayerIdx: i, subHover: null })
  → ExplanationCard updates (reads hoveredLayer)
  → highlight side-effect fires:
      atoms = layers[i].canonicalAtoms        [parsed from layer text]
      ketcherAtoms = atoms.map(n => auxMap.get(n))
      ketcher.editor.highlights.clear()
      ketcher.editor.highlights.create({ atoms: ketcherAtoms, color: layerAccent })

User hovers sub-token in LayerText
  → onSubHover fires → App.setState({ subHover: { kind, ... } })
  → highlight side-effect fires with sub-token logic:
      IF subHover set: compute targeted atoms only, suppress layer-wide highlight
      IF subHover null: fall back to layer-wide highlight
      ketcher.editor.highlights.clear()
      ketcher.editor.highlights.create({ atoms, color })
      (multiple create calls for multi-color layers: formula per element, h per count)

User leaves InchiDisplay
  → onMouseLeave on InchiDisplay container
  → App.setState({ hoveredLayerIdx: null, subHover: null })
  → ketcher.editor.highlights.clear()
```

### Molecule switch pipeline

```
User clicks MoleculeList row
  → onSelect(molId) → App knows new molId
  → await ketcher.setMolecule(mol.molfile)
  → Ketcher fires 'change' event → debounced handler rebuilds layers + auxMap
  → (no manual state set for the InChI; change subscription handles it)
```

---

## State Schema

Owned by App. Flat `useState` (or `useReducer`) — no external store needed for a single-screen app of this complexity.

```typescript
// Core derived state
inchi: string                    // live from Ketcher
layers: Layer[]                  // parseInchi(inchi)
auxMap: Map<number, number>      // canonical# (1-based) -> Ketcher atom index (0-based)

// Hover state
hoveredLayerIdx: number | null
subHover: SubHover | null

// Selected preset (drives setMolecule on mount and on click)
selectedMolId: string

// Ketcher readiness
ketcherReady: boolean            // set true in onInit, gates InchI display render
```

The Ketcher instance itself is stored in `ketcherRef = useRef<Ketcher | null>(null)`. It is NOT state — it does not cause re-renders. It is accessed imperatively by the highlight-dispatch logic.

---

## Integration Patterns

### 1. Ketcher initialization (onInit)

Ketcher's `onInit` fires once after the WASM module loads. The Editor component must NOT be unmounted/remounted — doing so causes a second WASM initialization and broken state. Wrap the Editor in a container that is always rendered; never conditionally render the Editor itself.

```tsx
// In App or a KetcherBridge component
const ketcherRef = useRef<Ketcher | null>(null);

<Editor
  staticResourcesUrl=""
  structServiceProvider={structServiceProvider}  // created ONCE outside render
  errorHandler={console.error}
  onInit={(ketcher) => {
    ketcherRef.current = ketcher;
    setKetcherReady(true);
    // Register the change subscription here — not in useEffect
    ketcher.editor.subscribe('change', debouncedChangeHandler);
  }}
/>
```

`structServiceProvider` must be created once at module level or in a `useMemo` with no deps — not inside a component body that can re-run.

```ts
// Module level (outside any component)
const structServiceProvider = new StandaloneStructServiceProvider();
```

### 2. Debounced structure-change subscription (150ms)

The canonical React pattern for a stable debounced callback that reads current state without stale closures:

```ts
// Inside App
const latestHandlerRef = useRef<() => Promise<void>>();

// Update the ref whenever the actual async logic changes
// (in practice it doesn't change, but this is future-proof)
useEffect(() => {
  latestHandlerRef.current = async () => {
    try {
      const result = await ketcherRef.current!.getInchi(true);
      // result is "InChI=1S/...\nAuxInfo=1/0/N:..."
      // split on newline or detect the AuxInfo= prefix
      const [inchiStr, auxStr] = splitInchiAndAux(result);
      const layers = parseInchi(inchiStr);
      const auxMap = parseAuxMapping(auxStr);
      setInchi(inchiStr);
      setLayers(layers);
      setAuxMap(auxMap);
      setHoveredLayerIdx(null);
      setSubHover(null);
    } catch {
      // empty structure or invalid valence — show placeholder
      setInchi('');
      setLayers([]);
      setAuxMap(new Map());
    }
  };
});

// Stable debounced wrapper — created once
const debouncedChangeHandler = useMemo(
  () => debounce(() => latestHandlerRef.current?.(), 150),
  []
);
```

The key: the debounced function is a stable reference (created once with `useMemo(fn, [])`), but it always calls through `latestHandlerRef.current`, which holds the latest closure. This avoids stale closures without reinstalling the Ketcher subscription on every render.

### 3. AuxInfo parsing: getInchi(true) vs structService

**Verified from official README and npm type definitions:**
- `ketcher.getInchi(withAuxInfo: boolean = false): Promise<string>` — documented in npm package descriptions.
- When `withAuxInfo = true`, the return value is the InChI and AuxInfo concatenated (typically `"InChI=1S/...\nAuxInfo=1/0/N:..."`, but the separator format can vary by Ketcher version).

**Recommended approach:** Call `getInchi(true)` and split on the `AuxInfo=` prefix:

```ts
function splitInchiAndAux(raw: string): [string, string] {
  const auxIdx = raw.indexOf('AuxInfo=');
  if (auxIdx === -1) return [raw.trim(), ''];
  return [raw.slice(0, auxIdx).trim(), raw.slice(auxIdx).trim()];
}
```

**Fallback (LOW confidence — verify against actual Ketcher version):** If `getInchi(true)` returns only the InChI, look for `ketcher.indigo` or `ketcher.structService` and call a lower-level convert method with `ChemicalMimeType.InChIAuxInfo`. The `structService.types.d.ts` in ketcher-core 2.26.0 exposes `ChemicalMimeType.InChIAuxInfo = "chemical/x-inchi-aux"`, which implies it is a valid output format for the `convert()` call. This fallback adds complexity and should be validated during Phase 2 (Ketcher integration phase).

### 4. Highlight dispatch without stale closures

Highlights are side effects of hover state, not render output. Use `useEffect` to watch hover state and push to Ketcher imperatively:

```ts
useEffect(() => {
  const ketcher = ketcherRef.current;
  if (!ketcher || !ketcherReady) return;

  ketcher.editor.highlights.clear();

  if (hoveredLayerIdx === null) return;

  const layer = layers[hoveredLayerIdx];
  if (!layer) return;

  if (subHover) {
    // Sub-token mode: suppress layer-wide, push targeted highlight(s)
    const groups = resolveSubHoverGroups(subHover, auxMap);
    // groups is { atoms: number[], color: string }[]
    for (const g of groups) {
      ketcher.editor.highlights.create({ atoms: g.atoms, color: g.color });
    }
  } else {
    // Layer-wide mode
    const ketcherAtoms = resolveLayerAtoms(layer, auxMap);
    const ketcherBonds = resolveLayerBonds(layer, auxMap);
    ketcher.editor.highlights.create({
      atoms: ketcherAtoms,
      bonds: ketcherBonds,
      color: layerAccentColor(layer.type),
    });
  }
}, [hoveredLayerIdx, subHover, layers, auxMap, ketcherReady]);
```

The `useEffect` dependency array includes `hoveredLayerIdx`, `subHover`, `layers`, and `auxMap`. Stale closure is not an issue here because `ketcherRef.current` is a mutable ref and `layers`/`auxMap` are proper state values that appear in the dep array.

**API note (MEDIUM confidence — confirmed in GitHub discussion #4050):**
- `ketcher.editor.highlights.create({ atoms, bonds, color })` — available in Ketcher 2.x+
- `ketcher.editor.highlights.clear()` — clears all highlights
- Multiple `create` calls accumulate (used for multi-color layers like formula per element)
- If on a pre-2.x Ketcher version, the old API was `editor.highlight(atoms)` — check installed version at build time

### 5. Two-level hover state management

Two `useState` values on App: `hoveredLayerIdx` and `subHover`. No context, no external store — the component tree is shallow enough that prop drilling is clean and there are at most 3 levels of nesting.

The suppression rule: when `subHover` is non-null, the `useEffect` above takes the sub-token branch and skips layer-wide highlights entirely (no else-branch, as the prototype comment confirms). This means the only coordination needed is clearing `subHover` when the layer changes:

```ts
// In LayerChip onMouseEnter:
onMouseEnter={() => {
  setHoveredLayerIdx(i);
  setSubHover(null);   // reset sub-hover when switching layers
}}
```

And in InchiDisplay container `onMouseLeave`, both are cleared together.

No ref tricks needed for hover state — it changes infrequently (once per user mouse movement), React batching handles it, and the `useEffect` that drives highlights runs after render.

### 6. CSS design token system

The design token system is built from CSS custom properties on `:root` in `styles.css`. CSS custom properties are inheritable and cascade globally, so they are accessible from any CSS module file in the project without import. This means:

**Recommended approach:** Import `styles.css` once as a global stylesheet (in `main.tsx` or `index.css`), and use CSS modules for component-level scoping.

```ts
// main.tsx
import './styles/tokens.css';   // the verbatim copy of the :root block from styles.css
```

```css
/* KetcherPanel.module.css — can use tokens freely */
.canvas-wrap {
  background: var(--bg-canvas);
  border: 1px solid var(--line);
}
```

This is the correct approach because:
- CSS modules scope class names, but CSS custom properties on `:root` are already global by nature.
- No Tailwind plugin needed — the token system is self-contained vanilla CSS.
- Do NOT use `@import` inside CSS module files for tokens — it works but creates unnecessary duplication in the bundle.

The one Ketcher-specific CSS concern: `import 'ketcher-react/dist/index.css'` must appear in `main.tsx` before your own token import, so your tokens can override any Ketcher defaults that might collide.

---

## Suggested Build Order

Dependencies determine order. Each phase produces something the next phase consumes.

### Phase 1: Scaffold + Ketcher mounting

**Produces:** A running Vite + React 18 + TypeScript project with Ketcher visible in the browser and `getInchi()` returning a string.

- Create Vite project with `@vitejs/plugin-react` (NOT the SWC variant — Ketcher's WASM bundles contain characters that crash SWC's parser; verified from Ketcher issue #5565)
- Install `ketcher-react`, `ketcher-standalone`, `ketcher-core`
- Add `optimizeDeps.exclude: ['ketcher-standalone']` to `vite.config.ts` (Vite pre-bundler chokes on the WASM-linked CJS output)
- Import `ketcher-react/dist/index.css` in `main.tsx`
- Import design tokens CSS (`styles.css` verbatim) in `main.tsx`
- Mount `<Editor>` with `StandaloneStructServiceProvider`
- Confirm `getInchi()` works from `onInit` console log
- Confirm `highlights.create` works

**Why first:** Everything else depends on a working Ketcher instance.

### Phase 2: Data pipeline (no UI yet)

**Produces:** Correct `layers[]` and `auxMap` in React state on every Ketcher change.

- Port `parseInchi`, `parseConnectionBonds`, `parseHydrogenAtoms`, `parseMobileHydrogens`, `parseStereoAtoms` from `molecules.js` — these are pure functions, no React deps
- Implement `parseAuxMapping`
- Implement `splitInchiAndAux` (handle the version-specific return format of `getInchi(true)`)
- Wire the debounced `'change'` subscription in `onInit`
- Validate with console.log: structure changes produce correct layers and auxMap

**Why second:** The InChI display and highlights both consume `layers[]` and `auxMap`. Until these are correct, nothing downstream can be built correctly.

### Phase 3: InChI display + hover state

**Produces:** The colour-coded InChI strip with working layer-level hover (dim/active classes) and ExplanationPanel updates. No Ketcher highlights yet.

- Port `InchiSection`, `LayerChip` (the `inchi-layer` span from app.jsx)
- Port `LayerText` dispatcher and all sub-renderers (`FormulaText`, `ConnectionText`, `ParityText`, `HLayerText`)
- Wire `hoveredLayerIdx` and `subHover` state to App
- Wire `ExplanationPanel` and `Legend` (port `LAYER_INFO` from `layers-info.js`, `readingFor()` from same)
- Validate visual match to design handoff

**Why third:** Hover state is needed before highlights, and the display is testable with hardcoded data before highlights are wired.

### Phase 4: Ketcher highlight integration

**Produces:** Hovering a layer chunk highlights atoms/bonds in the Ketcher canvas.

- Implement `resolveLayerAtoms` / `resolveLayerBonds` (translate canonical numbers via `auxMap` to Ketcher indices)
- Implement `resolveSubHoverGroups` (per sub-hover kind)
- Wire the `useEffect` highlight dispatch (described in Integration Patterns §4)
- Handle the sub-hover suppression rule
- Validate: formula hover per-element, c-layer per-atom, h-layer per-count, t/b-layer per-parity-token

**Why fourth:** Depends on Phase 2 (auxMap), Phase 3 (hover state), and Phase 1 (highlights API confirmed working).

### Phase 5: MappingStrip + example molecule list

**Produces:** The atom-numbering mapping strip and preset molecule switching.

- Port `MappingStrip` (reads `auxMap`, derives identity vs. divergent pairs)
- Add `MoleculeList` sidebar (reads `molecules.js` preset data, calls `ketcher.setMolecule()`)
- Handle loading state during `setMolecule` (Ketcher fires 'change' after the molecule loads; the debounce covers transient states)
- Handle identity message ("drawing order already matches...")

**Why fifth:** MappingStrip depends on `auxMap` (Phase 2). Molecule switching is independent but the change pipeline must be stable before testing it.

### Phase 6: Polish + edge cases

**Produces:** Production-quality build, deploy.

- Empty/invalid structure handling (Ketcher `getInchi` throws or returns empty on bad valence)
- Graceful fallback in InChI display: show placeholder instead of empty/broken state
- `ketcherReady` gate: show loading state while WASM initialises (can take 1-3 seconds)
- Static build verification (`vite build`, check GitHub Pages / Netlify deploy)
- Typography check (IBM Plex Sans/Serif/Mono from Google Fonts, verify loading)
- Accessibility pass (keyboard-navigable layer hover, aria labels on MappingStrip)

---

## Pitfall Flags by Phase

| Phase | Pitfall | Mitigation |
|-------|---------|------------|
| 1 | `@vitejs/plugin-react-swc` crashes on Ketcher's WASM bundle | Use `@vitejs/plugin-react` (Babel) instead |
| 1 | Ketcher Editor remounts unexpectedly and double-initializes WASM | Never conditionally render `<Editor>`; always mount it |
| 1 | `structServiceProvider` recreated on render | Create at module level outside component |
| 2 | `getInchi(true)` return format varies by Ketcher version | Split on `"AuxInfo="` prefix, not on newline; verify empirically |
| 2 | Subscription callback captures stale state | Use `latestHandlerRef` pattern; never reinstall subscription on re-render |
| 4 | Multiple `highlights.create` calls don't accumulate | Verify on target Ketcher version; clear before creating |
| 4 | Bond indices in `parseConnectionBonds` are Ketcher bond indices, not canonical | The aux-info `/N:` section maps atoms only; bond mapping requires separate derivation from atom pairs in the c-layer |
| 6 | WASM load takes 1-3s on cold start | Show skeleton/spinner gated on `ketcherReady` flag, not on first InChI |

---

## Sources

- Design handoff: `/home/bsmue/code/InChI-vis/design_handoff_explain_that_inchi/README.md` (HIGH — primary specification)
- Design handoff: `/home/bsmue/code/InChI-vis/design_handoff_explain_that_inchi/app.jsx` (HIGH — canonical component structure)
- Ketcher GitHub repo: [epam/ketcher](https://github.com/epam/ketcher) (HIGH — official source)
- Ketcher highlights discussion: [GitHub Discussion #4050](https://github.com/epam/ketcher/discussions/4050) (MEDIUM — maintainer-confirmed API)
- Ketcher Vite SWC crash: [GitHub Issue #5565](https://github.com/epam/ketcher/issues/5565) (MEDIUM — known bug, workaround confirmed)
- Ketcher onChange discussion: [GitHub Issue #645](https://github.com/epam/ketcher/issues/645) (MEDIUM — confirms subscribe('change') is the integration path)
- ketcher-core structService types: [unpkg ketcher-core 2.26.0](https://app.unpkg.com/ketcher-core@2.26.0/files/dist/domain/services/struct/structService.types.d.ts) (MEDIUM — confirms ChemicalMimeType.InChIAuxInfo exists)
- React debounce pattern: [Developer Way — debouncing in React](https://www.developerway.com/posts/debouncing-in-react) (HIGH — well-documented pattern)
- CSS custom properties with React: [Josh W. Comeau](https://www.joshwcomeau.com/css/css-variables-for-react-devs/) (HIGH — standard CSS behaviour)
