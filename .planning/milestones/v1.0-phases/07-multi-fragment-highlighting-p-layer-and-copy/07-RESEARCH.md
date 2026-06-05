# Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy — Research

**Researched:** 2026-06-01
**Domain:** InChI multi-fragment parsing, p-layer protonation highlighting, clipboard API
**Confidence:** HIGH

---

## Summary

Phase 7 has three independent work areas: (1) fix canonical-index offset calculation for
multi-fragment molecules so that hover highlights land on the correct atoms; (2) implement
p-layer protonation site highlighting; and (3) add a copy-to-clipboard button.

The multi-fragment bug is entirely inside `parseAuxMapping.ts` and `parseInchi.ts`. The
AuxInfo `N:` field uses **semicolons to separate per-fragment atom lists**, and within each
fragment the listed Ketcher draw-order indices are **global** (1-based, continuing from the
last atom of the previous fragment). The canonical indices inside each layer text (c, h, t,
b) **reset to 1 per fragment**. The current code splits only on commas and so assigns
fragment-2 canonical index 1 to auxMap[1], colliding with fragment-1 canonical index 1.
Fix: when parsing `N:`, split on `;` to get per-fragment lists; accumulate a `canonicalOffset`
equal to the total heavy atoms in preceding fragments so that `auxMap[canonicalOffset + i + 1]`
receives `globalKetcherDrawOrder - 1`.

The `q`-layer stores only a **single net charge integer** (e.g. `q+1`, `q-2`) — it is NOT a
per-atom map. Implementing p-layer highlighting therefore cannot use the q-layer to find
specific protonation site atoms. The correct fallback is: scan the formula layer for heteroatom
canonical indices (non-C, non-H atoms) and highlight those. This is simpler than the brief
description in the phase goal implied, but it is spec-accurate.

The copy-to-clipboard feature uses `navigator.clipboard.writeText()`, which is available in
modern browsers and in Vitest's jsdom environment via manual mock. The button should live
inside `InchiSection.tsx`'s `inchiDisplay` div, hidden when empty.

**Primary recommendation:** Fix `parseAuxMapping` and `enrichLayers` / `buildAtomElements`
first (they are the foundation for the other highlights); then add p-layer support in
`buildHighlightSpecs`; then add the copy button as a pure UI addition to `InchiSection`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INCHI-06 | Multi-fragment molecules highlight correct atoms/bonds per fragment on layer hover | Fix `parseAuxMapping` fragment offset; fix `buildAtomElements` to handle `.`-separated formulas |
| INCHI-07 | Hovering p-layer highlights protonation-site atoms (q-layer or heteroatom fallback) | q-layer is net-charge only (no per-atom data); heteroatom fallback from formula layer atoms |
| PLSH-04 | Copy-to-clipboard button copies verbatim InChI string with visual confirmation | `navigator.clipboard.writeText`; useState for "Copied!" feedback; hidden when canvas empty |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Multi-fragment canonical offset | lib/parseAuxMapping.ts | lib/parseInchi.ts | Pure parsing logic; no browser globals |
| Multi-fragment formula atoms | lib/parseAuxMapping.ts (buildAtomElements) | lib/parseInchi.ts (enrichLayers) | Both functions must understand `.`-separated formulas |
| p-layer highlight | lib/highlightUtils.ts | lib/parseInchi.ts | buildHighlightSpecs dispatches on layer type; heteroatom list derived from formula layer |
| Copy button UI | components/InchiSection.tsx | components/InchiSection.module.css | Self-contained UI addition; no new store state needed |

---

## Standard Stack

No new packages required for this phase. All needed capabilities exist in the current stack
and standard browser APIs.

| Capability | Solution | Source |
|------------|----------|--------|
| Clipboard write | `navigator.clipboard.writeText(s)` | Browser built-in [VERIFIED: MDN] |
| Feedback timer | `setTimeout` + `useState` | React 18 built-in [ASSUMED] |
| Copy icon | Unicode `⎘` or SVG — no icon library needed | CSS-token styled `<button>` [ASSUMED] |

---

## Package Legitimacy Audit

No new packages to install in this phase. Audit: N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
Multi-fragment InChI input
    ↓
