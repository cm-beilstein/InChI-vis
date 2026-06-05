---
phase: "07"
fixed_at: "2026-06-01T14:31:00Z"
review_path: .planning/phases/07-multi-fragment-highlighting-p-layer-and-copy/07-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-06-01T14:31:00Z
**Source review:** .planning/phases/07-multi-fragment-highlighting-p-layer-and-copy/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `h`-layer highlight re-parses raw multi-fragment text, producing wrong canonical indices

**Files modified:** `src/lib/highlightUtils.ts`
**Commit:** a45a532
**Applied fix:** Added import of `countFormulaAtoms` from `./parseInchi`. Replaced the single `parseHydrogenAtoms(layer.text)` and `parseMobileHydrogens(layer.text)` calls with a per-fragment loop that splits `layer.text` on `;`, derives `fragmentAtomCounts` from the formula layer, and adds `cumulativeOffset` to each canonical index before `auxMap` lookup. The offset accumulates after each fragment. New tests added to `highlightUtils.test.ts` covering two-fragment h-layer offset correction and single-fragment regression guard.

### CR-02: `t`-layer highlight re-parses raw multi-fragment text, producing colliding fragment-local indices

**Files modified:** `src/lib/highlightUtils.ts`, `src/lib/__tests__/highlightUtils.test.ts`
**Commit:** 83809d5
**Applied fix:** Applied the same `fragmentAtomCounts` + `cumulativeOffset` split pattern to `case 't':` — splits `layer.text` on `;`, calls `parseStereoParities(fragText)` per fragment, adds `cumulativeOffset` before `auxMap` lookup. Applied the same fix to the `m`/`s` case: split `tLayer.text` on `;` and call `parseStereoAtoms(fragText)` per fragment with accumulated offset. New tests added covering two-fragment t-layer collision fix, single-fragment regression guard, and multi-fragment m-layer delegation.

### WR-01: Guard inconsistency — `'b'` layer excluded from `useKetcherHighlights` early-return

**Files modified:** `src/hooks/useKetcherHighlights.ts`
**Commit:** 841bc16
**Applied fix:** Added `'b'` to the early-return guard array at line 91: `['version', 'q', 'i', 'b']`. Added a comment noting this matches the NON_SPATIAL guard in `buildHighlightSpecs` so both are consistent.

### WR-02: `setTimeout` in `handleCopy` leaks if `InchiSection` unmounts within 1.5 s

**Files modified:** `src/components/InchiSection.tsx`
**Commit:** 11aa009
**Applied fix:** Added `useRef` and `useEffect` to the React import. Declared `mountedRef = useRef(true)` and a cleanup effect that sets `mountedRef.current = false` on unmount. Updated `handleCopy` to check `mountedRef.current` before calling `setCopied(false)` inside the timeout.

### WR-03: Copy button has no `:focus-visible` style

**Files modified:** `src/components/InchiSection.module.css`
**Commit:** 985ce90
**Applied fix:** Added `.copyBtn:focus-visible` rule after `.copyBtn:hover` with `outline: 2px solid var(--c-formula)`, `outline-offset: 2px`, and `color: var(--c-formula)` — matching the exact rule specified in the review.

---

**Test results:** 140 tests passing (135 pre-existing + 5 new multi-fragment tests for CR-01 and CR-02).
**TypeScript check:** `npx tsc --noEmit` — no errors.

---

_Fixed: 2026-06-01T14:31:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
