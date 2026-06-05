---
phase: 03-inchi-display-and-explanation-ui
plan: "03"
subsystem: layer-info
tags: [typescript, parser, layer-info, ui-data]
dependency_graph:
  requires:
    - 03-01-PLAN.md
    - src/lib/parseInchi.ts
  provides:
    - src/lib/layerInfo.ts
  affects:
    - src/components/Explanation.tsx (Wave 2 — imports LAYER_INFO, DEFAULT_INFO, readingFor, swatchVar)
    - src/components/LayerText.tsx (Wave 2 — imports swatchVar)
tech_stack:
  added: []
  patterns:
    - TypeScript port of vanilla JS design handoff module
    - Adapter pattern: atomElements Record replaces mol.atoms
    - Importer pattern: reuse parseConnectionBonds/parseMobileHydrogens/parseStereoAtoms from parseInchi.ts
key_files:
  created:
    - src/lib/layerInfo.ts
  modified: []
decisions:
  - atomLabel(atomElements, canon) accepts Record<number, string> instead of mol — consistent with D-02/D-03 adaptation decision
  - swatchVar ported from app.jsx lines 464-472 (not in layers-info.js) — needed by Wave 2 components
  - parseStereoParities returns {atom: parity} Record, distinct from parseStereoAtoms which returns number[] — both serve different UI needs
metrics:
  duration: "~2min"
  completed: "2026-05-21"
  tasks: 1
  files: 1
requirements:
  - EXPL-01
  - EXPL-02
  - EXPL-03
  - PLSH-03
---

# Phase 3 Plan 03: layerInfo TypeScript Port Summary

**One-liner:** TypeScript port of layers-info.js with atomElements adapter replacing mol.atoms, plus swatchVar from app.jsx — all 12 exports implemented, 24 tests green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/lib/layerInfo.ts — full TypeScript port | a39f5d0 | src/lib/layerInfo.ts |

## What Was Built

`src/lib/layerInfo.ts` — a 298-line TypeScript port of `design_handoff_explain_that_inchi/layers-info.js` with the following key components:

1. **LAYER_INFO** — 11-entry record mapping each LayerType to title/accent/blurb/egLabel metadata used by the Explanation panel
2. **DEFAULT_INFO** — idle state shown when no layer is hovered
3. **subscript(n)** — converts integer to Unicode subscript digits (₀₁₂...₉)
4. **formulaReading(s)** — converts Hill-formula string "C6H6" to `"<b>6</b> carbons, <b>6</b> hydrogens"` prose
5. **ELEMENT_NAMES** — symbol→English name map for 10 common elements
6. **elementColor/hydroColor** — CSS custom property lookup helpers
7. **parseStereoParities(text)** — distinct from parseInchi's parseStereoAtoms; returns `{atom: parity}` Record for color-coded stereo display
8. **parityColor(sign)** — maps +/- to CSS stereo color tokens
9. **swatchVar(type)** — maps LayerType to CSS token suffix (c→conn, h→hydro, b/t/m/s→stereo, etc.)
10. **readingFor(layer, atomElements)** — generates per-layer HTML prose using element labels from atomElements Record (falls back to '#N' when empty)

## Key Adaptation from Design Handoff

The original `readingFor(layer, mol)` and `atomLabel(mol, canon)` accepted a mol object with `mol.atoms.find(x => x.canonical === canon)`. This was adapted to `readingFor(layer, atomElements: Record<number, string>)` and `atomLabel(atomElements, canon)` — accepts the `atomElements` field from the Zustand store (populated by `parseAtomElements()` from AuxInfo). This avoids coupling layerInfo to the Ketcher mol object, keeping it a pure function testable without browser context.

## Deviations from Plan

None — plan executed exactly as written. The implementation file was provided verbatim in the plan's `<action>` block.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

The plan's threat model noted `readingFor → dangerouslySetInnerHTML` (T-03-03-01). Review confirms:
- HTML emitted is limited to `<b>`, `<span style="color:var(--...)">` tags
- layer.text is interpolated only inside `<b>` wrappers or as the operand of static HTML strings
- atomElements values are element symbols from WASM AuxInfo — not user-controlled free text
- No raw `${layer.text}` injection into unguarded HTML contexts

## Known Stubs

None — layerInfo.ts is a complete, wired implementation with no placeholder data.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/layerInfo.ts exists | FOUND |
| 03-03-SUMMARY.md exists | FOUND |
| commit a39f5d0 exists | FOUND |
| layerInfo tests (24) green | PASS |
| Full test suite (61) green | PASS |