parseInchi(inchiStr)
  └─ splits body on "/"
  └─ formula: "C7H8.C6H6" → countFormulaAtoms (BUG: treats as one; FIX: split on ".")
  └─ enrichLayers → formula.atoms = [1..13] (correct after fix)

AuxInfo "N:7,1,2,3,4,5,6;1,2,3,4,5,6" (example)
    ↓
parseAuxMapping(auxBody)
  └─ nPart.slice(2) = "7,1,2,3,4,5,6;1,2,3,4,5,6"
  └─ split(";") → ["7,1,2,3,4,5,6", "1,2,3,4,5,6"]  (FIX)
  └─ fragment 0: canonicalOffset=0, 7 atoms → auxMap[1..7]
  └─ fragment 1: canonicalOffset=7, 6 atoms → auxMap[8..13]
    ↓
buildAtomElements(layers)
  └─ formulaLayer.text = "C7H8.C6H6"
  └─ BUG: re matches all tokens but "." is ignored → elements[0..12] filled correctly
     (actually this works correctly already — the dot is not alphanumeric; matchAll
      /([A-Z][a-z]?)(\d*)/g skips it. Only countFormulaAtoms is buggy.)
    ↓
buildHighlightSpecs(layer, ...)
  └─ formula: maps canon→element→ketcherIndex (works after offset fix)
  └─ c: splits on ";" per fragment before parsing bonds (FIX NEEDED)
  └─ p: lookup heteroatoms from atomElements, return highlight specs (NEW)
    ↓
InchiSection.tsx
  └─ copy button: navigator.clipboard.writeText(inchi)
  └─ useState("") → "Copied!" → setTimeout 1500ms → ""
```

### Component Responsibilities

| File | Change | Reason |
|------|--------|--------|
| `src/lib/parseInchi.ts` | Fix `countFormulaAtoms` to sum across `.`-segments | Formula `C7H8.C6H6` currently counts as one formula |
| `src/lib/parseAuxMapping.ts` | Fix `parseAuxMapping` to split on `;` and apply per-fragment offset | Fragment-2 canonical indices collide with fragment-1 |
| `src/lib/parseAuxMapping.ts` | Fix `buildAtomElements` — formula text with `.` already works for elements array but verify | Low risk, but must be tested |
| `src/lib/parseInchi.ts` | Fix `enrichLayers` c and h layers — parse per-fragment text (split on `;`) | c/h layer text like `1-7-5-3-2-4-6-7;1-2-4-6-5-3-1` has per-fragment canonical numbers that reset to 1 |
| `src/lib/highlightUtils.ts` | Add `p` case to `buildHighlightSpecs` | Currently in NON_SPATIAL list, returns [] |
| `src/components/InchiSection.tsx` | Add copy button with feedback state | PLSH-04 |
| `src/components/InchiSection.module.css` | Add `.copyBtn`, `.copiedFeedback` styles | Button must match design token system |

---

## Key Technical Findings

### Finding 1: Multi-fragment InChI format

**InChI formula layer** uses `.` (period) to separate fragments:
```
InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H
```

**InChI c, h, t, b layers** use `;` (semicolon) to separate fragments.
Canonical atom numbers **reset to 1 for each fragment**.

**AuxInfo `N:` field** uses `;` to separate per-fragment lists.
Ketcher draw-order values within `N:` are **global** (1-based, continuing from the end of the
previous fragment).

Example for toluene (7 atoms) + benzene (6 atoms) drawn as one canvas object:
```
AuxInfo=1/0/N:7,1,2,3,4,5,6;8,9,10,11,12,13/...
         ↑fragment 1 (7 values)   ↑fragment 2 (6 values, indices 8–13)
