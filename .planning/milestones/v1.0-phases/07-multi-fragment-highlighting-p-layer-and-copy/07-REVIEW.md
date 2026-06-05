---
phase: "07"
reviewed: "2026-06-01T00:00:00Z"
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/parseAuxMapping.ts
  - src/lib/parseInchi.ts
  - src/lib/highlightUtils.ts
  - src/hooks/useKetcherHighlights.ts
  - src/components/InchiSection.tsx
  - src/components/InchiSection.module.css
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: fixed
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 7 delivers three features: multi-fragment canonical index offset correction, p-layer
protonation-site highlighting, and copy-to-clipboard. The offset fix in `parseInchi.ts` and
`parseAuxMapping.ts` is correct — `enrichLayers` and `parseAuxMapping` both split on `;` and
accumulate `cumulativeOffset` per fragment, and the `p`-layer case in `highlightUtils.ts` is
correctly implemented.

However, the Phase 7 plan fixed offset accumulation in `enrichLayers` but left the highlight
engine (`buildHighlightSpecs`) partially behind: the `h` and `t` cases still call raw-text
parsers (`parseHydrogenAtoms`, `parseMobileHydrogens`, `parseStereoParities`) directly on the
full unsplit `layer.text`. For multi-fragment molecules these calls produce fragment-local
canonical indices that do not match `auxMap` entries for fragment 2 and beyond. The result is
silent wrong highlights — fragment-2+ atoms are never highlighted for `h` and `t` layers, and
for `t` layers with the same per-fragment atom number, one entry silently overwrites the other.

Two critical findings arise from this. Three additional warnings are noted for guards,
accessibility, and setTimeout cleanup.

---

## Critical Issues

### CR-01: `h`-layer highlight re-parses raw multi-fragment text, producing wrong canonical indices

**File:** `src/lib/highlightUtils.ts:131-148`

**Issue:** `buildHighlightSpecs` case `'h'` calls `parseHydrogenAtoms(layer.text)` and
`parseMobileHydrogens(layer.text)` directly on the raw, unsplit layer text. For a
multi-fragment InChI the h-layer text looks like `"2-6H,1H3;1-6H"` (fragment separator
`;`). Two compounding errors occur:

1. The regex `/([\d,\-]+)H(\d*)(?=,|$)/g` inside `parseHydrogenAtoms` uses a lookahead of
   `,` or end-of-string. A `;` is neither, so entries immediately before a `;` (e.g. `1H3` in
   `"2-6H,1H3;1-6H"`) are **silently dropped**. The methyl-group hydrogen count is never
   highlighted.

2. The fragment-2 segment `"1-6H"` is matched and returns canonical indices `{1..6}`. Those
   indices are looked up directly in `auxMap`, which maps them to fragment-1 atoms. Fragment-2
   atoms (global indices 8–13 for toluene+benzene) are never highlighted.

These are the same symptoms the Phase 7 plan describes fixing — but `highlightUtils.ts` was
not updated alongside `parseInchi.ts`.

**Fix:** Mirror the `enrichLayers` h-case approach inside `buildHighlightSpecs`. Derive
`fragmentAtomCounts` from `layers` (already a parameter), then split `layer.text` on `';'`
and process each fragment with a `cumulativeOffset`:

```typescript
case 'h': {
  const formulaLayer = layers.find(l => l.type === 'formula');
  const fragmentAtomCounts = formulaLayer
    ? formulaLayer.text.split('.').map(f => countFormulaAtoms(f))
    : [];

  const fragmentTexts = layer.text.split(';');
  const colorToAtoms = new Map<string, number[]>();
  let cumulativeOffset = 0;
  fragmentTexts.forEach((fragText, fi) => {
    const hydroAtoms = parseHydrogenAtoms(fragText);
    for (const [canonStr, count] of Object.entries(hydroAtoms)) {
      const canon = Number(canonStr) + cumulativeOffset;
      const colorVar = hydroColor(count);
      if (!colorVar) continue;
      const kId = auxMap[canon];
      if (kId === undefined) continue;
      const color = resolveVarFn(stripVar(colorVar));
      if (!colorToAtoms.has(color)) colorToAtoms.set(color, []);
      colorToAtoms.get(color)!.push(kId);
    }
    cumulativeOffset += fragmentAtomCounts[fi] ?? 0;
  });

  cumulativeOffset = 0;
  const mobileKAtoms: number[] = [];
  fragmentTexts.forEach((fragText, fi) => {
    parseMobileHydrogens(fragText).forEach(c => {
      const kId = auxMap[c + cumulativeOffset];
      if (kId !== undefined) mobileKAtoms.push(kId);
    });
    cumulativeOffset += fragmentAtomCounts[fi] ?? 0;
  });
  // ... rest unchanged
}
```

`countFormulaAtoms` must be imported from `./parseInchi` (it is already exported after Phase 7).

---

### CR-02: `t`-layer highlight re-parses raw multi-fragment text, producing colliding fragment-local indices

**File:** `src/lib/highlightUtils.ts:163-191`

**Issue:** `buildHighlightSpecs` case `'t'` calls `parseStereoParities(layer.text)` on the
full unsplit text. For a multi-fragment t-layer like `"1+;1-"`, the result is
`{1: '-'}` — the second fragment's entry overwrites the first fragment's entry (both happen
to have atom number `1`). Only one fragment's stereocenters can ever be highlighted. For
fragments where the atom numbers differ the wrong `auxMap` entry is still used (fragment-local
index instead of global index).

The `m`/`s` case at line 213 has the same structural bug: `parseStereoAtoms(tLayer.text)`
parses the raw unsplit t-layer text, producing fragment-local indices without offset.

**Fix:** Apply the same `fragmentAtomCounts` + `cumulativeOffset` split pattern:

