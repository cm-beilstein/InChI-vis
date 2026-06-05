---
phase: 08-hydrogen-implicit-explicit-highlight
verified: 2026-06-05T13:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Load ethanol preset, hover the h-layer chip, then hover a fixed-H sub-token (e.g. '5H')"
    expected: "An H-count SVG badge (e.g. 'H5') appears above the corresponding heavy atom in the Ketcher canvas in the h-layer accent color; mouse-out removes the badge"
    why_human: "SVG badge position (Assumption A1 — getBBox on parent group) is marked as needing empirical verification; JSDOM mock passes but real Ketcher DOM layout may differ"
  - test: "Load a molecule with an explicit H drawn in the canvas, hover the h-layer sub-token that maps to that H atom"
    expected: "The H atom, its bonded heavy atom, and the bond between them are all highlighted in the Ketcher canvas"
    why_human: "Runtime bond-lookup depends on actual hAtomPoolIds being populated from the Ketcher struct; cannot verify without a live Ketcher instance"
  - test: "Load a tautomeric molecule with a (H,...) mobile-H group, hover the mobile-H sub-token"
    expected: "All listed candidate atoms highlight in --c-hydro-mobile; an italic 'H?' badge appears above each atom"
    why_human: "Visual badge appearance and color rendering via resolveVar/canvas conversion of oklch tokens requires browser environment"
  - test: "Hover an h-layer sub-token, then switch hover to a non-h layer (e.g. the c-layer)"
    expected: "No residual [data-h-badge] elements remain in the Ketcher SVG after leaving the h-layer"
    why_human: "Badge lifecycle cleanup on layer-navigation depends on all early-return paths firing cleanHBadges, which requires observing DOM state across hover transitions in a live browser"
---

# Phase 8: Hydrogen Implicit & Explicit Highlight Verification Report