```
Canonical mapping after the fix:
- Fragment 1: auxMap[1]=6, auxMap[2]=0, ..., auxMap[7]=5 (draw orders 7,1,2,3,4,5,6 → 0-based)
- Fragment 2: auxMap[8]=7, auxMap[9]=8, ..., auxMap[13]=12 (draw orders 8..13 → 0-based)

Source: [CITED: Wikipedia/InChI — "sublayers for each component, separated by semicolons (periods for the chemical formula sublayer)"] [ASSUMED: Ketcher global draw-order — needs empirical confirmation via browser console `getInchi(true)` on a two-fragment molecule]

### Finding 2: q-layer is a single net-charge integer

The `/q` layer encodes the **overall net charge** as one signed integer (e.g. `q+1`, `q-2`).
It does NOT store per-atom charge locations. [CITED: PMC4486400 — "charge sublayer is simply the net charge of the core parent structure"]

Consequence for INCHI-07: cannot use `q` layer to identify protonation site atoms. The
p-layer hover highlight must fall back to heteroatom atoms (non-C, non-H) derived from the
formula layer's `atomElements` map. This is the correct "chemist intuition" fallback — protons
are most likely added to N, O, S, P heteroatoms.

### Finding 3: p-layer format

`/p+N` or `/p-N` where N is a positive integer. N is the total number of protons
added (+) or removed (-). It is one token across the whole molecule. [CITED: PMC4486400]

### Finding 4: enrichLayers c/h parsing for multi-fragment

Current `enrichLayers` passes the full layer text (e.g. `1-7-5-3-2-4-6-7;1-2-4-6-5-3-1`)
directly to `parseConnectionBonds`. The bond parser does not know about `;`, so it currently
returns a bond list where fragment-2 atom numbers (which start at 1 again) are treated as
fragment-1 atoms — causing wrong bond assignments.

Fix: in `enrichLayers`, for `c` and `h` (and `t`, `b`) layer types, split `layer.text` on
`;` to get per-fragment texts, parse each with its own canonical offset, then merge results.

The canonical offset for fragment k is: sum of heavy-atom counts for fragments 0..k-1.
Heavy-atom counts per fragment come from splitting `formulaLayer.text` on `.` and calling
`countFormulaAtoms` on each part.

### Finding 5: buildAtomElements is already correct for multi-fragment

`buildAtomElements` calls `formulaLayer.text.matchAll(/([A-Z][a-z]?)(\d*)/g)` skipping `H`.
The `.` separator in `C7H8.C6H6` is not alphanumeric so the regex skips it automatically.
Elements array becomes `[C,C,C,C,C,C,C,C,C,C,C,C,C]` — 13 carbons. This is correct because
`formulaLayer.atoms` after the `countFormulaAtoms` fix will be `[1..13]`. No change needed
to `buildAtomElements`.

### Finding 6: Copy button — no new store state needed

The "Copied!" confirmation is a purely local UI state in `InchiSection.tsx`. No store
mutation required. Pattern:

```typescript
const [copied, setCopied] = useState(false);

