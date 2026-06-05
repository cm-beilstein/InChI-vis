---
phase: 05-mapping-strip-and-preset-molecules
verified: 2026-05-22T00:00:00Z
status: verified
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 5: Mapping Strip and Preset Molecules — Verification Report

**Phase Goal:** The atom-numbering mapping strip renders correct canonical-to-Ketcher index pairs, and loading a preset molecule triggers the full draw-to-display pipeline end-to-end
**Verified:** 2026-05-22
**Status:** verified

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The mapping strip shows each atom's Ketcher index paired with its canonical InChI index; identity pairs are visually dimmed, divergent pairs highlighted green | ✓ VERIFIED | `MappingStrip.tsx` renders pair chips from `deriveMappingPairs(auxMap)`; `.pair.identity` CSS applies reduced opacity; `.pair.divergent` applies green border. Strip hidden when all pairs are identity. |
| 2 | Clicking a preset molecule loads it into the canvas and the full pipeline updates correctly within one debounce cycle | ✓ VERIFIED | `handleMolSelectLogic` fetches PubChem SDF and calls `ketcher.setMolecule()`; `isSettingMoleculeRef` prevents selectedMolId reset mid-fetch; editor `change` event triggers full InChI+layer+mapping pipeline. Human UAT: Benzene, Caffeine, Naloxone all verified. |
| 3 | The canvas overlay shows the current molecule name, molecular formula, and heavy-atom count for both drawn and preset molecules | ✓ VERIFIED | `KetcherPanel` accepts `overlayName`, `overlayFormula`, `overlayCount` props from App.tsx store state; overlay disappears on canvas clear. Human UAT: Caffeine shows "Caffeine C8H10N4O2 · 24 heavy atoms". |
| 4 | Footnote strip below the mapping strip displays the InChI definition text and the Hover/Click keyboard hint legend | ✓ VERIFIED | `Footnote.tsx` static component renders definition text and `<kbd>` badges. Human UAT: confirmed present with correct copy. |

## Human UAT Sign-off

All 8 UAT scenarios approved 2026-05-22:
- MappingStrip renders after drawing ✅
- Identity pairs dimmed ✅
- Footnote renders with correct content ✅
- Benzene preset loads full pipeline ✅
- Canvas overlay name/formula/count ✅
- Overlay disappears on canvas clear ✅
- Loading state disables buttons ✅
- Naloxone stereo regression ✅

## Test Suite

106/106 unit tests pass (9 test files) — includes `handleMolSelect.test.ts` (8 tests GREEN).

## Requirements Completed

- MAP-01 — Mapping strip: Ketcher index → canonical index; identity dimmed, divergent green
- MAP-02 — Footnote strip: InChI definition + keyboard hint legend
- EDIT-02 — Preset molecule list loads molecule into canvas on click
- EDIT-03 — Canvas overlay: molecule name, formula, heavy-atom count
