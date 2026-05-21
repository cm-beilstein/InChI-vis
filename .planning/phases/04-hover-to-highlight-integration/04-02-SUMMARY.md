---
phase: 04-hover-to-highlight-integration
plan: "02"
subsystem: highlight-utils
tags:
  - tdd
  - wave-1
  - green-phase
  - highlight
dependency_graph:
  requires:
    - src/lib/parseInchi.ts
    - src/lib/layerInfo.ts
    - src/lib/parseAuxMapping.ts
    - src/store.ts
    - src/lib/__tests__/highlightUtils.test.ts
    - src/hooks/__tests__/useKetcherHighlights.test.ts
  provides:
    - src/lib/highlightUtils.ts (full buildHighlightSpecs, buildSubHoverSpecs, resolveVar)
    - src/hooks/useKetcherHighlights.ts (useKetcherHighlights hook + applyKetcherHighlights)
  affects:
    - src/store.ts (atomElements field added)
    - src/lib/parseAuxMapping.ts (buildAtomElements + atomElements in parseInchiWithAux)
    - src/App.tsx (atomElements now typed correctly through store)
tech_stack:
  added: []
  patterns:
    - TDD Red-Green-Refactor (Wave 1 = GREEN phase)
    - Dependency injection for resolveVarFn (testable in Node without getComputedStyle)
    - StructLike duck-typing for struct in tests
    - Zustand selector hooks in useEffect for reactive highlight updates
    - any-cast for Ketcher internal API access (editor.highlights, editor.render.ctab)
key_files:
  created: []
  modified:
    - src/lib/highlightUtils.ts
    - src/hooks/useKetcherHighlights.ts
    - src/store.ts
    - src/lib/parseAuxMapping.ts
    - src/__tests__/store.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
decisions:
  - b-layer returns [] (same as non-spatial) — canvas.jsx confirms no halo for b-layer atoms (stereoSet and parityMap both exclude b at lines 70, 77)
  - m/s layers delegate to co-present t-layer via layers.find() — no own atom list
  - subHover !== null fully overrides layer-wide logic (D-05) — all sub-hover kinds handled in buildSubHoverSpecs
  - editor.highlights cast through any — Ketcher 3.12.0 Editor TypeScript type does not expose highlights property; access verified safe via RESEARCH.md Pattern 2
  - atomElements added to InchiState and setInchiData signature — App.tsx was already calling 4-arg form; store was behind
  - buildAtomElements added to parseAuxMapping.ts — derives canonical-to-element map from formula layer expansion
metrics:
  duration: "~8 min"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 6
  completed_date: "2026-05-21"
requirements:
  - INCHI-03
  - INCHI-04
---

# Phase 4 Plan 02: GREEN Phase — Highlight Spec Builders Summary

**One-liner:** Full production implementations of `buildHighlightSpecs`, `buildSubHoverSpecs`, and `useKetcherHighlights` — all 85 tests GREEN, zero TypeScript errors.

## What Was Built

Wave 1 (GREEN phase) replaced all stubs from Plan 01 with complete production implementations. All 29 highlightUtils tests and 3 useKetcherHighlights tests now pass.

### Files Modified

**`src/lib/highlightUtils.ts`** — full implementations:
- `buildHighlightSpecs`: handles all 11 layer types
  - `formula`: atoms grouped by element color via `elementColor()` + `resolveVarFn`
  - `c`: atoms + bonds via `findBondId` for each canonical bond pair
  - `h`: fixed H atoms grouped by hydro count color + mobile H with `--c-hydro-mobile`
  - `t`: atoms split by parity sign (`--c-stereo-plus` / `--c-stereo-minus`)
  - `b`, `version`, `q`, `p`, `i`: return `[]` (non-spatial / no canvas highlight)
  - `m`, `s`: delegate to co-present t-layer atoms with `--c-stereo`
  - `subHover !== null`: delegate entirely to `buildSubHoverSpecs` (D-05)
- `buildSubHoverSpecs`: handles all 5 sub-hover kinds
  - `element`: filter by `atomElements[canon] === el`, color from `elementColor()`
  - `atom`: single atom + all incident bonds via `struct.bonds.forEach`
  - `stereo`: single atom, color from `parityColor(sign)`
  - `hAtoms`: atoms from `subHover.atoms[]`, color from `hydroColor(count)`
  - `mobileH`: atoms from `subHover.atoms[]`, color `--c-hydro-mobile`