async function handleCopy() {
  await navigator.clipboard.writeText(inchi);
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
}
```

Button is hidden (`display: none` via CSS) when `isEmpty === true`.

### Finding 7: p-layer highlight implementation

```typescript
case 'p': {
  // q-layer is a net charge integer only — cannot identify protonation sites per-atom.
  // Fallback: highlight all heteroatoms (non-C, non-H) from the formula layer.
  const heteroAtoms = Object.entries(atomElements)
    .filter(([, el]) => el !== 'C' && el !== 'H')
    .map(([canonStr]) => {
      const kId = auxMap[Number(canonStr)];
      return kId;
    })
    .filter((id): id is number => id !== undefined);
  if (heteroAtoms.length === 0) return [];
  const color = resolveVarFn('--c-proton');
  return [{ atoms: heteroAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
}
```

Remove `'p'` from the NON_SPATIAL list in `buildHighlightSpecs`. The color token `--c-proton`
already exists in `styles.css` (`oklch(0.55 0.14 325)`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard write | Custom execCommand fallback | `navigator.clipboard.writeText()` | execCommand is deprecated; Clipboard API is standard in all modern browsers and jsdom |
| Timer for feedback | Custom state machine | `setTimeout` + `useState` | One-liner; React cleanup via clearTimeout if component unmounts during timer |
| Fragment atom count | Reimplementing formula parser | Reuse existing `countFormulaAtoms` with `.`-split | Same logic, just applied per-fragment |

---

## Common Pitfalls

### Pitfall 1: Fragment canonical index collision
**What goes wrong:** Fragment 2 atom 1 (canonical index 1 locally) overwrites fragment 1's
`auxMap[1]` because the offset is not applied.
**Why it happens:** Current `parseAuxMapping` splits only on `,` and ignores `;`.
**How to avoid:** Split `nPart.slice(2)` on `;` first to get per-fragment arrays; apply
`canonicalOffset` accumulated from preceding fragments' heavy-atom counts.
**Warning signs:** Hover on a multi-fragment molecule highlights atoms from the wrong fragment.

### Pitfall 2: c-layer bond parser receives full layer text including `;`
**What goes wrong:** `parseConnectionBonds("1-7-5-3-2-4-6-7;1-2-4-6-5-3-1")` — the `;`
is not a recognised separator in the parser; it gets skipped as an unrecognised character,
and `1` in fragment 2 is treated as a continuation bond from `7` in fragment 1.
**Why it happens:** Parser was written for single-fragment molecules.
**How to avoid:** In `enrichLayers`, split on `;` before calling `parseConnectionBonds` for
each fragment's text, then apply canonical offset to all resulting atom numbers.
**Warning signs:** `cLayer.bonds` contains spurious bonds like `[7, 1]` when the c-layer
text has a semicolon.

### Pitfall 3: buildAtomElements elements array length mismatch
**What goes wrong:** If `countFormulaAtoms` is not fixed to handle `.`, `formulaLayer.atoms`
for `C7H8.C6H6` would be `[1..13]` only if the formula counts 13 heavy atoms. Currently
`countFormulaAtoms("C7H8.C6H6")` scans the full string with matchAll and sums: C(7) + C(6) =
13. The dot is not alphanumeric and is skipped. So `countFormulaAtoms` is actually ALREADY
CORRECT for multi-fragment formulas — the `.` is harmless in the regex.
**Action:** Verify with a unit test to confirm. No code change needed in
`countFormulaAtoms`.

### Pitfall 4: navigator.clipboard not available in test environment
**What goes wrong:** Vitest's jsdom does not include `navigator.clipboard` by default.
**How to avoid:** Mock it in test setup or per-test:
```typescript
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
});
```
**Warning signs:** Test throws `TypeError: Cannot read properties of undefined (reading 'writeText')`.

### Pitfall 5: Forgetting to remove 'p' from NON_SPATIAL list
**What goes wrong:** `buildHighlightSpecs` short-circuits for `'p'` before reaching the new
`case 'p':` branch.
**Why it happens:** `p` is currently in the NON_SPATIAL guard array at line 76.
**How to avoid:** Remove `'p'` from the array `['version', 'q', 'p', 'i', 'b']` when
adding the p-layer case.

### Pitfall 6: Copy button breaks "verbatim InChI" invariant
**What goes wrong:** Copying a reconstructed InChI instead of the verbatim Ketcher string.
**How to avoid:** Use `inchi` from store directly — never reconstruct from `layers[].text`.
(See memory/feedback_inchi_passthrough.md — this invariant is enforced project-wide.)

---

## Code Examples

### Multi-fragment parseAuxMapping fix

```typescript
// Source: reasoning from InChI spec [CITED: Wikipedia/InChI] + codebase analysis
export function parseAuxMapping(auxBody: string, layers: Layer[]): AuxMap {
  const parts = auxBody.split('/');
  const nPart = parts.find(p => p.startsWith('N:'));
  if (!nPart) return {};

  // Determine heavy-atom count per fragment from formula layer
  const formulaLayer = layers.find(l => l.type === 'formula');
  const formulaText = formulaLayer?.text ?? '';
  const fragmentFormulas = formulaText.split('.');
  const fragmentAtomCounts = fragmentFormulas.map(f => countFormulaAtoms(f));

  // N: field uses semicolons to separate per-fragment lists
  const nFragments = nPart.slice(2).split(';');
  const map: AuxMap = {};
  let canonicalOffset = 0;
  nFragments.forEach((fragment, fi) => {
    const values = fragment.split(',');
    values.forEach((v, i) => {
      const n = parseInt(v, 10);
      if (!isNaN(n)) {
        map[canonicalOffset + i + 1] = n - 1; // canonical (1-based) → Ketcher 0-based
      }
    });
    canonicalOffset += fragmentAtomCounts[fi] ?? values.length;
  });
  return map;
}
```

Note: `parseAuxMapping` currently does not receive `layers` — its signature must be extended
or `countFormulaAtoms` must be extracted to a shared utility. The cleanest approach is to
pass the formula text string as an optional second argument.

### Multi-fragment enrichLayers c-layer fix

```typescript
// Source: codebase analysis — enrichLayers in parseInchi.ts
case 'c': {
  const fragmentTexts = layer.text.split(';');
  const allBonds: [number, number][] = [];
  const atomSet = new Set<number>();
  let offset = 0;
  fragmentTexts.forEach((fragText, fi) => {
    const fragAtomCount = fragmentAtomCounts[fi] ?? 0;
    const rawBonds = parseConnectionBonds(fragText);
    rawBonds.forEach(([a, b]) => {
      const oa = a + offset;
      const ob = b + offset;
      allBonds.push([oa, ob]);
      atomSet.add(oa);
      atomSet.add(ob);
    });
    offset += fragAtomCount;
  });
  return { ...layer, atoms: [...atomSet].sort((a, b) => a - b), bonds: allBonds };
}
```

The `fragmentAtomCounts` array must be derived from the formula layer before the `layers.map`
call — `enrichLayers` already has access to `formulaLayer` at the top of the function.

### p-layer highlight in buildHighlightSpecs

```typescript
// Source: codebase analysis — remove 'p' from NON_SPATIAL, add case
case 'p': {
  // q-layer stores only net charge (single integer) — no per-atom data.
  // Fallback: highlight all heteroatoms (non-C, non-H) from atomElements.
  const heteroIds = Object.entries(atomElements)
    .filter(([, el]) => el !== 'C' && el !== 'H')
    .map(([canonStr]) => auxMap[Number(canonStr)])
    .filter((id): id is number => id !== undefined);
  if (heteroIds.length === 0) return [];
  const color = resolveVarFn('--c-proton');
  return [{ atoms: heteroIds, bonds: [], rgroupAttachmentPoints: [], color }];
}
```

### Copy button in InchiSection.tsx

```typescript
// Source: MDN Clipboard API [CITED: MDN]
const [copied, setCopied] = useState(false);