**Phase Goal:** Every comma-separated group in the h-layer is independently hoverable; hovering shows an H-count SVG badge above implicit-H heavy atoms; explicit H atoms highlight with their bond; mobile-H tautomeric groups highlight all candidate atoms
**Verified:** 2026-06-05T13:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fixed-H group hover shows H-count SVG badge above heavy atom, injected and removed with highlight lifecycle | VERIFIED | `renderHBadges` exported from `useKetcherHighlights.ts` (line 66); injects `<text data-h-badge="true">` at `(cx, cy+20)` per atom; `cleanHBadges` called on all 4 paths (3 early-returns + main); 6 unit tests passing |
| 2 | Hovering a mobile-H group highlights all candidate atoms in `--c-hydro-mobile` | VERIFIED | `case 'mobileH'` in `buildSubHoverSpecs` (line 349 of `highlightUtils.ts`) maps atoms via `auxMap`, returns spec with `--c-hydro-mobile`; `renderHBadges` sets `textContent='H?'` and `font-style='italic'` for `kind='mobileH'`; confirmed by unit test |
| 3 | Explicit H atom + bonded heavy atom + bond all highlighted when explicit-H sub-token hovered | VERIFIED | `case 'hAtoms'` in `buildSubHoverSpecs` (lines 314–347 of `highlightUtils.ts`): `hAtomPoolIds.includes(kId)` branch collects `explicitHKAtoms`, iterates `struct.bonds.forEach` to find bonded heavy atom and bond ID; 3 unit tests passing (regression + 2 new) |
| 4 | Badges do not persist when navigating between layers (cleanHBadges on all paths) | VERIFIED | `cleanHBadges(svgRoot)` called 4 times in `useKetcherHighlights.ts`: lines 152, 159, 167 (three early-return paths) and line 174 (main path before conditional badge render) |
| 5 | All existing tests pass; new unit tests cover badge injection lifecycle and explicit-H bond lookup | VERIFIED | `npm test` output: `Tests 165 passed (165)` — 157 pre-existing + 8 new Wave 0 tests all green; `npx tsc --noEmit` exits 0 |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useKetcherHighlights.ts` | `renderHBadges`, `cleanHBadges` exported helpers; hook wiring | VERIFIED | Both functions exported; `cleanHBadges` called on 4 paths; `renderHBadges` called after `whiteAtomLabels` for `hAtoms`/`mobileH` sub-tokens |
| `src/lib/highlightUtils.ts` | Extended `case 'hAtoms'` with explicit-H bond lookup | VERIFIED | `hAtomPoolIds.includes(kId)` branch present; `explicitHKAtoms`, `bondIds`, `heavyKAtoms` variables used; `allAtoms = [...heavyKAtoms, ...explicitHKAtoms]` constructed |
| `src/hooks/__tests__/useKetcherHighlights.test.ts` | `renderHBadges` + `cleanHBadges` unit tests (Wave 0, now GREEN) | VERIFIED | 6 tests in `describe('renderHBadges')` and `describe('cleanHBadges')` — all passing |
| `src/lib/__tests__/highlightUtils.test.ts` | `case 'hAtoms' — Phase 8 explicit-H bond path` tests (Wave 0, now GREEN) | VERIFIED | `describe('case hAtoms — Phase 8 explicit-H bond path')` with 3 tests — all passing; `makeMockStructWithExplicitH` fixture present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `useKetcherHighlights.ts` | Ketcher SVG DOM (`render.paper.canvas`) | `renderHBadges` DOM injection; `cleanHBadges` removal | VERIFIED | `renderHBadges` appends `<text data-h-badge="true">` to `svgRoot`; `cleanHBadges` calls `querySelectorAll('[data-h-badge]').forEach(el => el.remove())` |
| `highlightUtils.ts case 'hAtoms'` | `struct.bonds.forEach` | `hAtomPoolIds.includes(kId)` branch iterating bonds | VERIFIED | Pattern `hAtomPoolIds.includes(kId)` present (1 match); `struct.bonds.forEach` called inside explicit-H branch |
| `useKetcherHighlights.ts hook` | `buildHighlightSpecs` → `applyKetcherHighlights` → `cleanHBadges` → `renderHBadges` | sequential calls in `useEffect` | VERIFIED | Line ordering confirmed: `buildHighlightSpecs` → `applyKetcherHighlights` → `cleanHBadges` → `whiteAtomLabels` → `renderHBadges` (conditional) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `renderHBadges` | `subHover.atoms`, `auxMap` | Zustand store (`useInchiStore`) populated by live Ketcher AuxInfo parsing | Yes (wired to real AuxInfo pipeline from Phase 2) | FLOWING |
| `case 'hAtoms'` explicit-H branch | `hAtomPoolIds` | Zustand store field populated in `App.tsx` from Ketcher struct (Phase 6) | Yes (existing field, Phase 6) | FLOWING |
| `cleanHBadges` | `[data-h-badge]` selector | SVG DOM mutations from `renderHBadges` | Yes (DOM state) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 165 tests pass | `npm test` | `Tests 165 passed (165)` | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0, no output | PASS |
| `renderHBadges` exported | `grep -c "export function renderHBadges" src/hooks/useKetcherHighlights.ts` | `1` | PASS |
| `cleanHBadges` exported | `grep -c "export function cleanHBadges" src/hooks/useKetcherHighlights.ts` | `1` | PASS |
| `cleanHBadges` called 4 times | `grep -c "cleanHBadges(svgRoot)" src/hooks/useKetcherHighlights.ts` | `4` | PASS |
| `hAtomPoolIds.includes` present | `grep -c "hAtomPoolIds.includes" src/lib/highlightUtils.ts` | `1` | PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files exist; no probes declared in PLAN files.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INCHI-08 | 08-00-PLAN.md, 08-01-PLAN.md | Per-group h-layer sub-tokens with implicit H badge, explicit H bond highlight, and mobile-H group highlight | SATISFIED | `renderHBadges`/`cleanHBadges` implement badge lifecycle; `case 'hAtoms'` explicit-H branch implements bond highlight; `case 'mobileH'` implements mobile-H group highlight |

**Note — orphaned requirement:** INCHI-08 is defined in ROADMAP.md (Requirement Coverage table, line 236) and declared in both PLAN files, but is **absent from REQUIREMENTS.md**. The requirement exists and is satisfied by the implementation; the REQUIREMENTS.md omission is a documentation gap only. No code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `useKetcherHighlights.ts` | 84 | Comment: "Assumption A1 — empirical verify needed" | WARNING | Badge position reads from `getBBox()` on parent group; acknowledged by plan as needing runtime validation; tests pass with mocked `getBBox` but real Ketcher SVG layout may produce unexpected coordinates |

No `TBD`, `FIXME`, or `XXX` debt markers found in Phase 8 modified files. The "empirical verify needed" comment is an informational annotation, not an unresolved debt marker.

### Human Verification Required

The automated checks all pass. Four behaviors require browser-environment validation:

#### 1. H-Count Badge Positioning

**Test:** Load the ethanol preset. Hover the h-layer chip. Then hover an individual fixed-H sub-token (e.g. `5H`).
**Expected:** An SVG badge reading "H5" appears visibly above the heavy atom in the Ketcher canvas, colored in the h-layer accent color (`--c-hydro-5` resolved via canvas). Mouse-out removes the badge.
**Why human:** Badge position relies on `getBBox()` returning correct coordinates from the Ketcher SVG parent group. JSDOM mocks this with fixed values; Assumption A1 (noted in code at line 84) states this needs empirical verification. If the badge appears at `(0,0)` or is off-canvas, the position-read strategy must be revised.

#### 2. Explicit-H Bond Highlight in Canvas

**Test:** Draw a molecule with an explicit H atom shown (use "Show Hydrogen" in Ketcher). Hover the h-layer sub-token corresponding to that H group.
**Expected:** The H atom, its bonded heavy atom, and the bond between them are all highlighted simultaneously in the Ketcher canvas.
**Why human:** The `hAtomPoolIds` store field must be populated correctly from the live Ketcher struct in `App.tsx`. Cannot verify the wiring of the complete pipeline (Ketcher struct → `hAtomPoolIds` → `buildSubHoverSpecs`) without a running browser instance.

#### 3. Mobile-H Badge and Color

**Test:** Load a tautomeric molecule (e.g. one with `(H,3,4)` in its h-layer). Hover the mobile-H sub-token.
**Expected:** All candidate atoms are highlighted in `--c-hydro-mobile`. An italic "H?" badge appears above each candidate atom.
**Why human:** The `oklch()` color resolution path (`resolveVar` → canvas 1×1 pixel conversion) requires a real browser context. The rendered badge color and italic styling must be visually confirmed.

#### 4. Badge Cleanup on Layer Navigation

**Test:** Hover an h-layer sub-token (badges appear). Then move the cursor to a different layer (e.g. the c-layer).
**Expected:** All `[data-h-badge]` elements are removed from the Ketcher SVG when leaving the h-layer. No residual badges persist.
**Why human:** This tests the cross-layer cleanup path — specifically that `cleanHBadges` fires on the `hoverIdx` change that switches away from the h-layer. The unit tests cover the call-site structure but cannot simulate the React `useEffect` firing sequence across hover transitions.

### Gaps Summary

No gaps found. All 5 roadmap success criteria are verified by codebase evidence. The phase goal is achieved in code. Human verification is required only for browser-runtime behavior (badge positioning, color resolution, and lifecycle timing).

---

_Verified: 2026-06-05T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
