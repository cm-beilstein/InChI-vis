# Phase 5: Mapping Strip and Preset Molecules - Research

**Researched:** 2026-05-22
**Domain:** React component implementation, PubChem REST API, CSS Module layout restructuring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All 10 molecules from the design handoff: Methane, Ethanol, Benzene, Acetic acid, L-Alanine, Vanillin, Caffeine, (S)-Nicotine, Melatonin, Naloxone.
- **D-02:** Fetch from PubChem REST at click time: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/SDF`. Pass SDF string to `ketcher.setMolecule()`.
- **D-03:** Use specific CIDs (verified by researcher). Researcher must confirm correct stereoisomers.
- **D-04:** Loading state: disable all preset buttons while fetch is in-flight. On failure: console.error, leave canvas unchanged.
- **D-05:** `selectedMolId: string | null` as `useState` in App.tsx. No Zustand store change.
- **D-06:** Canvas overlay always visible when non-empty. Preset active → name + formula + count. User-drawn → formula + count. Empty → hidden.
- **D-07:** MappingStrip derives pairs from `auxMap` (canonical → pool ID) and `atomElements`. Pool ID sort defines draw order. ketcherRank = sorted index + 1.
- **D-08:** MappingStrip returns null when `Object.keys(auxMap).length === 0`.
- **D-09:** Component order: `<KetcherPanel>` → `<InchiSection>` → `<MappingStrip>` → `<Footnote>` → `<Explanation>`.
- **D-10:** Three font weights (400/500/600) locked from design handoff. 2-weight rule waived.
- **D-11:** Three spacing non-multiples locked: 18px `.mapping` padding-inline, 10px `.mol-item` padding-block, 14px `.canvas-meta` left. 4× rule waived.

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- MAP-03 (shareable URL): deferred to Phase 6.
- Preset molecule count resolved: use all 10 from design handoff.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAP-01 | Mapping strip shows canonical→Ketcher pairs; identity dimmed; divergent green | D-07 data derivation verified; CSS already in `src/styles.css`; `auxMap`/`atomElements` in store |
| MAP-02 | Footnote strip: InChI definition text + Hover/Click keyboard hint | Static component; CSS already in `src/styles.css` lines 666–689; copy locked from design handoff |
| EDIT-02 | Preset list loads molecule into canvas; full pipeline updates within one debounce cycle | PubChem CORS verified; `setMolecule()` triggers 'change' event; no extra InChI call needed |
| EDIT-03 | Canvas overlay shows name (presets only), formula, heavy-atom count | All source data already in store (`layers[0].text`, `atomElements`); overlay CSS in `src/styles.css` |
</phase_requirements>

---

## Summary

Phase 5 adds three UI features on top of the existing Phase 2–4 pipeline: a MappingStrip component, a Footnote component, and extensions to KetcherPanel (mol-list sidebar + canvas overlay). No new store fields, no new parsing logic, and no URL state are introduced.

All CSS is already present in `src/styles.css` — the design handoff CSS was ported wholesale in an earlier phase. Every class needed by Phase 5 components (`.mapping`, `.pairs`, `.pair`, `.identity`, `.diverges`, `.mol-list`, `.mol-item`, `.canvas-meta`, `.dot`, `.footnote`, `.key-hint`) already exists as global classes. Phase 5 components can reference them directly as global CSS classes (not CSS Modules) or with `className` strings — the same pattern used in prior components.

The one structural complexity is the KetcherPanel layout. Currently, `KetcherPanel.module.css` sets `display: block` to override the global `.ketcher` grid (which references a design-handoff mock toolbar). Phase 5 must add a mol-list column alongside the Editor. The correct approach is to wrap the Editor in a `div.canvas-wrap` and add a `div.mol-list` as a sibling, then change the CSS Module to `display: grid; grid-template-columns: 1fr 240px` — the Ketcher Editor fills the canvas column and renders its own toolbar internally.

**Primary recommendation:** Implement three independent tasks — (1) MappingStrip + Footnote new components, (2) KetcherPanel layout restructure + mol-list sidebar, (3) canvas overlay + App.tsx selectedMolId state + handleMolSelect.

---

## Standard Stack

### Core (no new installs needed)

All required dependencies are already installed.

| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| React | ^18.3.1 | Component rendering | Already installed |
| Zustand | 5.0.13 | Store read (`auxMap`, `atomElements`, `layers`) | Already installed |
| CSS Modules | built-in Vite | Component scoped styles | Already in use |
| `fetch` (native) | browser built-in | PubChem SDF retrieval | No library needed |

### No New Dependencies

Phase 5 requires zero new npm packages. All needed:
- Zustand store fields (`auxMap`, `atomElements`, `layers`) — already populated by Phase 2
- CSS tokens — already in `src/styles.css`
- `ketcher.setMolecule()` — already part of ketcher-core Ketcher type
- Native `fetch` — PubChem returns `access-control-allow-origin: *` (CORS confirmed)

[VERIFIED: curl -I https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/241/SDF — response includes `access-control-allow-origin: *`]

---

## PubChem CID Verification

**All 10 CIDs verified against PubChem REST API.** [VERIFIED: PubChem REST API, 2026-05-22]

| Molecule | CID | Formula | IUPAC Name / Stereochemistry |
|----------|-----|---------|------------------------------|
| Methane | 297 | CH4 | methane |
| Ethanol | 702 | C2H6O | ethanol |
| Benzene | 241 | C6H6 | benzene |
| Acetic acid | 176 | C2H4O2 | acetic acid |
| L-Alanine | 5950 | C3H7NO2 | (2S)-2-aminopropanoic acid — correct L/S stereoisomer |
| Vanillin | 1183 | C8H8O3 | 4-hydroxy-3-methoxybenzaldehyde — no stereocenters, correct |
| Caffeine | 2519 | C8H10N4O2 | 1,3,7-trimethylpurine-2,6-dione — no stereocenters, correct |
| (S)-Nicotine | 89594 | C10H14N2 | 3-[(2S)-1-methylpyrrolidin-2-yl]pyridine — correct S enantiomer |
| Melatonin | 896 | C13H16N2O2 | N-[2-(5-methoxy-1H-indol-3-yl)ethyl]acetamide — no stereocenters, correct |
| Naloxone | 5284596 | C19H21NO4 | (4R,4aS,7aR,12bS) opioid antagonist — correct stereoisomers |

All CIDs match the molecules from `design_handoff_explain_that_inchi/molecules.js`. Formulas match the design handoff `formula` fields. Stereo-sensitive molecules (L-Alanine, (S)-Nicotine, Naloxone) confirmed correct enantiomers by IUPAC name.

**SDF endpoint format:** `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/SDF`
**Content-Type returned:** `chemical/x-mdl-sdfile`
**CORS:** `access-control-allow-origin: *` — browser fetch works without proxy.

---

## Architecture Patterns

### Recommended Project Structure (Phase 5 additions)

```
src/
├── components/
│   ├── KetcherPanel.tsx          (MODIFY — add mol-list + canvas overlay + new props)
│   ├── KetcherPanel.module.css   (MODIFY — switch to 1fr 240px grid)
│   ├── MappingStrip.tsx          (NEW)
│   ├── MappingStrip.module.css   (NEW — minimal; most styles are global in src/styles.css)
│   ├── Footnote.tsx              (NEW — static, no props, no CSS module needed)
│   └── ...existing...
├── data/
│   └── molecules.ts              (NEW — port MOLECULES array from design_handoff/molecules.js as TypeScript)
└── App.tsx                       (MODIFY — add selectedMolId state, handleMolSelect, new props to KetcherPanel)
```

### Pattern 1: MappingStrip Data Derivation (D-07)

[VERIFIED: src/store.ts — `auxMap: AuxMap` is canonical→poolId, `atomElements: Record<number, string>`]

```typescript
// Source: CONTEXT.md D-07, App.tsx poolId mapping logic
const auxMap = useInchiStore(s => s.auxMap);
const atomElements = useInchiStore(s => s.atomElements);

