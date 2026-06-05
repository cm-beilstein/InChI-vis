---
phase: 07-multi-fragment-highlighting-p-layer-and-copy
verified: 2026-06-01T14:22:00Z
status: gaps_found
score: 3/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Hovering h-layer or t-layer tokens for multi-fragment molecules highlights the correct atoms from both fragments"
    status: failed
    reason: "buildHighlightSpecs case 'h' calls parseHydrogenAtoms(layer.text) and parseMobileHydrogens(layer.text) on the raw unsplit multi-fragment text (e.g. '2-6H,1H3;1-6H'). Fragment-2+ atoms are looked up with fragment-local canonical indices that have no entries in auxMap, so they are silently dropped. Case 't' has the same defect: parseStereoParities(layer.text) parses the raw text and fragment-local index collisions cause one fragment's stereocenters to overwrite the other's. The enrichLayers fix in parseInchi.ts correctly computes offset atoms, but buildHighlightSpecs was not updated to consume them — it re-parses independently without offset."
    artifacts:
      - path: "src/lib/highlightUtils.ts"
        issue: "Lines 131-148 (case 'h'): parseHydrogenAtoms and parseMobileHydrogens called on full layer.text without splitting on ';' and applying cumulativeOffset. Lines 163-191 (case 't'): parseStereoParities called on full layer.text. Lines 208-219 (case 'm'/'s'): parseStereoAtoms called on tLayer.text without offset."
    missing:
      - "In buildHighlightSpecs case 'h': derive fragmentAtomCounts from layers (formula layer .text.split('.').map(countFormulaAtoms)), split layer.text on ';', and apply cumulativeOffset per fragment before auxMap lookup — mirroring the enrichLayers fix"
      - "In buildHighlightSpecs case 't': apply the same split+offset pattern to parseStereoParities"
      - "In buildHighlightSpecs case 'm'/'s': apply the same split+offset pattern to parseStereoAtoms(tLayer.text)"
      - "Add unit tests in highlightUtils.test.ts for buildHighlightSpecs h-layer and t-layer with multi-fragment input to lock in the fix"
---

# Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy — Verification Report

**Phase Goal:** Hovering C-layer or formula layer tokens for multi-fragment molecules highlights the correct atoms; hovering p+N highlights the protonation-site atoms; a copy-to-clipboard button appears at the end of the InChI strip — all guarded by unit tests.
**Verified:** 2026-06-01T14:22:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | For `InChI=1S/C7H8.C6H6/...`, hovering the formula layer highlights all 13 heavy atoms; hovering the c layer highlights correct bonds/atoms for both fragments independently | PARTIAL — c-layer and formula-layer are correct; h-layer and t-layer are not | `enrichLayers` in parseInchi.ts correctly computes offset atoms for c/h/t/b. `buildHighlightSpecs` case 'c' reads `layer.bonds` (already offset-corrected) and maps through `auxMap` correctly. Formula layer correct. But case 'h' and 't' re-parse `layer.text` directly, bypassing the offset already computed in enrichLayers — producing fragment-local indices that miss fragment-2+ atoms |
| 2 | For `InChI=...p+1`, hovering the p layer highlights all heteroatom (non-C, non-H) atoms from the formula | VERIFIED | `case 'p'` present in `buildHighlightSpecs` (highlightUtils.ts:193-205). `'p'` removed from NON_SPATIAL guard (line 76). `'p'` removed from `useKetcherHighlights` early-return guard (line 91). Test A (N heteroatom) and Test B (all-C) both pass. |
| 3 | A copy icon appears at the right end of the InChI display box; clicking copies the verbatim InChI string; "Copied!" confirmation shown | VERIFIED | `handleCopy` in InchiSection.tsx:26-33 uses `useInchiStore(state => state.inchi)` verbatim. Button present only in non-empty branch (conditional JSX). `copied` state drives `<span className={styles.copiedFeedback}>Copied!</span>`. CSS classes present in InchiSection.module.css. All 5 PLSH-04 tests pass. |
| 4 | All existing highlight tests continue to pass; new unit tests cover multi-fragment parseAuxMapping, multi-fragment enrichLayers, and buildHighlightSpecs for p-layer | PARTIAL — tests written and passing for parseAuxMapping/enrichLayers/p-layer, but no tests for buildHighlightSpecs h-layer or t-layer with multi-fragment input | 135/135 tests pass. INCHI-06 tests in parseAuxMapping.test.ts (3 tests) and parseInchi.test.ts (5 tests) verify the parsing layer. INCHI-07 tests in highlightUtils.test.ts (2 tests) verify p-layer. No test covers buildHighlightSpecs case 'h' or 't' with multi-fragment atoms/text. |

