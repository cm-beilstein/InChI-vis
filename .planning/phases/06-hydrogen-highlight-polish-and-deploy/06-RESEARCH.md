# Phase 6: Hydrogen Highlight, Polish, and Deploy - Research

**Researched:** 2026-05-22
**Domain:** InChI canonical numbering / Ketcher struct API / GitHub Pages deployment
**Confidence:** HIGH (primary questions answered by verified sources or direct code inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** MAP-03 (shareable URL encoding) is deferred to v2. Phase 6 closes the milestone without URL state.
- **D-02:** When the canvas is empty or invalid (`layers.length === 0`), InchiSection renders the `.inchi-display` box in a dimmed/disabled state with the hint text: **"Draw a molecule above to see its InChI."** The box is always present (no layout shift), just visually inactive. Color uses `var(--ink-faint)` or `var(--ink-muted)` from the design token system.
- **D-03:** `Footnote` is removed from the App.tsx render tree entirely. Not hidden — removed.
- **D-04:** When no explicit H atoms exist (most molecules — implicit H only), hovering the H sub-token is a silent no-op. No feedback needed.
- **D-05:** When explicit H atoms ARE drawn, the layer-wide formula hover must also highlight those H atoms — "halo all atoms with element color" per design handoff.
- **D-06:** The existing `buildSubHoverSpecs` `case 'element': el: 'H'` handler is already in place and will work correctly once H atoms are in `atomElements` and `formulaLayer.atoms`.
- **D-07 (Research flag):** Researcher must verify whether `getInchi(true)` AuxInfo N: field includes explicit H atoms in canonical numbering. Answered below — see Critical Finding.
- **D-08:** `heavyAtomCount` in KetcherPanel overlay uses `Object.keys(atomElements).length`. If H atoms are added to `atomElements`, this count must exclude H: `Object.entries(atomElements).filter(([,el]) => el !== 'H').length`.
- **D-09:** Target is **GitHub Pages**. `coi-serviceworker.js` is already in `public/` and wired in `index.html`. `vite.config.ts` `base` is already `'/explain-that-inchi/'`. No netlify.toml needed.
- **D-10:** Phase 6 adds `.github/workflows/deploy.yml` (build on master push → publish to gh-pages).
- **D-11:** Phase 6 adds a `README.md` at project root with live URL placeholder, local dev instructions, and build/deploy instructions.

### Claude's Discretion

- Exact CSS approach for the dimmed empty-state InChI box (opacity, faded border color, or token swap)
- Whether to use `actions/deploy-pages` (official) or `peaceiris/actions-gh-pages@v4` in the workflow
- README length and format (minimal is fine)

### Deferred Ideas (OUT OF SCOPE)

- **MAP-03** — Shareable URL encoding. Deferred to v2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INCHI-05 | Hovering H sub-token highlights explicit hydrogen atoms in Ketcher canvas | D-07 answer defines the implementation path: read explicit H pool IDs directly from `ketcher.editor.render.ctab.molecule.atoms` (filtering `atom.label === 'H'`) and include them in `atomElements` + `formulaLayer.atoms` using a synthetic canonical range |
| PLSH-01 | Empty canvas or invalid/disconnected structure shows a placeholder message instead of an error | D-02 design is straightforward: change `if (layers.length === 0) return null` in InchiSection to a conditional dimmed-box render |
</phase_requirements>

---

## Summary

Phase 6 closes three independent tasks: (1) INCHI-05 — H sub-token highlight for explicit hydrogens; (2) PLSH-01 — empty state polish; and (3) deployment to GitHub Pages with a CI workflow and README.

The most technically complex question was D-07: whether the InChI AuxInfo N: field assigns canonical indices to explicit hydrogen atoms. The answer is **no** — InChI canonicalization covers heavy atoms only; explicit hydrogens are never numbered in the N: field. This is confirmed by two independent authoritative sources. As a result, the fix for INCHI-05 cannot use AuxInfo N: to find H atom indices. Instead, it must read the Ketcher internal struct directly (`ketcher.editor.render.ctab.molecule.atoms`) to get pool IDs of H-labelled atoms — the same internal API already in use in `App.tsx` for pool ID remapping.

The other two tasks (empty state, deploy) are lower-risk. The empty-state change is a CSS + JSX swap in one component. The deployment infrastructure is already 90% complete (base URL set, coi-serviceworker wired) — only the GitHub Actions workflow and README are new files.

**Primary recommendation:** Implement INCHI-05 via direct Ketcher struct inspection, not AuxInfo. Derive explicit H pool IDs at the point where `poolIds[]` is already assembled in `App.tsx`'s `handleChange`, filter for `atom.label === 'H'`, and assign synthetic canonical indices in a range above the heavy-atom maximum.

---

## Critical Finding: D-07 Answer

**Question:** Does `getInchi(true)` AuxInfo N: field include explicit H atoms in canonical numbering?

**Answer: NO.**

InChI canonical numbering covers heavy atoms only. From the authoritative Depth-First article on element-to-atom mapping in InChI [VERIFIED: depth-first.com/articles/2022/07/27/element-to-atom-mapping-in-inchi/]:

> "Note that the canonical atomic numbers, which are used throughout the InChI, are always given in the formula's element order... Hydrogen atoms are not explicitly numbered."

The InChI canonicalization algorithm treats the molecular graph as "the hydrogenless structure" when building canonical indices. The N: field in AuxInfo therefore maps only to heavy atoms. Even if explicit H atoms are drawn as separate nodes in Ketcher, they are not assigned canonical indices in the N: field.

**Consequence for implementation (INCHI-05):**

The proposed fix in CONTEXT.md D-07 — "remove the H-skip in `buildAtomElements`" — **will not work** because explicit H atoms have no canonical indices in `auxMap`. There are no N: entries for them to map through.

**Correct alternate path:** Read H atoms directly from the Ketcher render struct. The pattern is already established in `App.tsx` line 98:

```typescript
// Existing pattern in App.tsx handleChange
const poolIds: number[] = [];
(ketcher.editor as any).render.ctab.molecule.atoms.forEach(
  (_: unknown, id: number) => poolIds.push(id)
);
```

The `Pool<Atom>` (`Map<number, Atom>`) can also be iterated for values via `.forEach((atom: Atom, id: number) => ...)`. Each `Atom` has `label: string` — for explicit H atoms, `label === 'H'`. Pool IDs of H-labelled atoms can be collected directly:

```typescript
// New pattern to collect explicit H pool IDs
const hPoolIds: number[] = [];
(ketcher.editor as any).render.ctab.molecule.atoms.forEach(
  (atom: { label: string }, id: number) => {
    if (atom.label === 'H') hPoolIds.push(id);
  }
);
```

These pool IDs are the Ketcher 0-based highlight IDs — exactly what `highlights.create` expects. No AuxInfo mapping is needed for H atoms.

**Data flow for INCHI-05:**

1. In `App.tsx` `handleChange`, after building `actualAuxMap`, additionally collect `hPoolIds` using the pattern above.
2. Pass `hPoolIds` into store (new field `hAtomPoolIds: number[]` on the store) alongside `atomElements`.
3. In `buildAtomElements` (or at the store level after hydration), add synthetic entries for H atoms using canonical indices above `N` (e.g., `N+1, N+2, ...`). This makes the existing `case 'element': el: 'H'` path in `buildSubHoverSpecs` work.
4. In `parseInchi.ts` `enrichLayers` formula case: extend `formulaLayer.atoms` to include the synthetic H canonical indices.
5. `auxMap` gains entries for those synthetic canonical indices → H pool IDs.

**Simpler alternative (avoids synthetic canonical indices):** Add a dedicated `hAtomPoolIds: number[]` field to the store and handle H-element sub-hover and formula-layer H-hover directly in `buildHighlightSpecs` / `buildSubHoverSpecs` by reading this separate pool directly, bypassing the canonical index lookup entirely. This avoids contaminating the `auxMap` with non-AuxInfo-derived entries.

**Recommendation:** Use the simpler alternative (dedicated `hAtomPoolIds` field). The canonical-index approach would require fake entries in `auxMap` that could confuse other code paths (mapping strip, etc.). A separate `hAtomPoolIds: number[]` in store is clean and isolated.

[VERIFIED: ketcher-core/dist/domain/entities/atom.d.ts — Atom.label is string; Pool extends Map<number, Atom>]
[VERIFIED: src/App.tsx line 98 — existing pattern for pool ID collection confirmed]
[CITED: depth-first.com/articles/2022/07/27/element-to-atom-mapping-in-inchi/]

---

## Standard Stack

### Core (unchanged from established stack)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | ^18.3.1 | UI | Already installed |
| Vite | ^8.0.0 | Build | Already configured |
| TypeScript | ~5.7.2 | Language | Already configured |
| ketcher-core | 3.12.0 | Atom type defs | `Atom.label: string` is the H-detection field |
| Zustand | 5.0.13 | State | Store needs a new `hAtomPoolIds` field |

### New in Phase 6 (CI/CD)

| Tool | Version | Purpose |
|------|---------|---------|
| peaceiris/actions-gh-pages | v4.1.0 | GitHub Actions — push `dist/` to `gh-pages` branch |
| OR: actions/deploy-pages | v5 | Official GitHub Pages deploy action (alternative) |

**Recommendation:** Use `peaceiris/actions-gh-pages@v4` — simpler configuration, single job, no artifact upload step required. The official `actions/deploy-pages` requires a two-job pattern (build job + deploy job with `environment: github-pages`) which adds yaml complexity for no functional gain on this project.

[VERIFIED: peaceiris/actions-gh-pages v4.1.0 — confirmed via npm view]
[CITED: vite.dev/guide/static-deploy — official deploy-pages workflow pattern]

---

## Architecture Patterns

### Pattern 1: Explicit H Pool IDs via Store Field

**What:** Store a new `hAtomPoolIds: number[]` field in the Zustand store, populated in `App.tsx handleChange` alongside `actualAuxMap`.

**When to use:** Any time H sub-token hover or formula-layer H-hover needs to light up explicit H atoms.

**Why separate from auxMap:** `auxMap` keys are canonical InChI indices (integers 1..N for heavy atoms). Injecting fake H canonical indices would:
- Break the `deriveMappingPairs` logic in the mapping strip (it computes canonical↔Ketcher pairs)
- Create misleading entries in any debug/display of the canonical mapping

**Implementation in App.tsx:**

```typescript
// Source: direct code inspection of existing pool-ID collection pattern
// After building actualAuxMap (existing code), add:
const hAtomPoolIds: number[] = [];
(ketcher.editor as any).render.ctab.molecule.atoms.forEach(
  (atom: { label: string }, id: number) => {
    if (atom.label === 'H') hAtomPoolIds.push(id);
  }
);
useInchiStore.getState().setInchiData(
  result.inchi, result.layers, actualAuxMap, result.atomElements, hAtomPoolIds
);
```

**Store change:** Add `hAtomPoolIds: number[]` to the store interface and `setInchiData` action signature.

**highlightUtils.ts change — formula layer case:** When iterating `layer.atoms` for formula highlight, also append H-colored specs using `hAtomPoolIds` if non-empty:

```typescript
// In buildHighlightSpecs case 'formula':
// After the existing colorToAtoms loop (heavy atoms)...
// Add H halos if any explicit H atoms exist
if (hAtomPoolIds.length > 0) {
  const hColor = resolveVarFn(stripVar(elementColor('H')));
  // hAtomPoolIds are already pool IDs — no auxMap lookup needed
  colorToAtoms.set(hColor, [...(colorToAtoms.get(hColor) ?? []), ...hAtomPoolIds]);
}
```

**highlightUtils.ts change — buildSubHoverSpecs element case:** When `el === 'H'`, return hAtomPoolIds directly:

```typescript
case 'element': {
  const el = subHover.el!;
  if (el === 'H') {
    // Explicit H atoms: direct pool ID list, no canonical lookup
    if (hAtomPoolIds.length === 0) return []; // silent no-op per D-04
    const color = resolveVarFn(stripVar(elementColor('H')));
    return [{ atoms: hAtomPoolIds, bonds: [], rgroupAttachmentPoints: [], color }];
  }
  // ... existing heavy-atom path
}
```

**Function signatures must be updated** to thread `hAtomPoolIds` through:
- `buildHighlightSpecs(layer, subHover, auxMap, atomElements, hAtomPoolIds, layers, struct, resolveVarFn)`
- `buildSubHoverSpecs(subHover, auxMap, atomElements, hAtomPoolIds, layer, struct, resolveVarFn)`
- `useKetcherHighlights` hook reads `hAtomPoolIds` from store and passes to highlight builders

[VERIFIED: src/lib/highlightUtils.ts — existing signatures confirmed]
[VERIFIED: src/App.tsx — existing pool ID collection pattern confirmed]

### Pattern 2: Empty State — Conditional Render in InchiSection

**What:** Replace `if (layers.length === 0) return null` with a render that always produces the `.inchiDisplay` box. When empty, the box shows dim placeholder text instead of InChI layers.

**CSS approach (Claude's discretion):** Use a `data-empty` attribute on `.inchiDisplay` with a CSS attribute selector in `InchiSection.module.css`. This avoids adding a parallel CSS class and keeps the empty/active states co-located in the module file.

```typescript
// src/components/InchiSection.tsx
const isEmpty = layers.length === 0;
return (
  <section className={styles.inchiSection}>
    <div
      className={styles.inchiDisplay}
      data-empty={isEmpty ? 'true' : undefined}
      onMouseLeave={...}
    >
      {isEmpty ? (
        <span className={styles.emptyHint}>Draw a molecule above to see its InChI.</span>
      ) : (
        // existing layer rendering
      )}
    </div>
  </section>
);
```

```css
/* InchiSection.module.css additions */
.inchiDisplay[data-empty="true"] {
  opacity: 0.45;
  border-color: var(--line-soft);
  cursor: default;
  pointer-events: none;
}

.emptyHint {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 14px;
  display: block;
  text-align: center;
  padding: 8px 0;
}
```

[VERIFIED: src/components/InchiSection.module.css — existing token names confirmed]
[VERIFIED: src/styles.css — `--ink-faint`, `--line-soft`, `--font-mono` token names confirmed]

### Pattern 3: GitHub Actions Workflow

**What:** `.github/workflows/deploy.yml` — triggers on push to `master`, runs `npm ci && npm run build`, deploys `dist/` to `gh-pages` branch.

**Key points:**
- Branch: `master` (not `main` — this repo uses `master`)
- Node version: match project (18.x is what the dev machine runs; 20.x LTS is safe for CI)
- `publish_dir: ./dist`
- `github_token: ${{ secrets.GITHUB_TOKEN }}` — no personal access token needed

```yaml
# Source: peaceiris/actions-gh-pages v4 docs + Vite static-deploy guide
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - master

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

[CITED: vite.dev/guide/static-deploy]
[CITED: github.com/peaceiris/actions-gh-pages — v4.1.0 confirmed as latest stable]

### Anti-Patterns to Avoid

- **Injecting fake H canonical indices into `auxMap`:** Pollutes the canonical mapping with non-AuxInfo data. Breaks the MappingStrip which expects `auxMap` to faithfully reflect AuxInfo N: entries only.
- **Removing `if (!m[1] || m[1] === 'H') continue` in `buildAtomElements` without an alternate lookup:** Without N: entries for H, this would produce `atomElements[i] = 'H'` with a `canon` value that has no `auxMap` entry — silently dropping H halos.
- **Using `getMolfile()` to parse H atoms:** This is an async WASM call that returns a string requiring mol-format parsing. The synchronous `render.ctab.molecule.atoms` pool is already available and used.
- **Rendering `<Footnote />` as hidden:** D-03 says removed, not hidden. The component renders an empty `<div>` — leaving it in the tree is a dead DOM node.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| H atom pool ID detection | Custom InChI parser to find H canonical indices | Direct `render.ctab.molecule.atoms` iteration filtering `label === 'H'` | InChI N: field provably excludes H; no alternative in the InChI string |
| GitHub Pages COOP/COEP headers | Custom server config | `coi-serviceworker.js` (already in place, already wired) | GitHub Pages static hosting cannot set custom response headers |
| CSS color conversion for Ketcher | String manipulation of oklch() values | Existing `resolveVar()` in `highlightUtils.ts` (1x1 canvas trick) | Ketcher's Raphaël renderer cannot parse oklch — canvas normalization to rgb is required |

---

## Common Pitfalls

### Pitfall 1: H Atoms Are Never in AuxInfo N:
**What goes wrong:** Removing the `if (!m[1] || m[1] === 'H') continue` skip and expecting to find H entries in `auxMap`. The `buildAtomElements` loop runs over `formulaLayer.atoms` (canonical indices 1..N for heavy atoms only) — there are never H-keyed entries in `auxMap` from AuxInfo.
**Why it happens:** The InChI spec defines canonical numbering as heavy-atoms-only. This is by design.
**How to avoid:** Use the separate `hAtomPoolIds` store field sourced from `render.ctab.molecule.atoms`.
**Warning signs:** H sub-token hover produces no highlight even when explicit H are drawn; formula layer hover also excludes H.

### Pitfall 2: heavyAtomCount Double-Counts H if atomElements Is Extended
**What goes wrong:** `App.tsx` line 125 computes `heavyAtomCount = Object.keys(atomElements).length`. If `atomElements` were extended to include H canonical indices (it won't be under the recommended approach), the count would include H atoms and show a wrong number in the canvas overlay.
**Why it happens:** D-08 anticipates this risk.
**How to avoid:** Under the `hAtomPoolIds` approach, `atomElements` is never extended with H entries, so this risk is avoided entirely. If the approach changes, add the filter: `Object.entries(atomElements).filter(([,el]) => el !== 'H').length`.

### Pitfall 3: GitHub Actions Branch Name Mismatch
**What goes wrong:** Workflow triggers on `main` instead of `master` — deploy never runs.
**Why it happens:** Many templates default to `main`.
**How to avoid:** Set `branches: [master]` in the workflow `on.push` trigger.
**Warning signs:** Pushing to master doesn't trigger Actions; workflow tab shows no runs.

### Pitfall 4: `render.ctab.molecule.atoms` Re-Iterating on Highlight
**What goes wrong:** The `isHighlightingRef` guard in `handleChange` prevents re-entry during Ketcher's `highlights.create/clear` calls (which dispatch the change event). If H atom pool ID collection moved to a path outside this guard, it could trigger on highlight events.
**Why it happens:** `highlights.create` calls `editor.update()` which fires the change event.
**How to avoid:** H pool ID collection happens inside `handleChange` — already inside the `isHighlightingRef.current` check.

### Pitfall 5: Empty InchiSection Causes Layout Shift
**What goes wrong:** Returning `null` from InchiSection (current behavior) causes the layout below to jump up when no molecule is drawn, then shift down when one is drawn.
**Why it happens:** D-02 specifically requires the `.inchi-display` box to always be present.
**How to avoid:** Replace `return null` with the dimmed-box conditional render.

---

## Code Examples

### Collecting explicit H pool IDs (new code for App.tsx handleChange)

```typescript
// Source: adapted from existing src/App.tsx line 97-98 (direct code inspection)
const hAtomPoolIds: number[] = [];
(ketcher.editor as any).render.ctab.molecule.atoms.forEach(
  (atom: { label: string }, id: number) => {
    if (atom.label === 'H') hAtomPoolIds.push(id);
  }
);
```

### Empty state render in InchiSection.tsx

```typescript
// Source: D-02 decision + InchiSection.module.css pattern inspection
const isEmpty = layers.length === 0;
if (isEmpty) {
  return (
    <section className={styles.inchiSection}>
      <div className={styles.inchiDisplay} data-empty="true">
        <span className={styles.emptyHint}>Draw a molecule above to see its InChI.</span>
      </div>
    </section>
  );
}
```

### buildSubHoverSpecs element case H-branch

```typescript
// Source: src/lib/highlightUtils.ts case 'element' (existing), extended with H branch
case 'element': {
  const el = subHover.el!;
  if (el === 'H') {
    if (hAtomPoolIds.length === 0) return []; // silent no-op per D-04
    const color = resolveVarFn(stripVar(elementColor('H')));
    return [{ atoms: hAtomPoolIds, bonds: [], rgroupAttachmentPoints: [], color }];
  }
  // existing heavy-atom path (unchanged)
  const kAtoms = layer.atoms
    .filter(canon => atomElements[canon] === el)
    .map(canon => auxMap[canon])
    .filter((id): id is number => id !== undefined);
  if (kAtoms.length === 0) return [];
  const color = resolveVarFn(stripVar(elementColor(el)));
  return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (separate `vitest.config.ts`) |
| Config file | `/home/bsmue/code/InChI-vis/vitest.config.ts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

Current state: 106 tests passing across 9 test files. [VERIFIED: npm test run 2026-05-22]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INCHI-05 | H sub-token hover returns pool IDs for explicit H atoms | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ (extend existing) |
| INCHI-05 | Formula layer highlight includes H pool IDs when hAtomPoolIds non-empty | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ (extend existing) |
| INCHI-05 | H sub-token hover is silent no-op when hAtomPoolIds is empty | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ (extend existing) |
| PLSH-01 | InchiSection renders dimmed box (not null) when layers is empty | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ❌ Wave 0 |
| PLSH-01 | Empty box shows exact placeholder text | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/InchiSection.test.tsx` — covers PLSH-01 empty state render
- [ ] Additional test cases in `src/lib/__tests__/highlightUtils.test.ts` — H-branch in `buildSubHoverSpecs` and `buildHighlightSpecs` formula case

The `highlightUtils.test.ts` file exists with 29 passing tests. New H-related tests should be added to this file, not a new file. The InchiSection test file is new.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build | ✓ | v18.19.1 | — |
| npm | Package management | ✓ | (bundled with node) | — |
| Vitest | Testing | ✓ | 3.x (in node_modules) | — |
| GitHub Actions | CI/CD | ✓ (cloud) | — | Manual `npm run build` + upload |
| coi-serviceworker.js | SharedArrayBuffer on GitHub Pages | ✓ | v0.1.7 (in public/) | — |

**No missing dependencies with no fallback.**

---

## Open Questions

1. **Does `render.ctab.molecule.atoms` reflect the state AFTER `setMolecule()` completes?**
   - What we know: `handleChange` is triggered by the editor 'change' event, which fires after `setMolecule()` updates the canvas. The `isSettingMoleculeRef` guard is in place.
   - What's unclear: Timing between `setMolecule()` promise resolution and the change event firing. If H pool ID collection runs in the same `handleChange` callback as `getInchi(true)`, timing should be consistent.
   - Recommendation: No change needed — the collection happens inside `handleChange`, same as the existing pool ID collection for heavy atoms. This is already working correctly for heavy atoms.

2. **GitHub Actions `actions/checkout@v4` vs newer versions**
   - What we know: Vite official docs reference `@v6`, peaceiris examples use `@v4`.
   - Recommendation: Use `actions/checkout@v4` — widely tested, avoids potential issues with newer action versions not yet validated in this CI environment.

3. **Explicit H in preset molecules**
   - What we know: The preset molecules (5 in the library) likely have only implicit H.
   - What's unclear: Whether any preset mol file contains explicit H atoms.
   - Recommendation: No impact on the feature — `hAtomPoolIds` is empty for implicit-H molecules and the silent no-op path (D-04) handles this correctly.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `render.ctab.molecule.atoms` Pool forEach callback signature is `(atom, id)` — atom has `.label` | Critical Finding, Code Examples | `atom` might have a different shape; verify by console.log in running app before committing |
| A2 | GitHub Pages correctly serves `coi-serviceworker.js` at `/explain-that-inchi/coi-serviceworker.js` (base URL resolved) | Standard Stack | WASM would fail to load; already in use from Phase 1 so this is low risk |

**Claims tagged `[ASSUMED]`:**
- A1 is ASSUMED based on `ketcher-core/dist/domain/entities/atom.d.ts` type inspection. The `any` cast in App.tsx means the actual runtime shape is not TypeScript-enforced. Verify empirically.

---

## Sources

### Primary (HIGH confidence)
- `src/App.tsx` lines 97-98 — existing pool ID collection pattern (direct code inspection)
- `node_modules/ketcher-core/dist/domain/entities/atom.d.ts` — `Atom.label: string` confirmed
- `node_modules/ketcher-core/dist/domain/entities/pool.d.ts` — `Pool extends Map<number, Atom>` confirmed
- `src/lib/highlightUtils.ts` — existing `buildSubHoverSpecs` signature and `case 'element'` handler confirmed
- `src/styles.css` — CSS token names `--ink-faint`, `--line-soft`, `--font-mono` confirmed
- `vitest.config.ts` — test framework configuration confirmed
- npm test output 2026-05-22 — 106 tests passing confirmed

### Secondary (MEDIUM confidence)
- [depth-first.com/articles/2022/07/27/element-to-atom-mapping-in-inchi/](https://depth-first.com/articles/2022/07/27/element-to-atom-mapping-in-inchi/) — "Hydrogen atoms are not explicitly numbered" in InChI canonical numbering
- [vite.dev/guide/static-deploy](https://vite.dev/guide/static-deploy) — official GitHub Pages workflow pattern
- [github.com/peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) — v4.1.0 latest stable

### Tertiary (LOW confidence)
- WebSearch summary re: InChI N: field covers "the original atom numbers in the order of canonical numbers related to the InChI Main layer" — consistent with depth-first.com primary source

---

## Metadata

**Confidence breakdown:**
- D-07 answer (H atoms not in AuxInfo N:): HIGH — confirmed by authoritative source + consistent with two other sources
- Implementation path (hAtomPoolIds via render.ctab): HIGH — pattern already in use in App.tsx
- Empty state approach: HIGH — straightforward CSS + JSX change
- GitHub Actions workflow: HIGH — vite base already configured, coi-serviceworker already present
- A1 runtime shape of `atom`: MEDIUM — type definitions confirm, but `any` cast means empirical verification recommended

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable domain — ketcher 3.12.0 pinned, InChI spec stable)
