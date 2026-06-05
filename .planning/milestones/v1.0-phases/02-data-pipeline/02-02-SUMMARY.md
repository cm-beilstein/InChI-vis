---
phase: 02-data-pipeline
plan: 02
subsystem: zustand-store
tags: [zustand, state-management, typescript, tdd]
dependency_graph:
  requires:
    - src/lib/parseInchi.ts (Layer, AuxMap, SubHover types)
  provides:
    - useInchiStore — Zustand 5 store with all v1 fields and actions
    - setInchiData(inchi, layers, auxMap) action
    - setHover(idx) action
    - setSubHover(sub) action
  affects:
    - src/App.tsx (will call setInchiData from change handler in Plan 03/04)
    - Phase 3 display components (will read layers, hoverIdx, subHover)
    - Phase 4 highlight hooks (will read auxMap, hoverIdx)
tech_stack:
  added: []
  patterns:
    - Zustand 5 double-call TypeScript pattern: create<InchiState>()()
    - devtools middleware for Redux DevTools integration (dev-only, non-sensitive data)
    - Module-level singleton — create() at module scope, never inside a component
    - TDD RED/GREEN cycle with Vitest 3 + environment: 'node'
key_files:
  created:
    - src/store.ts
    - src/__tests__/store.test.ts
  modified: []
decisions:
  - "Module-level singleton — useInchiStore created at module scope per D-02; never moved inside a component or hook"
  - "devtools middleware included — standard Zustand 5 practice; state is non-sensitive chemistry data; @redux-devtools/extension type warning is acceptable (dev-only DX issue)"
  - "All five v1 fields defined in store now — no store changes needed in Phases 3-5, just new calls to existing actions"
metrics:
  duration: "5 minutes"
  completed: "2026-05-20"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 02: Zustand Store Summary

**One-liner:** Zustand 5 store (`useInchiStore`) with complete v1 interface — five state fields and three typed actions built TDD with 8 unit tests.

## What Was Built

- **`src/store.ts`** — `useInchiStore` export using Zustand 5 double-call pattern `create<InchiState>()()` with devtools middleware. Interface `InchiState` holds: `inchi: string`, `layers: Layer[]`, `auxMap: AuxMap`, `hoverIdx: number | null`, `subHover: SubHover | null`. Three actions: `setInchiData`, `setHover`, `setSubHover`. Module-level singleton per D-02.

- **`src/__tests__/store.test.ts`** — 8 Vitest unit tests covering initial state, all three actions, null transitions, and presence of all five fields + three actions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for useInchiStore | fb54f67 | src/__tests__/store.test.ts |
| 1 (GREEN) | Implement useInchiStore | f01b53c | src/store.ts |

## Verification

```
Test Files  3 passed (3)
     Tests  29 passed (29)
  Duration  1.43s
```

- `npm test -- --run` exits 0 (29 tests, 3 test files)
- `npx tsc --noEmit` exits 0 (no TypeScript errors)
- `grep "export const useInchiStore" src/store.ts` matches
- `grep "create<InchiState>()" src/store.ts` matches
- `grep "from './lib/parseInchi'" src/store.ts` matches
- All five v1 fields present: inchi, layers, auxMap, hoverIdx, subHover
- All three actions present: setInchiData, setHover, setSubHover
- No `ketcherRef` or DOM handles in the store

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The store is fully functional; it will receive real data once App.tsx wires the `change` event handler in Plan 04.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes. State is non-sensitive chemistry data (T-02-05 `accept` disposition per threat register).

## Self-Check: PASSED

Files exist:
- FOUND: src/store.ts
- FOUND: src/__tests__/store.test.ts

Commits exist:
- FOUND: fb54f67
- FOUND: f01b53c