```typescript
case 't': {
  const formulaLayer = layers.find(l => l.type === 'formula');
  const fragmentAtomCounts = formulaLayer
    ? formulaLayer.text.split('.').map(f => countFormulaAtoms(f))
    : [];

  const fragmentTexts = layer.text.split(';');
  const plusAtoms: number[] = [];
  const minusAtoms: number[] = [];
  let cumulativeOffset = 0;
  fragmentTexts.forEach((fragText, fi) => {
    const parities = parseStereoParities(fragText);
    for (const [canonStr, sign] of Object.entries(parities)) {
      const canon = Number(canonStr) + cumulativeOffset;
      const kId = auxMap[canon];
      if (kId === undefined) continue;
      if (sign === '+') plusAtoms.push(kId);
      else minusAtoms.push(kId);
    }
    cumulativeOffset += fragmentAtomCounts[fi] ?? 0;
  });
  // ... rest unchanged
}
```

Apply the same fix to the `m`/`s` case: split `tLayer.text` on `';'` and accumulate offset
before calling `parseStereoAtoms` per fragment.

---

## Warnings

### WR-01: Guard inconsistency — `'b'` layer excluded from `useKetcherHighlights` early-return but not explained

**File:** `src/hooks/useKetcherHighlights.ts:91`

**Issue:** The non-spatial early-return in `useKetcherHighlights` is `['version', 'q', 'i']`,
which does not include `'b'`. The matching guard in `buildHighlightSpecs` (line 76) includes
`'b'`, so hovering a `b`-layer causes the hook to call `buildHighlightSpecs`, which then
immediately returns `[]`, and `applyKetcherHighlights` clears the canvas. The user-visible
result is correct (no highlight), but the path is needlessly longer than the `version`/`q`/`i`
cases. More importantly, `enrichLayers` in `parseInchi.ts` invests effort computing offset-
corrected `atoms` for the `b` layer (lines 214–225) that are never consumed by the highlight
engine because `'b'` is permanently blocked by the NON-SPATIAL guard.

If double-bond stereo highlighting is out of scope, the `case 'b'` in `enrichLayers` is dead
code. If it is planned for a future phase, add `'b'` to the hook's guard and remove it from
`buildHighlightSpecs`' NON-SPATIAL array so both guards stay in sync.

**Fix (option A — commit to no b-layer highlight):**
```typescript
// useKetcherHighlights.ts line 91 — add 'b' to match buildHighlightSpecs
if (['version', 'q', 'i', 'b'].includes(layer.type)) {
  highlightEditor.highlights.clear();
  return;
}
```

**Fix (option B — plan future b-layer highlighting):** Add a `// TODO(phase-N)` comment on
line 76 of `highlightUtils.ts` and line 91 of `useKetcherHighlights.ts` noting the mismatch.

---

### WR-02: `setTimeout` in `handleCopy` leaks if `InchiSection` unmounts within 1.5 s

**File:** `src/components/InchiSection.tsx:30`

**Issue:** `setTimeout(() => setCopied(false), 1500)` captures `setCopied` from a component
that may have already unmounted when the timeout fires. In React 18 strict-mode double-effect
or during fast navigation the warning "Can't perform a React state update on an unmounted
component" (or the newer no-op equivalent in React 18) can appear.

The Phase 7 summary notes this was accepted (T-07-05) for a single-page tool with no routing.
If that remains the design, add a comment at the call site so a future maintainer knows the
trade-off was deliberate rather than accidental.

**Fix:**
```typescript
// InchiSection.tsx — guard against unmount to prevent stale-state update
const mountedRef = React.useRef(true);
React.useEffect(() => () => { mountedRef.current = false; }, []);

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(inchi);
    setCopied(true);
    setTimeout(() => { if (mountedRef.current) setCopied(false); }, 1500);
  } catch {
    // Clipboard API unavailable — silent failure
  }
}
```

Alternatively, preserve the accepted-risk decision but add:
```typescript
setTimeout(() => setCopied(false), 1500); // accepted leak: SPA, 1.5 s max, T-07-05
```

---

### WR-03: Copy button has no `:focus-visible` style — keyboard users get no visual feedback

**File:** `src/components/InchiSection.module.css:161`

**Issue:** `.copyBtn` defines a `:hover` state (`color: var(--c-formula)`) but no `:focus` or
`:focus-visible` state. Keyboard users who Tab to the button see the default browser outline
only if the browser draws one (many reset stylesheets suppress `outline`). The button already
has `aria-label` for screen-readers, but sighted keyboard users lack a styled focus indicator.

**Fix:** Add alongside `.copyBtn:hover`:
```css
.copyBtn:focus-visible {
  outline: 2px solid var(--c-formula);
  outline-offset: 2px;
  color: var(--c-formula);
}
```

---

## Info

### IN-01: Dead import re-export — `parseStereoAtoms` re-exported from `highlightUtils.ts` but not used externally

**File:** `src/lib/highlightUtils.ts:301`

**Issue:** The barrel re-export at line 301 includes `parseStereoAtoms`:
```typescript
export { elementColor, hydroColor, parityColor, parseStereoParities,
         parseHydrogenAtoms, parseMobileHydrogens, parseStereoAtoms };
```
`parseStereoAtoms` is already exported from `parseInchi.ts`. Duplicating it through
`highlightUtils.ts` creates an additional import path that could cause confusion about the
canonical import location. No component currently imports `parseStereoAtoms` from
`highlightUtils`; the re-export appears to be a carry-over. This is low risk but adds
unnecessary surface area.

**Fix:** Remove `parseStereoAtoms` from the re-export line unless a consumer explicitly needs
it from this module.

---

_Reviewed: 2026-06-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