**Score:** 2 fully verified, 2 partial (failing on h/t-layer multi-fragment). Counting partial as failed: **2/4 truths verified**.

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/parseAuxMapping.ts` | parseAuxMapping with per-fragment canonical offset | VERIFIED | `formulaText?.includes('.')` branch at line 60 splits on `.` and `;`, accumulates `canonicalOffset`. `parseInchiWithAux` passes `formulaLayer?.text ?? ''`. |
| `src/lib/parseInchi.ts` | enrichLayers with per-fragment c/h/t/b parsing | VERIFIED | `fragmentAtomCounts` computed at line 173-174. Cases `c`, `h`, `t`, `b` all split on `;` with `cumulativeOffset`. `countFormulaAtoms` exported at line 147. |
| `src/lib/highlightUtils.ts` | `case 'p'` in buildHighlightSpecs | VERIFIED | Present at lines 193-205. NON_SPATIAL guard at line 76 is `['version', 'q', 'i', 'b']` — 'p' absent. |
| `src/components/InchiSection.tsx` | Copy button with state and handler | VERIFIED | `useState` imported, `copied` state, `handleCopy` async function with try/catch, button rendered only in non-empty branch. |
| `src/components/InchiSection.module.css` | `.copyBtn` and `.copiedFeedback` CSS classes | VERIFIED | `.copyBtn` at line 146 (absolute positioning, no border/bg, `var(--ink-faint)`, transition). `.copiedFeedback` at line 172. `position: relative` and `padding-right: 40px` added to `.inchiDisplay`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `parseAuxMapping.ts` | `parseInchi.ts` | `countFormulaAtoms` imported | VERIFIED | `import { parseInchi, countFormulaAtoms } from './parseInchi'` at line 5 |
| `parseInchiWithAux` | `parseAuxMapping` | `formulaLayer?.text` passed as second arg | VERIFIED | Line 118: `parseAuxMapping(auxBody, formulaLayer?.text ?? '')` |
| `buildHighlightSpecs` case 'h' | `auxMap` | canonical + offset → Ketcher ID | FAILED | Case 'h' at line 131 calls `parseHydrogenAtoms(layer.text)` on raw unsplit text. Returns fragment-local canonicals. Fragment-2 atoms (canonicals 8-13) not found in auxMap. |
| `buildHighlightSpecs` case 'p' | `auxMap` + `atomElements` | heteroatom filter → Ketcher ID | VERIFIED | Lines 197-205: iterates `Object.entries(atomElements)`, filters `el !== 'C' && el !== 'H'`, maps through `auxMap[canon]`. |
| `InchiSection.tsx` | `store.ts` | `useInchiStore(state => state.inchi)` | VERIFIED | Line 15 in InchiSection.tsx. `handleCopy` at line 27 writes `inchi` verbatim. |
| `useKetcherHighlights.ts` guard | `buildHighlightSpecs` | p-layer reaches buildHighlightSpecs | VERIFIED | Line 91: `['version', 'q', 'i'].includes(layer.type)` — 'p' absent, buildHighlightSpecs called for p-layer hover. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `InchiSection.tsx` copy button | `inchi` | `useInchiStore(state => state.inchi)` — verbatim Ketcher string | Yes — store value set from `parseInchiWithAux` result | FLOWING |
| `buildHighlightSpecs` case 'c' | `layer.bonds` + `layer.atoms` | `enrichLayers` c-case (offset-corrected) → `auxMap` lookup | Yes — bonds correctly offset-adjusted by enrichLayers | FLOWING |
| `buildHighlightSpecs` case 'h' | `parseHydrogenAtoms(layer.text)` | raw layer.text (unsplit) → direct auxMap lookup | No — fragment-local canonicals from raw text produce no matches for fragment-2 atoms | DISCONNECTED (for multi-fragment) |
| `buildHighlightSpecs` case 'p' | `atomElements` entries | `buildAtomElements(layers)` → auxMap lookup | Yes — heteroatom filter on globally-correct atomElements | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 135 unit tests pass | `npm test -- --run` | 135 passed (10 test files) | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0, no output | PASS |

### Probe Execution

No probes declared or conventionally present for this phase. Step 7c: SKIPPED (no probe files).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INCHI-06 | 07-01-PLAN.md | Multi-fragment molecules highlight correct atoms/bonds per fragment on layer hover | PARTIAL | parseAuxMapping and enrichLayers correctly offset-mapped. buildHighlightSpecs c-layer correct. buildHighlightSpecs h-layer and t-layer do not apply offset — fragment-2+ atoms unreachable via auxMap lookup. |
| INCHI-07 | 07-02-PLAN.md | Hovering p-layer highlights protonation-site atoms (heteroatom fallback) | SATISFIED | case 'p' implemented, guards updated, tests pass. |
| PLSH-04 | 07-02-PLAN.md | Copy-to-clipboard button copies verbatim InChI string with visual confirmation | SATISFIED | Button implemented, clipboard call uses verbatim store value, "Copied!" feedback, tests pass. |

Note: INCHI-06, INCHI-07, and PLSH-04 are defined in ROADMAP.md requirement coverage section but are not listed in REQUIREMENTS.md's traceability table (the table covers v1 requirements EDIT-01 through PLSH-01, 16 entries). These three are Phase 7-specific requirements defined in the ROADMAP only.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/highlightUtils.ts` | 131-148 | `parseHydrogenAtoms(layer.text)` on raw multi-fragment text in case 'h' | Blocker | Fragment-2+ h-layer atoms never highlighted for multi-fragment molecules |
| `src/lib/highlightUtils.ts` | 163-191 | `parseStereoParities(layer.text)` on raw multi-fragment text in case 't' | Blocker | Fragment-2 stereocenters silently overwrite fragment-1's if atom numbers collide; otherwise wrong auxMap entries used |
| `src/lib/highlightUtils.ts` | 208-219 | `parseStereoAtoms(tLayer.text)` on raw multi-fragment text in case 'm'/'s' | Blocker | Same offset-missing bug propagated to m/s highlight path |
| `src/components/InchiSection.tsx` | 30 | `setTimeout(() => setCopied(false), 1500)` without clearTimeout or unmount guard | Warning | React state update on unmounted component possible in strict mode; risk accepted per T-07-05 per SUMMARY but not annotated in code |
| `src/components/InchiSection.module.css` | 161 | `.copyBtn:hover` present but no `.copyBtn:focus-visible` | Warning | Keyboard users have no styled focus indicator; sighted keyboard accessibility gap |

