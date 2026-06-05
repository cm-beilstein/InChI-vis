---
phase: 08-hydrogen-implicit-explicit-highlight
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/hooks/__tests__/useKetcherHighlights.test.ts
  - src/lib/__tests__/highlightUtils.test.ts
  - src/hooks/useKetcherHighlights.ts
  - src/lib/highlightUtils.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-06-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files reviewed: the two production modules (`useKetcherHighlights.ts`, `highlightUtils.ts`) and their corresponding test files. The Phase 8 implementation adds `renderHBadges`, `cleanHBadges`, and the explicit-H bond path inside `buildSubHoverSpecs`. The overall architecture is sound. No security vulnerabilities or data-loss bugs were found.

Four warnings were identified, the most important being an incorrect `stripVar` implementation that will silently return a wrong property name when CSS custom properties include a fallback value — a currently latent bug that becomes active if any `elementColor`-like function ever adds fallbacks. Two structural type-safety warnings exist in the same file around non-null assertions on optional `SubHover` fields. One warning concerns asymmetric deduplication between the explicit-H and implicit-H paths.

---

## Warnings

### WR-01: `stripVar` is fragile — breaks silently when CSS var has a fallback value

**File:** `src/lib/highlightUtils.ts:59-61`

**Issue:** `stripVar` strips the `var(` prefix and `)` suffix using two separate `.replace()` calls. Each call only removes the **first** occurrence it finds. For a CSS value like `var(--c-el-C, #888)` the output is `--c-el-C, #888` (the trailing `, #888` is left intact). `resolveVarFn` then queries `getComputedStyle(document.documentElement).getPropertyValue('--c-el-C, #888')` which returns an empty string, causing the production fallback to `#888` (grey) for all highlighted atoms — a silent rendering defect.

Currently `elementColor`, `hydroColor`, and `parityColor` do not produce fallback vars, so this bug is latent. However, it will activate the moment any of those functions are updated to include CSS fallbacks, or if a downstream caller passes a var string with a fallback.

**Fix:** Use a proper regex or `slice`:

```typescript
function stripVar(cssVar: string): string {
  const m = cssVar.match(/^var\((--[^,)]+)/);
  return m ? m[1].trim() : cssVar;
}
```

This correctly extracts `--c-el-C` from both `var(--c-el-C)` and `var(--c-el-C, #888)`.

---

### WR-02: Non-null assertion `count!` in `renderHBadges` is technically incorrect

**File:** `src/hooks/useKetcherHighlights.ts:75`

```typescript
const colorVar = isMobile ? '--c-hydro-mobile' : `--c-hydro-${Math.min(count!, 4)}`;
```

**Issue:** `count` is typed as `number | null` (null when `kind === 'mobileH'`). The non-null assertion `count!` tells TypeScript the value is definitely not null, but it IS null on the `mobileH` path. The ternary expression guards correctly at runtime (the `isMobile` branch never evaluates `count!` when count is null), so this does not crash today. But:

1. If the ternary condition is ever refactored and the guard is removed, `Math.min(null, 4)` evaluates to `0` in JavaScript, producing the CSS variable `--c-hydro-0` (which does not exist) and badge text `H0`.
2. TypeScript is being told to suppress its own safety analysis here — a future maintainer gets no warning.

**Fix:** Replace the non-null assertion with a runtime fallback that accurately reflects the type:

```typescript
const colorVar = isMobile
  ? '--c-hydro-mobile'
  : `--c-hydro-${Math.min(count ?? 1, 4)}`;
```

---

### WR-03: Non-null assertions on optional `SubHover` fields (`el!`, `atom!`, `sign!`) suppress type checking for structurally incorrect `SubHover` objects

**File:** `src/lib/highlightUtils.ts:270, 308, 310`

**Issue:** `SubHover.el`, `SubHover.atom`, and `SubHover.sign` are all typed as optional (`?`) in the interface. The switch cases assert them non-null with `!`:

- Line 270: `const el = subHover.el!;` — if `el` is `undefined`, `elementColor(undefined as any)` resolves to `'var(--c-formula)'` and the wrong color is applied.
- Line 308: `const kAtomId = auxMap[subHover.atom!];` — if `atom` is `undefined`, `auxMap[undefined as any]` is `undefined`, and the `return []` guard fires. This is safe by accident.
- Line 310: `const color = resolveVarFn(stripVar(parityColor(subHover.sign!)));` — if `sign` is `undefined`, `parityColor(undefined)` returns `'var(--c-stereo-minus)'` (because `undefined === '+'` is false), applying the wrong color silently.

