# Phase 2: Data Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 02-data-pipeline
**Areas discussed:** State store, Debounce pipeline, Layers shape, Empty state behavior

---

## State store

| Option | Description | Selected |
|--------|-------------|----------|
| Introduce Zustand now | Create store with inchi/layers/auxMap; clean for Phases 3–6 | ✓ |
| Keep flat on App | Add useState on App, pass as props; consistent with D-15 | |

**User's choice:** Introduce Zustand now

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add only Phase 2 fields now | Store: inchi, layers, auxMap | |
| Add all v1 fields now | Store: inchi, layers, auxMap, hoverIdx, subHover — no store changes in later phases | ✓ |

**User's choice:** Add all v1 fields now

---

## Debounce pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Trailing-edge, 150ms | State updates only after 150ms quiet; simple setTimeout/clearTimeout | ✓ |
| Leading + trailing, 150ms | Update fires immediately, then again after quiet period | |

**User's choice:** Trailing-edge debounce, 150ms

---

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore stale — cancel on new trigger | Generation counter; discard result if newer trigger fired | ✓ |
| Let it complete, discard if newer exists | Allow in-flight call to finish; only discard at apply time | |

**User's choice:** Generation counter (ignore stale)

---

## Layers shape

| Option | Description | Selected |
|--------|-------------|----------|
| Match design handoff: {type, prefix, text} | Thin layer objects; Phase 4 resolves atoms via auxMap | |
| Enrich now: add atoms[] and bonds[] | Parse atom/bond sets in Phase 2; Phase 4 reads directly | ✓ |

**User's choice:** Enrich now

---

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical (InChI) numbering | atoms = [1,3,5] (1-based canonical); translate in Phase 4 | ✓ |
| Ketcher indices, translate during parse | atoms = [0,2,4] (0-based Ketcher); tighter coupling | |

**User's choice:** Canonical numbering

---

## Empty state behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Empty arrays and empty object: layers=[], auxMap={} | No null-checks downstream; components render nothing | ✓ |
| null signals "no data" | Distinguishes "never computed" from "computed empty"; more ceremony | |

**User's choice:** Empty arrays and empty object

---

| Option | Description | Selected |
|--------|-------------|----------|
| After — call getInchi() and check result | Single code path; catch empty/throw case | ✓ |
| Before — check if canvas empty first | Avoids WASM call for empty canvas; two API calls per change | |

**User's choice:** After — check result

---

## Claude's Discretion

- File location for Zustand store
- `zustand/middleware` devtools wrapper (optional)
- Exact TypeScript types for `Layer`, `SubHover`, `AuxMap`
- Vitest setup and test file location
- Whether `parseInchi` and `parseAuxMapping` share a module or are separate

## Deferred Ideas

None
