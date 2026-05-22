# Phase 6: Hydrogen Highlight, Polish, and Deploy - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Three closing tasks:

1. **INCHI-05** — Make hovering the H sub-token in the molecular formula layer highlight explicit hydrogen atoms in the Ketcher canvas. Also: layer-wide formula hover should include explicit H atoms when present (consistent with design handoff: "halo all atoms").
2. **PLSH-01** — Empty or invalid canvas shows a dimmed InChI display box with hint text instead of disappearing entirely.
3. **Deploy** — GitHub Actions workflow + README with build and deploy steps; verify `vite build` produces a working static bundle with WASM assets loading correctly under GitHub Pages.

Not in scope: MAP-03 (shareable URL) — deferred to v2.

</domain>

<decisions>
## Implementation Decisions

### MAP-03 scope
- **D-01:** MAP-03 (shareable URL encoding) is deferred to v2. Phase 6 closes the milestone without URL state.

### Empty State (PLSH-01)
- **D-02:** When the canvas is empty or invalid (`layers.length === 0`), InchiSection renders the `.inchi-display` box in a dimmed/disabled state with the hint text: **"Draw a molecule above to see its InChI."** The box is always present (no layout shift), just visually inactive. The text uses a faint color token (e.g. `var(--ink-faint)` or `var(--ink-muted)` from the design token system).
- **D-03:** `Footnote` is removed from the App.tsx render tree entirely. It was already an empty `<div className="footnote" />` after Phase 5 moved the InChI definition to the Header tagline. Removing it eliminates a dead DOM node with no content.

### H Sub-token Highlight (INCHI-05)
- **D-04:** When no explicit H atoms exist in the canvas (most molecules — implicit H only), hovering the H sub-token in the formula is a **silent no-op**. The canvas does not change. No feedback needed.
- **D-05:** When explicit H atoms ARE drawn in the canvas, the layer-wide formula hover (hovering the entire formula span, no sub-token) should also highlight those H atoms — consistent with the design handoff's "halo all atoms with element color" rule. This means explicit H canonical indices must be included in `formulaLayer.atoms`.
- **D-06:** The existing `buildSubHoverSpecs` `case 'element': el: 'H'` handler is already in place and will work correctly once H atoms are included in `atomElements` and `formulaLayer.atoms`. No new sub-hover kind needed.
- **D-07 (Research flag):** The researcher must verify whether `getInchi(true)` AuxInfo N: field includes explicit H atoms in its canonical numbering when they are drawn as separate atoms in Ketcher. If yes → fix `buildAtomElements` to include H (remove the H skip on line `if (!m[1] || m[1] === 'H') continue`) and include H canonicals in `formulaLayer.atoms`. If no (InChI always treats H as implicit in canonical numbering) → investigate alternate lookup path (e.g. read H atoms directly from Ketcher molecule struct).
- **D-08:** `heavyAtomCount` displayed in the KetcherPanel canvas overlay uses `Object.keys(atomElements).length`. If H atoms are added to `atomElements`, this count must be adjusted to exclude H: `Object.entries(atomElements).filter(([,el]) => el !== 'H').length`.

### Deployment (GitHub Pages)
- **D-09:** Target is **GitHub Pages**. The coi-serviceworker (`public/coi-serviceworker.js`) is already in place and wired into `index.html`. The vite.config.ts `base` is already set to `'/explain-that-inchi/'`. No netlify.toml needed.
- **D-10:** Phase 6 adds a **GitHub Actions workflow** (`.github/workflows/deploy.yml`) that builds and publishes to `gh-pages` branch on push to `master`. Use the standard `actions/checkout` + `actions/setup-node` + `peaceiris/actions-gh-pages` (or the official `actions/deploy-pages`) pattern.
- **D-11:** Phase 6 adds a **`README.md`** at the project root with: project description, live URL placeholder (`https://<your-username>.github.io/explain-that-inchi/`), local dev instructions (`npm install` + `npm run dev`), and build+deploy instructions.

