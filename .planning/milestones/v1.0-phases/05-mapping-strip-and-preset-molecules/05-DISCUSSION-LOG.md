# Phase 5 Discussion Log

**Date:** 2026-05-22
**Phase:** 05 — Mapping Strip and Preset Molecules

## Gray Areas Identified

4 gray areas presented; user discussed all 4.

## Discussion

### 1. Preset Molecule Set

**Question:** Roadmap says 5 presets; design handoff has 10 (methane, ethanol, benzene, acetic acid, L-alanine, vanillin, caffeine, (S)-nicotine, melatonin, naloxone). How many and which ones?

**Decision:** All 10 from the design handoff. → D-01

### 2. Preset Molecule Format

**Question:** ketcher.setMolecule() accepts SMILES or MOL. Options: hardcoded SMILES (short but WASM may relayout), hardcoded MOL files (preserve layout), or runtime PubChem fetch.

**Decision:** Fetch from PubChem at runtime. → D-02, D-03, D-04

**Implication noted:** Researcher must verify correct PubChem CIDs for all 10 molecules (especially stereoisomer-specific ones like L-alanine and (S)-nicotine). Adds loading state + error handling requirement.

### 3. Canvas Overlay for User-Drawn Molecules

**Question:** Design handoff shows name + formula + count. Name is only meaningful for presets — what to show for user-drawn?

**Decision:** Formula + count only (no name) for user-drawn. Preset active: name + formula + count. Empty canvas: hide overlay. → D-06

### 4. Active Preset State Location

**Question:** Should selectedMolId live in Zustand store or App.tsx local state?

**Decision:** App.tsx local state (useState). No global store pollution — only KetcherPanel and canvas overlay need it. → D-05

## Deferred

- MAP-03 (shareable URL): Phase 6 per ROADMAP