These assertions bypass TypeScript's protection. An incorrectly constructed `SubHover` produces wrong visual output with no error.

**Fix:** Add explicit runtime guards and remove the `!` assertions:

```typescript
case 'element': {
  const el = subHover.el;
  if (!el) return [];
  // ...
}

case 'stereo': {
  if (subHover.atom == null || !subHover.sign) return [];
  const kAtomId = auxMap[subHover.atom];
  if (kAtomId === undefined) return [];
  const color = resolveVarFn(stripVar(parityColor(subHover.sign)));
  return [{ atoms: [kAtomId], bonds: [], rgroupAttachmentPoints: [], color }];
}
```

---

### WR-04: Asymmetric deduplication of `heavyKAtoms` between explicit-H and implicit-H paths

**File:** `src/lib/highlightUtils.ts:337-339`

**Issue:** In `buildSubHoverSpecs` case `'hAtoms'`, the explicit-H path guards against duplicate heavy-atom pool IDs:

```typescript
if (!heavyKAtoms.includes(heavyId)) heavyKAtoms.push(heavyId);  // line ~333
```

But the implicit-H path (line 339) does not:

```typescript
heavyKAtoms.push(kId);  // no duplicate check
```

If a malformed `auxMap` maps two different canonical IDs to the same pool ID (or if the same canonical appears twice in `subHover.atoms`), the implicit-H path produces duplicate pool IDs in `allAtoms`. The Ketcher highlight API does not document whether it tolerates duplicate atom IDs in a spec — duplicate IDs could cause double-rendering artefacts.

**Fix:** Apply the same guard to the implicit path:

```typescript
} else {
  if (!heavyKAtoms.includes(kId)) heavyKAtoms.push(kId);
}
```

---

## Info

### IN-01: `badge.style.fill = fill` mixed with SVG presentation attributes

**File:** `src/hooks/useKetcherHighlights.ts:101`

**Issue:** `renderHBadges` sets the badge fill via `badge.style.fill = fill` (inline CSS), while all other SVG attributes on the badge (`font-size`, `font-weight`, `text-anchor`, etc.) are set via `setAttribute`. An inline style has higher specificity than a presentation attribute, which is the right choice here. However, if any external stylesheet sets `text { fill: ... }` without `!important`, the inline style will override it. This is likely intentional from the design handoff, but is worth documenting — especially since `whiteAtomLabels` also uses `style.fill` for consistency.

No action required unless the CSS layer introduces a conflicting rule.

---

### IN-02: `_isHighlightingRef` guard is not set before early `return` on line 135

**File:** `src/hooks/useKetcherHighlights.ts:135`

**Issue:** If `!isReady || !ketcherRef.current`, the function returns before setting `_isHighlightingRef.current = true`. This is correct — there is nothing to guard against in that case. However, the placement of the `try` block starting at line 146 (after the flag is set) means any exception thrown between lines 137–144 (reading `editorAny.render.ctab.molecule`) would bypass the `finally` block and leave `_isHighlightingRef.current = true` permanently.

This is a latent correctness issue: if `editorAny.render.ctab.molecule` throws (e.g., because the editor is partially initialised), the `isHighlighting` flag is set but never cleared, permanently suppressing InChI recomputation.

**Fix:** Move the flag assignment inside the `try` block:

```typescript
try {
  if (_isHighlightingRef) _isHighlightingRef.current = true;
  // ... rest of the logic
} finally {
  if (_isHighlightingRef) _isHighlightingRef.current = false;
}
```

---

### IN-03: Test comment says "RED — functions not yet exported" but functions ARE exported

**File:** `src/hooks/__tests__/useKetcherHighlights.test.ts:110-111`

**Issue:** The comment at line 110 says `// Phase 8: renderHBadges + cleanHBadges tests (RED — functions not yet exported)`. However, both `renderHBadges` and `cleanHBadges` are exported from `useKetcherHighlights.ts` (lines 66 and 111). This stale comment suggests these tests were written in advance of the implementation but the comment was not updated after the implementation was shipped.

No functional impact, but the comment will mislead future maintainers into thinking the tests should be failing.

**Fix:** Remove or update the comment:

```typescript
// Phase 8: renderHBadges + cleanHBadges
```

---

_Reviewed: 2026-06-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
