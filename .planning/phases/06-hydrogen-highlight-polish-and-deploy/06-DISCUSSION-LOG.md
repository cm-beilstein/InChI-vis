# Phase 6: Hydrogen Highlight, Polish, and Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 06-hydrogen-highlight-polish-and-deploy
**Areas discussed:** MAP-03 scope, Empty state design (PLSH-01), H sub-token behavior (INCHI-05), Deployment target

---

## MAP-03 Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to v2 | Phase 6 is already scoped to INCHI-05 + deploy. URL sharing is independent and can be added cleanly after launch. | ✓ |
| Include in Phase 6 | Encode molecule in URL hash/query param, restore state on load. | |

**User's choice:** Defer to v2
**Notes:** The phase name was already updated to "Hydrogen Highlight, Polish, and Deploy" — URL sharing is not part of this milestone close.

---

## Empty State Design (PLSH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder text in the InChI box | Show styled message inside existing .inchi-display box | |
| Dimmed InChI box with hint text | Always render the box dimmed with hint text | ✓ |
| No box, just a line of prose below the editor | Simpler — short <p> line, box appears only when real InChI ready | |

**User's choice:** Dimmed InChI box with hint text

| Hint text option | Description | Selected |
|------------------|-------------|----------|
| "Draw a molecule above to see its InChI." | Direct, action-oriented | ✓ |
| "Waiting for structure…" | Softer, system-status-like | |
| "InChI= (prefix only, faint)" | Minimal | |

**User's choice:** "Draw a molecule above to see its InChI."

---

## Footnote

| Option | Description | Selected |
|--------|-------------|----------|
| Leave empty | Hints are obvious from the UI | |
| Re-add keyboard hints | Re-add Hover/Click chips from design handoff | |
| Remove Footnote from render tree | Empty component, no content — remove entirely | ✓ |

**User's choice:** Remove Footnote from render tree
**Notes:** Footnote was already an empty `<div className="footnote" />` after Phase 5 moved the InChI definition to the Header tagline.

---

## H Sub-token Behavior (INCHI-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — silent no-op | When no explicit H in canvas, hover H does nothing | ✓ |
| Highlight heavy atoms carrying implicit H | Link formula H hover to h-layer data | |

**User's choice (no explicit H case):** Silent no-op

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — layer-wide formula hover includes explicit H | Consistent with design handoff: halo all atoms | ✓ |
| No — layer-wide stays heavy atoms only | Conservative | |

**User's choice (layer-wide):** Yes — include explicit H in layer-wide formula hover

---

## Deployment Target

| Option | Description | Selected |
|--------|-------------|----------|
| Netlify | Needs netlify.toml with custom COOP/COEP headers | |
| GitHub Pages | coi-serviceworker already in public/ and wired | ✓ |
| Both | Verify build works for both | |

**User's choice:** GitHub Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Leave URL configuration as post-deploy | Phase 6 just ships a working build | |
| Add a placeholder README with deploy instructions | README with build/deploy steps | ✓ |

**User's choice:** Add placeholder README with deploy instructions

---

## Claude's Discretion

- Exact CSS approach for dimmed empty-state box (opacity, border color fade, token swap)
- GitHub Actions workflow pattern (actions/deploy-pages vs peaceiris/actions-gh-pages)
- README length and format

## Deferred Ideas

- MAP-03 — Shareable URL (InChI or mol in URL hash/query) — deferred to v2