// 1. Sort pool IDs to get draw order
const poolIds = Object.values(auxMap).sort((a, b) => a - b);

// 2. Build pairs
const pairs = (Object.keys(auxMap) as unknown as number[]).map(cStr => {
  const c = Number(cStr);
  const ketcherRank = poolIds.indexOf(auxMap[c]) + 1;
  return { k: ketcherRank, c, el: atomElements[c] ?? '?' };
});

// 3. Sort by ketcherRank ascending
pairs.sort((a, b) => a.k - b.k);
```

**Critical:** `auxMap` values are Pool IDs (cumulative across draws, non-sequential). Sorted position gives draw-order rank, NOT the pool ID value itself. This is the same transformation already performed in App.tsx `handleChange` — MappingStrip works in the opposite direction from the same data.

### Pattern 2: KetcherPanel Layout Restructure

The current `KetcherPanel.module.css` uses `display: block` to suppress the global `.ketcher` 3-column grid (which assumed a mock toolbar column from the design handoff). Phase 5 needs a 2-column layout: editor canvas on the left, mol-list on the right.

**Approach:** Change the CSS Module wrapper to `display: grid; grid-template-columns: 1fr 240px`. Wrap the `<Editor>` in a `<div className={styles.canvasWrap}>` so the Editor fills the canvas column. Add `<div className="mol-list">` as a sibling (using global CSS class from `src/styles.css`).

```typescript
// KetcherPanel.tsx new structure
<div className={styles.ketcher}>
  <div className={styles.canvasWrap}>
    <Editor ... />
    {!isReady && <div className={styles.loadingOverlay}>Loading editor…</div>}
    {formula !== null && (
      <div className="canvas-meta">
        <span className="dot" />
        {molName && <span><b>{molName}</b></span>}
        <span>{formula}</span>
        <span>· {heavyAtomCount} heavy atom{heavyAtomCount === 1 ? '' : 's'}</span>
      </div>
    )}
  </div>
  <div className="mol-list">
    <div className="mol-list-header">Examples</div>
    {MOLECULES.map(m => (
      <button
        key={m.id}
        className={'mol-item' + (selectedMolId === m.id ? ' active' : '')}
        onClick={() => !isLoading && onMolSelect(m.id)}
        disabled={isLoading}
      >
        <span className="mol-name">{m.name}</span>
        <span className="mol-formula">{m.formula}</span>
      </button>
    ))}
  </div>