- `resolveVar`: production browser implementation via `getComputedStyle`

**`src/hooks/useKetcherHighlights.ts`** — full implementation:
- `applyKetcherHighlights`: always `clear()` then conditionally `create(...specs)`
- `useKetcherHighlights`: subscribes to `hoverIdx`, `subHover`, `layers`, `auxMap`, `atomElements` from Zustand; fires `buildHighlightSpecs` + `applyKetcherHighlights` in `useEffect`; handles null/non-spatial cases with `clear()` only

**`src/store.ts`** — `atomElements: Record<number, string>` added to `InchiState` and `setInchiData` signature (auto-fix for App.tsx 4-arg call)

**`src/lib/parseAuxMapping.ts`** — `buildAtomElements()` helper added; `parseInchiWithAux` now returns `atomElements` in its result object

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `atomElements` missing from `InchiState` and `setInchiData`**
- **Found during:** Task 2 TypeScript check
- **Issue:** `App.tsx` was already calling `setInchiData` with 4 args (`atomElements` as 4th), but the store interface only accepted 3 args — TypeScript error TS2554
- **Fix:** Added `atomElements: Record<number, string>` to `InchiState`, initializer (`atomElements: {}`), and `setInchiData` signature
- **Files modified:** `src/store.ts`, `src/__tests__/store.test.ts`
- **Commit:** eaff378

**2. [Rule 1 - Bug] `parseInchiWithAux` return type lacked `atomElements`**
- **Found during:** Task 2 TypeScript check (TS2339 on `result.atomElements` in App.tsx)
- **Issue:** `parseInchiWithAux` returned `{inchi, layers, auxMap}` but `App.tsx` read `result.atomElements`
- **Fix:** Added `buildAtomElements()` helper that expands formula layer into `Record<canonicalIndex, elementSymbol>` map; included `atomElements` in `parseInchiWithAux` return value
- **Files modified:** `src/lib/parseAuxMapping.ts`
- **Commit:** eaff378

**3. [Rule 1 - Bug] `Editor` TypeScript type lacks `highlights` property**
- **Found during:** Task 2 TypeScript check (TS2339 on `editor.highlights`)
- **Issue:** Ketcher 3.12.0's `Editor` type does not expose `highlights`; direct property access caused TS errors
- **Fix:** Cast `editor` through `any`, then re-type as `{ highlights: { clear(): void; create(...args: HighlightSpec[]): void } }` for typed access. Same pattern already used for `editor.render.ctab.molecule`
- **Files modified:** `src/hooks/useKetcherHighlights.ts`
- **Commit:** eaff378

**4. [Rule 1 - Bug] Unused `HighlightSpec` import in test file**
- **Found during:** Task 2 TypeScript check (TS6196)
- **Issue:** `src/lib/__tests__/highlightUtils.test.ts` imported `HighlightSpec` type but didn't use it
- **Fix:** Removed unused import
- **Files modified:** `src/lib/__tests__/highlightUtils.test.ts`
- **Commit:** eaff378

**5. Worktree base divergence — file restore commit**
- **Found during:** Initial branch setup
- **Issue:** `git reset --soft` to the correct 04-01 base left working tree files (components, planning artifacts) staged as deleted from the older base
- **Fix:** Restored all deleted files from the 04-01 HEAD commit; committed as `chore(04-02): restore files deleted by worktree base divergence` (10d7edd)

## Known Stubs

None. All stubs from Plan 01 have been replaced with full implementations.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `(editor as any)` cast is an internal API access pattern documented in RESEARCH.md Pattern 2 and accepted in the plan's threat model (T-04-02-04).

## Self-Check: PASSED

Files modified:
- FOUND: src/lib/highlightUtils.ts
- FOUND: src/hooks/useKetcherHighlights.ts
- FOUND: src/store.ts
- FOUND: src/lib/parseAuxMapping.ts

Commits:
- FOUND: e2a7f6f (feat(04-02): implement buildHighlightSpecs and buildSubHoverSpecs)
- FOUND: c440743 (feat(04-02): implement useKetcherHighlights hook and applyKetcherHighlights)
- FOUND: eaff378 (fix(04-02): add atomElements to store and parseInchiWithAux, fix TS errors)

Test suite: 85/85 tests GREEN (6 test files)
TypeScript: npx tsc --noEmit exits 0 (zero errors)