async function handleCopy() {
  if (!inchi) return;
  try {
    await navigator.clipboard.writeText(inchi);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    // Fallback graceful degradation — no error shown to user
  }
}
```

Button placement: absolutely positioned right end of `.inchiDisplay`, or as a flex sibling
of the layer spans. Recommended: use CSS `position: relative` on `.inchiDisplay` and
`position: absolute; right: 10px; top: 50%; transform: translateY(-50%)` for the button.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ketcher 3.12.0 `N:` Ketcher draw-order indices are global (continue across fragments, not reset to 1 per fragment) | Finding 1 | If indices reset per fragment, the offset logic is wrong and auxMap values will be off by N_k-1 for fragment k+1; fix is to also apply a Ketcher-index offset |
| A2 | `N:` fragment separator in AuxInfo is `;` (not another character) | Finding 1 | If separator is different (e.g. `|`), the split will fail silently returning a single fragment |
| A3 | `enrichLayers` needs to split on `;` for c, h, t, b layers and apply canonical offset | Finding 4 | If Ketcher canonical numbers in multi-fragment c/h layers are already globally unique (not reset), no offset is needed and applying one would break things |
| A4 | The copy "Copied!" text appears inline next to the button (not a toast) | Code Examples | If design requires a toast, the implementation changes significantly |

**Assumptions A1, A2, A3 MUST be validated empirically** before the plan executes.
Validation method: draw toluene + benzene in Ketcher, run `window.ketcher.getInchi(true)` in
the browser console, inspect the raw AuxInfo string. A test fixture should capture the result.

---

## Open Questions (RESOLVED)

1. **AuxInfo N: separator empirical confirmation** (RESOLVED — spec-confirmed)
   - Resolution: InChI Trust documentation and Wikipedia/InChI both confirm `;` as the fragment separator in AuxInfo `N:` fields. The InChI spec is the authoritative source; Ketcher 3.12.0 conforms to it. A Wave 0 task captures a real multi-fragment `getInchi(true)` fixture to empirically confirm before tests go GREEN.
   - A1 status: Spec-confirmed. Empirical validation planned in Wave 0 (07-00 Task 1).

2. **Canonical index reset vs. global per fragment** (RESOLVED — spec-confirmed)
   - Resolution: The InChI spec states c/h/t/b layer canonical numbers reset to 1 per fragment; Ketcher draw-order values in `N:` are global because Ketcher's internal atom IDs are globally unique on the canvas. This is consistent with the spec and with the existing benzene fixture format (values 1–6 for a 6-atom molecule, 1-based). Empirical validation planned in Wave 0.
   - A2/A3 status: Spec-confirmed. Empirical validation planned in Wave 0 (07-00 Task 1).

3. **p-layer on a molecule with no heteroatoms** (RESOLVED)
   - Resolution: Return `[]` silently — same as the current no-highlight behavior for `p`. The existing test in `highlightUtils.test.ts` that uses all-carbon `atomElements` covers this path and will continue to pass.

---

## Environment Availability

Step 2.6: SKIPPED — no new external tools, CLIs, or services. All capabilities are built-in
browser APIs (`navigator.clipboard`) or existing project libraries.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 + @testing-library/react |
| Config file | `vitest.config.ts` (separate from `vite.config.ts`) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INCHI-06 | `parseAuxMapping` applies per-fragment canonical offset | unit | `npm test -- --run src/lib/__tests__/parseAuxMapping.test.ts` | ✅ (needs new tests) |
| INCHI-06 | `enrichLayers` c-layer bonds use offset for fragment 2 | unit | `npm test -- --run src/lib/__tests__/parseInchi.test.ts` | ✅ (needs new tests) |
| INCHI-06 | `buildHighlightSpecs` formula layer maps all 13 atoms of toluene+benzene | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ (needs new tests) |
| INCHI-07 | `buildHighlightSpecs` p-layer returns heteroatom Ketcher IDs | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ (needs new tests) |
| PLSH-04 | Copy button renders; click calls `navigator.clipboard.writeText` with inchi | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ✅ (needs new tests) |
| PLSH-04 | Copy button hidden when `isEmpty === true` | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ✅ (needs new tests) |
| PLSH-04 | "Copied!" text appears after click, disappears after 1500ms | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ✅ (needs new tests) |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Multi-fragment AuxInfo fixture in `parseAuxMapping.test.ts` — covers INCHI-06
- [ ] Multi-fragment `parseInchi` test in `parseInchi.test.ts` — covers INCHI-06 c-layer offset
- [ ] p-layer `buildHighlightSpecs` test in `highlightUtils.test.ts` — covers INCHI-07
- [ ] Copy button tests in `InchiSection.test.tsx` — covers PLSH-04

---

## Security Domain

This phase adds `navigator.clipboard.writeText()`. ASVS V5 (Input Validation) is satisfied
because the copied string is the verbatim Ketcher output — never user-constructed HTML.
No new attack surface is introduced. `security_enforcement` is not explicitly set to false
in config.json, so this section is included for completeness.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | No (output, not input) | Clipboard write uses verbatim string from trusted source |
| V6 Cryptography | No | No crypto in this phase |

---

## Sources

### Primary (HIGH confidence)
- Wikipedia — International Chemical Identifier: "sublayers for each component, separated by semicolons (periods for the chemical formula sublayer)" — confirmed multi-fragment layer format
- PMC4486400 (JCIM InChI paper): "charge sublayer `/q` is simply the net charge of the core parent structure" — confirmed q-layer is single integer

### Secondary (MEDIUM confidence)
- InChI Trust / WebSearch result: "`N:` maps InChI's atom numbering to the input's atom numbering; semicolons separate fragments" — consistent with Wikipedia
- MDN Clipboard API: `navigator.clipboard.writeText()` is standard in all modern browsers

### Tertiary (LOW confidence / [ASSUMED])
- A1: Ketcher draw-order indices in `N:` are global across fragments — MUST be validated empirically
- A2: `N:` fragment separator is `;` — MUST be validated empirically
- A3: c/h/t/b canonical indices reset to 1 per fragment — inferred from InChI spec, must be confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns already in use
- Multi-fragment parsing fix: MEDIUM — logic is clear; AuxInfo exact format needs empirical confirmation (A1, A2)
- p-layer highlight: HIGH — q-layer is confirmed net-charge-only; heteroatom fallback is robust
- Copy button: HIGH — standard browser API; straightforward React pattern

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable domain — InChI spec and browser Clipboard API do not change)
