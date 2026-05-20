---
phase: 02-data-pipeline
plan: 01
subsystem: parsing-library
tags: [parsing, vitest, typescript, inchi, auxinfo]
dependency_graph:
  requires: []
  provides:
    - Layer type definitions (Layer, LayerType, AuxMap, SubHover)
    - parseInchi() — splits InChI string into enriched Layer[]
    - parseConnectionBonds() — stack-based c-layer parser
    - parseHydrogenAtoms() — h-layer atom/count map
    - parseMobileHydrogens() — mobile-H group extractor
    - parseStereoAtoms() — stereo atom extractor
    - parseAuxMapping() — AuxInfo N: field → canonical→Ketcher map
    - parseInchiWithAux() — orchestrates split + parse of getInchi(true) output
  affects: []
tech_stack:
  added: []
  patterns:
    - TypeScript port of design handoff JS parsing functions (no algorithmic changes)
    - enrichLayers() fills atoms[]/bonds[] per layer type
    - Vitest 3 with environment: 'node' for DOM-free unit tests
key_files:
  created:
    - src/lib/parseInchi.ts
    - src/lib/parseAuxMapping.ts
    - src/lib/__tests__/parseInchi.test.ts
    - src/lib/__tests__/parseAuxMapping.test.ts
  modified:
    - vitest.config.ts
decisions:
  - "Separate parseInchi.ts and parseAuxMapping.ts modules — types export from parseInchi.ts as canonical type file; parseInchiWithAux in parseAuxMapping.ts imports parseInchi"
  - "enrichLayers() implemented as private helper in parseInchi.ts — not exported; runs inside parseInchi() after raw layer split"
  - "countFormulaAtoms() uses double-pass regex to correctly exclude H from heavy atom count"
metrics:
  duration: "3 minutes"
  completed: "2026-05-20"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 02 Plan 01: InChI Parsing Library Summary

**One-liner:** TypeScript parsing library ported from design handoff JS with enriched Layer types (atoms/bonds arrays) and AuxInfo → canonical→Ketcher mapping.

## What Was Built

Two pure TypeScript modules with 21 passing Vitest unit tests:

- **`src/lib/parseInchi.ts`** — all shared types plus `parseInchi()`, 4 helper parsers ported verbatim from `design_handoff_explain_that_inchi/molecules.js`, and new `enrichLayers()` function that fills `atoms[]` and `bonds[]` per layer type per decisions D-06/D-07/D-08/D-09.

- **`src/lib/parseAuxMapping.ts`** — `parseAuxMapping()` extracts the `N:` field from AuxInfo and builds the canonical(1-based)→Ketcher(0-based) index map; `parseInchiWithAux()` orchestrates splitting `getInchi(true)` output on `\nAuxInfo=`.

- **`vitest.config.ts`** — fixed `environment: 'jsdom'` → `environment: 'node'` (jsdom was not installed; pure parsing functions need no DOM).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix vitest config and create parsing library | 9771221 | vitest.config.ts, src/lib/parseInchi.ts, src/lib/parseAuxMapping.ts |
| 2 | Write unit tests for parsing library | 0e051d7 | src/lib/__tests__/parseInchi.test.ts, src/lib/__tests__/parseAuxMapping.test.ts |

## Verification

```
Test Files  2 passed (2)
     Tests  21 passed (21)
  Duration  1.26s
```

All success criteria met:
- `npm test -- --run` exits 0 from worktree directory
- `vitest.config.ts` has `environment: 'node'`
- `src/lib/parseInchi.ts` exports: Layer, LayerType, AuxMap, SubHover, parseInchi, parseConnectionBonds, parseHydrogenAtoms, parseMobileHydrogens, parseStereoAtoms
- `src/lib/parseAuxMapping.ts` exports: parseAuxMapping, parseInchiWithAux
- Both test files exist with meaningful behavioral tests
- No `window`, `document`, or `import.meta` in any `src/lib/*.ts` file (comment reference only)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

**Assumption A1 (from RESEARCH.md):** The benzene AuxInfo `N:` values in `parseAuxMapping.test.ts` (`N:1,2,6,3,5,4`) are from a web search example, not empirically captured from Ketcher 3.12.0. The test validates parsing logic, not exact Ketcher output.

**Required before phase gate:** Draw benzene in the running app, call `window.ketcher.getInchi(true)` from the browser console, capture the real `AuxInfo=` body, and update the test fixture in `src/lib/__tests__/parseAuxMapping.test.ts`.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. All processing is pure in-browser string parsing of WASM-generated output (threat register entries T-02-01, T-02-02, T-02-03 all have `accept` disposition as specified).

## Self-Check: PASSED

Files exist:
- FOUND: src/lib/parseInchi.ts
- FOUND: src/lib/parseAuxMapping.ts
- FOUND: src/lib/__tests__/parseInchi.test.ts
- FOUND: src/lib/__tests__/parseAuxMapping.test.ts

Commits exist:
- FOUND: 9771221
- FOUND: 0e051d7