No unreferenced TBD/FIXME/XXX markers found in any modified file.

### Human Verification Required

None identified. All phase-relevant behavior is unit-testable and was tested. The visual appearance of the copy button and "Copied!" feedback, while needing human confirmation for pixel-fidelity, is outside the phase success criteria scope.

### Gaps Summary

One root-cause gap blocks full INCHI-06 satisfaction:

**`buildHighlightSpecs` was not updated alongside `enrichLayers`**

`enrichLayers` in `parseInchi.ts` (fixed in 07-01) correctly splits multi-fragment layer text on `;` and applies per-fragment canonical offsets before storing atoms and bonds on the layer object. However, `buildHighlightSpecs` in `highlightUtils.ts` (modified in 07-02 for p-layer only) did not receive the same treatment for the `h` and `t` cases. Those cases re-parse `layer.text` directly, bypassing the offset computation, producing fragment-local canonical indices that fail to match any `auxMap` entry for fragment 2 and beyond.

The `c`-layer highlight is correct because it consumes `layer.bonds` (pre-offset-corrected by enrichLayers) rather than re-parsing text. The `h` and `t` cases need to mirror the enrichLayers split+offset pattern.

The REVIEW.md in the phase directory (07-REVIEW.md) documents this precisely as CR-01 and CR-02, confirming the issue was found during review but not yet remediated.

**Affected user-visible behaviors:**
- Hovering the h-layer on a multi-fragment molecule: only fragment-1 atoms highlight; fragment-2+ silent drop
- Hovering the t/b-layer on a multi-fragment molecule with shared atom numbers across fragments: one fragment's stereocenters silently overwrite the other's

**The c-layer, formula-layer, and p-layer highlighting are all correct.** The copy button is fully functional. Three of six PLSH-04 and INCHI-07 features work correctly; INCHI-06 works only for c-layer and formula-layer hover, not h-layer or t-layer.

---

_Verified: 2026-06-01T14:22:00Z_
_Verifier: Claude (gsd-verifier)_
