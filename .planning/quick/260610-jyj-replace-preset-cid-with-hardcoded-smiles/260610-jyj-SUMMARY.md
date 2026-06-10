---
phase: quick-260610-jyj
plan: 01
subsystem: preset-loader
tags: [presets, offline, smiles, ketcher, fetch-removal]
requires: []
provides: ["embedded-SMILES preset loader", "MoleculePreset.smiles field"]
affects: ["src/data/molecules.ts", "src/lib/handleMolSelectLogic.ts"]
tech-stack:
  added: []
  patterns: ["embedded isomeric SMILES loaded via ketcher.setMolecule — zero runtime network"]
key-files:
  created: []
  modified:
    - src/data/molecules.ts
    - src/lib/handleMolSelectLogic.ts
    - src/__tests__/handleMolSelect.test.ts
    - src/__tests__/PresetMolecules.test.tsx
decisions:
  - "Presets carry hardcoded isomeric SMILES (sourced once from PubChem PUG REST 2026-06-10); no runtime fetch"
  - "Failure path now exercised via setMolecule rejection (layout failure) instead of non-ok/network fetch errors"
metrics:
  duration: ~10m
  completed: 2026-06-10
---

# Phase quick-260610-jyj Plan 01: Replace preset CID with hardcoded SMILES Summary

Replaced each preset's PubChem `cid` with an embedded isomeric `smiles` string and load it directly via `ketcher.setMolecule(smiles)`, removing the runtime PubChem SDF fetch entirely so presets load fully offline.

## What Was Built

- **`src/data/molecules.ts`** — `MoleculePreset.cid: number` replaced with `smiles: string`. All 30 entries now carry the locked isomeric SMILES verbatim from the plan's map. Order, ids, names, formulas, and section comments unchanged. Header doc comment updated to describe embedded SMILES (sourced once from PubChem PUG REST on 2026-06-10), loaded directly via setMolecule — no runtime fetch.
- **`src/lib/handleMolSelectLogic.ts`** — Removed `fetch(...)`, the `res.ok` check, and `res.text()`. The try block now calls `await ketcherRef.current.setMolecule(mol.smiles)`. All guard/state semantics preserved exactly (early return on `!mol || !ketcherRef.current`; `setIsLoading(true)` / `setSelectedMolId(id)` / `isSettingMoleculeRef.current = true` before; catch → `console.error`, `setSelectedMolId(null)`, `isSettingMoleculeRef.current = false`; finally → `setIsLoading(false)`). Doc comment rewritten to describe embedded-SMILES loading.

## TDD Flow

- **RED** (commit `24ef084`): Reworked both test files. `handleMolSelect.test.ts` drops the fetch mock/spy, the PubChem-URL assertion, MOCK_SDF, and the fetch-failure tests; now asserts `setMolecule(BENZENE.smiles)`, isLoading true-first/false-last, the setMolecule-rejection error path (selectedMolId reverts to null + `isSettingMoleculeRef.current === false`, isLoading false), and unknown-id early return (setMolecule NOT called). `PresetMolecules.test.tsx` asserts `smiles` fields/values instead of `cid`. Confirmed RED: 4 tests failed against the cid-based implementation.
- **GREEN** (commit `943bad1`): Implemented the smiles data + fetch-free loader. `npx tsc -b` clean; full `npx vitest run` → 205 passed.

## Verification

- `npx tsc -b` — clean (exit 0)
- `npx vitest run` — 13 files, 205 tests, all green
- `grep -ic pubchem src/lib/handleMolSelectLogic.ts` → 0
- `grep -c 'fetch(' src/lib/handleMolSelectLogic.ts` → 0
- `grep -c 'cid:' src/data/molecules.ts` → 0 (the bare `grep -c 'cid'` reports 1, but it is a substring match inside "Acetic acid" on line 21 — not a `cid` field)

## Test Count Note

Baseline was 208; suite is now 205. The drop is expected and intended: the RED rework removed three fetch-specific tests that no longer have a corresponding code path (PubChem-URL assertion, non-ok response → setMolecule-not-called, network-error → revert). No unrelated tests regressed — all 13 test files still pass. The failure-path coverage is preserved through the setMolecule-rejection tests.

## Deviations from Plan

None — plan executed exactly as written. SMILES values used verbatim from the locked map; no network calls anywhere.

## Self-Check: PASSED

- FOUND: src/data/molecules.ts (modified, smiles field)
- FOUND: src/lib/handleMolSelectLogic.ts (modified, setMolecule(mol.smiles))
- FOUND: src/__tests__/handleMolSelect.test.ts (reworked)
- FOUND: src/__tests__/PresetMolecules.test.tsx (reworked)
- FOUND commit: 24ef084 (test/RED)
- FOUND commit: 943bad1 (feat/GREEN)