</div>
```

[VERIFIED: src/components/KetcherPanel.module.css — current `display: block` confirmed; src/styles.css line 307 — `.mol-list` CSS exists; `src/styles.css` line 693 — `@media (max-width: 900px) { .mol-list { display: none; } }` already present]

### Pattern 3: handleMolSelect in App.tsx

```typescript
// App.tsx additions
const [selectedMolId, setSelectedMolId] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);

const handleMolSelect = async (id: string) => {
  const mol = MOLECULES.find(m => m.id === id);
  if (!mol || !ketcherRef.current) return;
  setIsLoading(true);
  setSelectedMolId(id);
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${mol.cid}/SDF`
    );
    if (!res.ok) throw new Error(`PubChem ${res.status}`);
    const sdf = await res.text();
    await ketcherRef.current.setMolecule(sdf);
    // No manual InChI call needed — setMolecule() triggers editor 'change'
    // which fires handleChange → getInchi → store update automatically
  } catch (err) {
    console.error('Preset load failed:', err);
    setSelectedMolId(null); // revert active state on error (per D-04)
  } finally {
    setIsLoading(false);
  }
};
```

**The user-drawn reset:** When the user draws freely, `selectedMolId` should become `null`. Add to `handleChange` in App.tsx:

```typescript
// Inside handleChange, after store update:
// Only reset selectedMolId if the change was user-initiated, not from setMolecule().
// Guard: use a separate ref (isSettingMoleculeRef) to distinguish.
```

[ASSUMED] — The exact mechanism for distinguishing user-draws from setMolecule()-triggered changes requires a `isSettingMoleculeRef` guard. The current `isHighlightingRef` pattern provides the model. This is straightforward but must be verified during implementation.

### Pattern 4: MOLECULES TypeScript Data

Port from `design_handoff_explain_that_inchi/molecules.js` — retain only `id`, `name`, `formula` fields. Add `cid` for PubChem lookup. Drop atom/bond coordinate data (not needed — we fetch from PubChem).

```typescript
// src/data/molecules.ts
export interface MoleculePreset {
  id: string;
  name: string;
  formula: string;
  cid: number;
}

export const MOLECULES: MoleculePreset[] = [
  { id: 'methane',   name: 'Methane',      formula: 'CH₄',               cid: 297     },
  { id: 'ethanol',   name: 'Ethanol',       formula: 'C₂H₆O',        cid: 702     },
  { id: 'benzene',   name: 'Benzene',       formula: 'C₆H₆',         cid: 241     },
  { id: 'acetic',    name: 'Acetic acid',   formula: 'C₂H₄O₂',  cid: 176     },
  { id: 'alanine',   name: 'L-Alanine',     formula: 'C₃H₇NO₂', cid: 5950    },
  { id: 'vanillin',  name: 'Vanillin',      formula: 'C₈H₈O₃',  cid: 1183    },
  { id: 'caffeine',  name: 'Caffeine',      formula: 'C₈H₁₀N₄O₂', cid: 2519 },
  { id: 'nicotine',  name: '(S)-Nicotine',  formula: 'C₁₀H₁₄N₂',  cid: 89594 },
  { id: 'melatonin', name: 'Melatonin',     formula: 'C₁₃H₁₆N₂O₂', cid: 896 },
  { id: 'naloxone',  name: 'Naloxone',      formula: 'C₁₉H₂₁NO₄', cid: 5284596 },
];
```

[VERIFIED: PubChem REST API 2026-05-22 — all CIDs confirmed; formulas match design_handoff/molecules.js]

### Anti-Patterns to Avoid

- **Using CSS Modules for `.mapping`, `.mol-list`, etc.:** These are global classes already in `src/styles.css`. Do not redefine them in `.module.css` files — use `className="mapping"` as plain strings. The CSS Module file for MappingStrip only needs any local-scope overrides (likely none needed).
- **Calling `getInchi()` after `setMolecule()`:** `setMolecule()` triggers the editor 'change' event which fires `handleChange` automatically. Calling `getInchi()` directly in `handleMolSelect` creates a race condition.
- **Re-declaring CSS that already exists:** `src/styles.css` already contains complete CSS for `.mapping`, `.pairs`, `.pair`, `.identity`, `.diverges`, `.mol-list`, `.mol-item`, `.canvas-meta`, `.dot`, `.footnote`, `.key-hint`. Do not rewrite these.
- **Moving `selectedMolId` into Zustand:** Per D-05, this is local UI state in App.tsx using `useState`. The store is for InChI pipeline data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS proxy for PubChem | Custom proxy / backend | Native `fetch` direct to PubChem | PubChem provides `access-control-allow-origin: *` — confirmed working |
| SDF fetching / caching | Cache layer | Direct `fetch` on each click | 10 molecules, rare re-clicks; cache adds complexity for no measurable benefit |
| CSS transition logic | JS state for hover | CSS `transition` already in `src/styles.css` | `.mol-item` (150ms), `.pair` (160ms) already declared |

---

## CSS Findings

**All Phase 5 CSS already exists in `src/styles.css`.** [VERIFIED: grep search 2026-05-22]

| CSS Block | Location in src/styles.css | Status |
|-----------|---------------------------|--------|
| `.canvas-meta`, `.dot`, `@keyframes pulse` | lines 197–223 | Already present |
| `.mol-list`, `.mol-list-header`, `.mol-item`, `.mol-item.active` | lines 307–349 | Already present |
| `.mapping`, `.mapping-label`, `.pairs`, `.pair`, `.identity`, `.diverges` | lines 459–507 | Already present |
| `.footnote`, `.footnote .key-hint`, `.footnote kbd` | lines 666–689 | Already present |
| `@media (max-width: 900px) { .mol-list { display: none } }` | line 693 | Already present |

**KetcherPanel.module.css changes needed:** Remove `display: block`. Add `display: grid; grid-template-columns: 1fr 240px`. Add `.canvasWrap` rule with `position: relative; overflow: hidden` (to hold the Editor + loading overlay + canvas-meta at correct positions). Adjust `height: 650px` to remain on `.ketcher`.

---

## Common Pitfalls

### Pitfall 1: selectedMolId not reset on user draw

**What goes wrong:** User loads a preset → then draws atoms manually → canvas overlay still shows the preset name.
**Why it happens:** `handleChange` does not set `selectedMolId` to null when the user draws.
**How to avoid:** Use an `isSettingMoleculeRef` boolean ref (set true before `setMolecule()`, false after it resolves). In `handleChange`, if `isSettingMoleculeRef.current` is false (user-initiated draw), call `setSelectedMolId(null)`.
**Warning signs:** Overlay shows "Benzene" after user manually adds an atom.

### Pitfall 2: Pool ID sort assumption

**What goes wrong:** MappingStrip shows wrong ketcherRank values.
**Why it happens:** Pool IDs are cumulative across draws (not 0, 1, 2, ...). Sorting by pool ID value gives draw order only because Ketcher assigns IDs monotonically per draw session. If IDs happen to be non-monotonic (e.g. after undo/redo), sort order would be wrong.
**How to avoid:** Follow D-07 exactly — `Object.values(auxMap).sort((a,b) => a-b)` then `indexOf`. This is the same approach already tested in `parseAuxMapping.test.ts`.
**Warning signs:** Pair chips show incorrect ketcherRank for benzene (compare against the test fixture mapping).

### Pitfall 3: KetcherPanel layout regression

**What goes wrong:** Adding the mol-list column breaks the Editor rendering or the loading overlay.
**Why it happens:** The Editor fills its parent container. Changing from `display: block` to `display: grid` changes how the Editor sizes itself. The loading overlay relies on `position: absolute; inset: 0` inside a `position: relative` parent.
**How to avoid:** Wrap Editor in `div.canvasWrap` (CSS Module class, `position: relative; overflow: hidden; height: 100%`). The `.ketcher` grid has `height: 650px`. `.canvasWrap` fills the first column fully. Loading overlay positions inside `.canvasWrap`.
**Warning signs:** Editor renders at zero height or loading overlay doesn't cover the Editor.

### Pitfall 4: setMolecule and isHighlightingRef

**What goes wrong:** `setMolecule()` call triggers the editor 'change' event → `handleChange` fires → `isHighlightingRef.current` may be stale → either a highlight loop or incorrect InChI generation.
**Why it happens:** `isHighlightingRef` is set to true during highlight operations. `setMolecule()` is a different operation but uses the same 'change' event bus.
**How to avoid:** Use a separate `isSettingMoleculeRef` rather than reusing `isHighlightingRef`. Set true immediately before the `await setMolecule()` call, false in the finally block. In `handleChange`, skip the `selectedMolId` reset (not the InChI call) when `isSettingMoleculeRef.current` is true.
**Warning signs:** After preset load, `selectedMolId` resets to null immediately.

### Pitfall 5: formula/count derived incorrectly

**What goes wrong:** Canvas overlay shows wrong heavy-atom count or formula.
**Why it happens:** `formula` comes from `layers[0].text` (the formula layer text, e.g. "C6H6") not the preset's hardcoded formula. `heavyAtomCount` comes from `Object.keys(atomElements).length` not `Object.keys(auxMap).length`.
**How to avoid:** Follow D-06 exactly. Use `layers.length > 0 ? layers[0].text : null` for formula. Use `Object.keys(atomElements).length` for count. Both are store reads.
**Warning signs:** Overlay shows formula from design handoff data instead of live InChI formula layer.

---

## Code Examples

### MappingStrip full render

```tsx
// Source: design_handoff_explain_that_inchi/app.jsx lines 319–357 + CONTEXT.md D-07
import { useInchiStore } from '../store';

export function MappingStrip() {
  const auxMap = useInchiStore(s => s.auxMap);
  const atomElements = useInchiStore(s => s.atomElements);

  if (Object.keys(auxMap).length === 0) return null;

  const poolIds = Object.values(auxMap).sort((a, b) => a - b);
  const pairs = (Object.keys(auxMap) as unknown as number[])
    .map(cStr => {
      const c = Number(cStr);
      return { k: poolIds.indexOf(auxMap[c]) + 1, c, el: atomElements[c] ?? '?' };
    })
    .sort((a, b) => a.k - b.k);

  const anyDiverges = pairs.some(p => p.k !== p.c);

  return (
    <div className="mapping" aria-label="Ketcher to InChI atom mapping">
      <span className="mapping-label">
        Ketcher&nbsp;<span style={{ color: 'var(--ink-faint)' }}>→</span>&nbsp;InChI
      </span>
      <span className="pairs">
        {pairs.map((p, i) => (
          <span
            key={i}
            className={'pair' + (p.k === p.c ? ' identity' : ' diverges')}
            title={`Atom drawn ${p.k}th in Ketcher is canonical #${p.c} in InChI`}
          >
            <span className="k">{p.k}</span>
            <span className="arrow">→</span>
            <span className="c">{p.c}</span>
            <span className="el">{p.el}</span>
          </span>
        ))}
        {!anyDiverges && (
          <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic', marginLeft: 4 }}>
            (identity — drawing order already matches the canonical numbering)
          </span>
        )}
      </span>
    </div>
  );
}
```

### Footnote (static)

```tsx
// Source: design_handoff_explain_that_inchi/app.jsx lines 475–488
export function Footnote() {
  return (
    <div className="footnote">
      <span>
        InChI · IUPAC International Chemical Identifier ·
        an open-standard line notation for chemical structure
      </span>
      <span className="key-hint">
        <kbd>Hover</kbd> a coloured chunk to highlight ·
        <kbd>Click</kbd> a molecule on the right to switch
      </span>
    </div>
  );
}
```

### Canvas overlay conditional render

```tsx
// Source: design_handoff_explain_that_inchi/app.jsx lines 76–82 + CONTEXT.md D-06
{formula !== null && (
  <div className="canvas-meta">
    <span className="dot" />
    {molName && <span><b>{molName}</b></span>}
    <span>{formula}</span>
    <span>· {heavyAtomCount} heavy atom{heavyAtomCount === 1 ? '' : 's'}</span>
  </div>
)}
```

---

## State of the Art

| Aspect | Current | Phase 5 Change |
|--------|---------|----------------|
| KetcherPanel layout | `display: block` — Editor fills entire div | `display: grid; 1fr 240px` — Editor in canvas col, mol-list in sidebar col |
| App.tsx state | `isReady`, `ketcherRef`, `isHighlightingRef`, `generationRef` | Add `selectedMolId: string \| null`, `isLoading: boolean`, `isSettingMoleculeRef` |
| Store fields | `inchi`, `layers`, `auxMap`, `atomElements`, `hoverIdx`, `subHover` | No change — all Phase 5 data reads existing fields |
| Component tree | `Header → KetcherPanel → InchiSection → Explanation` | `Header → KetcherPanel → InchiSection → MappingStrip → Footnote → Explanation` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `isSettingMoleculeRef` pattern is the correct approach to distinguish setMolecule() from user draws | Architecture Patterns (Pattern 3) | selectedMolId may not reset correctly on user draw; worst case: stale name in overlay |
| A2 | Pool IDs from `Object.values(auxMap)` are always monotonically assigned within a session, making sort-by-value equivalent to draw order | Architecture Patterns (Pattern 1) | Wrong ketcherRank values in mapping strip; unlikely — App.tsx already relies on this invariant |

---

## Open Questions (RESOLVED)

1. **selectedMolId reset on user draw** — RESOLVED: Use `isSettingMoleculeRef` pattern (set ref to `true` before `await setMolecule()`, clear in `finally`). `handleChange` checks `if (isSettingMoleculeRef.current) return` and skips the reset. Pattern is identical to `isHighlightingRef` already proven in Phase 4. If the 'change' event fires asynchronously after `finally`, the ref will already be `false` — correct behavior. Empirical validation during Wave 1 execution will confirm timing.

2. **Canvas overlay z-index within new grid layout** — RESOLVED: Add `position: relative` to `.canvasWrap` in `KetcherPanel.module.css`. This establishes the stacking context required for `position: absolute` children (canvas overlay at `z-index: 2`, loading overlay at `z-index: 1001`). The `.canvasWrap` div wraps the Ketcher `<Editor>` so the new grid column boundary does not break the overlay stacking.

---

## Environment Availability

Step 2.6: SKIPPED (no external CLI tools or services required beyond PubChem HTTPS fetch, which is confirmed available via CORS-verified HTTP 200 response).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

[VERIFIED: vitest.config.ts exists; 170 tests passing as of 2026-05-22 baseline run]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | `deriveMappingPairs(auxMap, atomElements)` returns sorted pairs with correct identity/diverges classification | unit | `npx vitest run src/lib/__tests__/mappingPairs.test.ts` | Wave 0 |
| MAP-01 | Empty `auxMap` returns null from MappingStrip (guard) | unit | covered in mappingPairs.test.ts | Wave 0 |
| MAP-02 | Footnote renders static text — visual verification only | manual | — | manual only |
| EDIT-02 | `handleMolSelect` fetches correct PubChem URL, calls setMolecule | unit (mock fetch) | `npx vitest run src/__tests__/handleMolSelect.test.ts` | Wave 0 |
| EDIT-02 | Error case: fetch failure → selectedMolId reverts, isLoading false | unit (mock fetch) | covered in handleMolSelect.test.ts | Wave 0 |
| EDIT-03 | Canvas overlay shows correct content from store layers + atomElements | unit | `npx vitest run src/__tests__/canvasOverlay.test.ts` | Wave 0 |

**Rationale for manual-only (MAP-02):** Footnote contains only static text and `<kbd>` elements. No logic to test. Visual correctness verified in browser.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (170 + new tests) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/mappingPairs.test.ts` — unit tests for pair derivation logic (MAP-01)
- [ ] `src/__tests__/handleMolSelect.test.ts` — mock fetch tests for preset load + error handling (EDIT-02)
- [ ] `src/__tests__/canvasOverlay.test.ts` — canvas overlay content derivation (EDIT-03)