### Claude's Discretion
- Exact CSS approach for the dimmed empty-state InChI box (opacity, faded border color, or just token swap)
- Whether to use `actions/deploy-pages` or `peaceiris/actions-gh-pages` in the workflow
- README length and format (minimal is fine)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Handoff
- `design_handoff_explain_that_inchi/canvas.jsx` — `showFormulaHalo` (line 82): formula layer hover halos ALL atoms including explicit H with `elementColor(atom.el)`; this is the spec for D-05
- `design_handoff_explain_that_inchi/app.jsx` — Footnote component (lines ~475–488): was static text, now removed per D-03

### Existing Implementation (files that change in Phase 6)
- `src/components/InchiSection.tsx` — `if (layers.length === 0) return null` → change to dimmed-box render (D-02)
- `src/components/Footnote.tsx` — remove from `src/App.tsx` render tree and delete or leave as dead file (D-03)
- `src/lib/parseAuxMapping.ts` — `buildAtomElements()` line `if (!m[1] || m[1] === 'H') continue` → include H once D-07 research confirms AuxInfo N: covers explicit H
- `src/lib/parseInchi.ts` — formula layer `atoms` array: needs H canonical indices once D-07 research confirms
- `src/lib/highlightUtils.ts` — `buildHighlightSpecs` formula case and `buildSubHoverSpecs` element case: already correct once H atoms are in `auxMap` + `atomElements`
- `src/App.tsx` — `heavyAtomCount` derivation: adjust to exclude H if H is added to `atomElements` (D-08)

### Existing Infrastructure (no change needed)
- `public/coi-serviceworker.js` — already present, already wired in `index.html`
- `vite.config.ts` — `base: '/explain-that-inchi/'` already set
- `index.html` — `<script src="%BASE_URL%coi-serviceworker.js">` already first script

### Project Planning
- `.planning/REQUIREMENTS.md` — INCHI-05, PLSH-01 (Phase 6 requirements)
- `.planning/ROADMAP.md` — Phase 6 success criteria (4 items)

### No external specs
Deployment pattern is standard GitHub Pages + vite build. No ADRs needed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/highlightUtils.ts` — `buildSubHoverSpecs` `case 'element':` already handles H element hover; no new code needed there once atoms are in the mapping
- `src/components/InchiSection.module.css` — existing `.inchiDisplay` class can be extended with a `[data-empty="true"]` modifier or a new `.emptyState` class for the dimmed look
- `public/coi-serviceworker.js` v0.1.7 — already installed and wired; no reinstall needed

### Established Patterns
- CSS Modules: new visual states get a modifier class in the component's `.module.css` (not inline styles)
- CSS var tokens for color: use `var(--ink-faint)` or `var(--ink-muted)` for dimmed text — don't hard-code colors
- Empty guard: `if (layers.length === 0)` is already in InchiSection; replace with conditional render rather than early return

### Integration Points
- `src/App.tsx`: remove `<Footnote />` import and JSX element (D-03)
- `.github/workflows/deploy.yml`: new file — wires `npm run build` → gh-pages publish on master push (D-10)
- `README.md`: new file at project root (D-11)

</code_context>

<specifics>
## Specific Requirements

- Empty state text: exactly **"Draw a molecule above to see its InChI."** — dim, monospace, centered in the InChI box
- H sub-token hover: **silent no-op** when no explicit H in canvas (D-04); **explicit H highlighted** when present (D-05/D-06)
- Footnote: **removed from render tree** — not hidden, not emptied, removed (D-03)
- Deploy target: **GitHub Pages**, not Netlify. coi-serviceworker is already wired.
- README: include live URL placeholder + local dev + build/deploy instructions (D-11)

</specifics>

<deferred>
## Deferred Ideas

- **MAP-03** — Shareable URL encoding (InChI or mol file in URL hash/query param, restores state on load). Deferred to v2.

</deferred>

---

*Phase: 06-hydrogen-highlight-polish-and-deploy*
*Context gathered: 2026-05-22*