*(Existing 170 tests cover Phases 1–4 and remain green — no regression risk from Phase 5 additions.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no auth in this tool |
| V3 Session Management | no | stateless, no sessions |
| V4 Access Control | no | public read-only tool |
| V5 Input Validation | partial | PubChem SDF string passed to `ketcher.setMolecule()` — Ketcher parses it internally; no user text input processed |
| V6 Cryptography | no | no encryption required |

**Threat relevant to Phase 5:** PubChem SDF content is fetched and passed to `ketcher.setMolecule()`. Ketcher validates and parses SDF internally. No raw SDF content is rendered to DOM as HTML. The only risk would be a compromised PubChem response — this is out of scope for a public educational tool with no auth.

**No security implementation work required for Phase 5.**

---

## Sources

### Primary (HIGH confidence)

- `src/store.ts` — confirmed `auxMap`, `atomElements`, `layers` fields and types
- `src/App.tsx` — confirmed existing patterns: `useState`, `useRef`, `isHighlightingRef`, `generationRef`
- `src/components/KetcherPanel.tsx` + `KetcherPanel.module.css` — confirmed current `display: block` override
- `src/styles.css` — confirmed all Phase 5 CSS classes present (lines 197–223, 307–349, 459–507, 666–689)
- `design_handoff_explain_that_inchi/app.jsx` lines 52–101, 319–357, 475–488 — exact markup patterns
- `design_handoff_explain_that_inchi/molecules.js` — 10 MOLECULES array confirmed
- PubChem REST API (curl verified 2026-05-22) — CIDs 297, 702, 241, 176, 5950, 1183, 2519, 89594, 896, 5284596 confirmed with formulas and IUPAC names
- PubChem CORS (curl -I verified) — `access-control-allow-origin: *` on SDF endpoint
- Vitest baseline (npx vitest run — 170/170 passing 2026-05-22)

### Secondary (MEDIUM confidence)

- CONTEXT.md D-01 through D-11 — all implementation decisions
- 05-UI-SPEC.md — visual contract, interaction contracts, component inventory

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps, all existing
- Architecture: HIGH — patterns derived from existing code + verified design handoff
- PubChem CIDs: HIGH — verified against live API
- Pitfalls: HIGH — derived from existing codebase patterns and prior phase learnings
- CSS: HIGH — grep-verified all classes present in src/styles.css

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable domain — PubChem CIDs are permanent; CSS is project-owned)
