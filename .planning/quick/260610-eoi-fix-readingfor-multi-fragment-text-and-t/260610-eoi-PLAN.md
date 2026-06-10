---
phase: quick-260610-eoi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/layerInfo.ts
  - src/lib/parseInchi.ts
  - src/lib/highlightUtils.ts
  - src/components/LayerText.tsx
  - src/components/Explanation.tsx
  - src/lib/__tests__/layerInfo.test.ts
autonomous: true
requirements: [BUG-1-readingFor-multifragment, BUG-2-undefined-stereocenters]

must_haves:
  truths:
    - "readingFor produces correctly-offset, fragment-separated text for multi-component InChIs"
    - "Single-fragment readingFor output is byte-identical to current behavior (default fragCounts=[])"
    - "'?' (undefined) stereocenters are parsed, highlighted on canvas, and interactive in the t-layer"
    - "tsc -b is clean and the full vitest suite (185 existing + new) passes"
  artifacts:
    - path: "src/lib/layerInfo.ts"
      provides: "readingFor(layer, atomElements, fragCounts), parseStereoParities '?' support, parityColor '?' branch"
    - path: "src/lib/parseInchi.ts"
      provides: "parseStereoAtoms regex captures '?'"
    - path: "src/lib/highlightUtils.ts"
      provides: "case 't' third 'undefined' atom group colored --c-stereo"
    - path: "src/components/LayerText.tsx"
      provides: "ParityText '?' token interactivity"
    - path: "src/components/Explanation.tsx"
      provides: "fragCounts computed and passed to readingFor"
  key_links:
    - from: "src/components/Explanation.tsx"
      to: "readingFor"
      via: "formulaFragmentCounts(formulaLayer.text) as 3rd arg"
      pattern: "readingFor\\(layer, atomElements, fragCounts\\)"
    - from: "src/lib/highlightUtils.ts case 't'"
      to: "parseStereoParities"
      via: "sign '?' routed to undefined group with --c-stereo"
      pattern: "--c-stereo"
---

<objective>
Fix two scoped bugs in InChI layer rendering for multi-component molecules.

BUG 1 — `readingFor` in layerInfo.ts has no multi-fragment awareness: it parses each layer's whole text with no `;` split and no per-fragment canonical offset. For multi-component molecules the formula ignores `.`, the c-layer invents a spurious cross-fragment bond and mislabels canonicals, and h/t mislabel fragments 2+.

BUG 2 — `?` (undefined) stereocenters are dropped from the t-layer everywhere (parse, color, canvas highlight, interactivity) because regexes only match `[-+]`.

Purpose: Make the explanation reading and stereo highlighting correct for multi-component InChIs and undefined stereocenters, matching the per-fragment offset pattern already established in `enrichLayers` and `LayerText`.

Output: Updated lib + component files and extended regression tests. tsc clean, full vitest green.

Repro: `InChI=1S/C12H19N.C11H17N.C6H6/c1-9(11(3)13)10(2)12-7-5-4-6-8-12;1-9(10(2)12)8-11-6-4-3-5-7-11;1-2-4-6-5-3-1/h4-11H,13H2,1-3H3;3-7,9-10H,8,12H2,1-2H3;1-6H/t9?,10?,11-;9?,10-;/m11./s1` — formulaFragmentCounts=[13,12,6]; fragment canonical ranges A=1-13, C=14-25, B(benzene)=26-31.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md

<interfaces>
From src/lib/parseInchi.ts:
```typescript
export interface Layer { type: LayerType; prefix: string; text: string; atoms: number[]; bonds: number[][]; }
export function parseConnectionBonds(text: string): [number, number][];
export function parseMobileHydrogens(text: string): number[];
export function parseStereoAtoms(text: string): number[];           // regex /(\d+)[\-+]/g — Bug 2a target
export function expandLayerText(text: string): string[];            // splits ';' and 'N*'
export function formulaFragmentCounts(formulaText: string): number[];
```

From src/lib/layerInfo.ts:
```typescript
export function readingFor(layer: Layer, atomElements: Record<number, string>): string;  // signature target Bug 1a
export function formulaReading(s: string): string;
export function parseStereoParities(text: string): Record<number, string>;  // regex /(\d+)([\-+])/g — Bug 2b target
export function parityColor(sign: string): string;                          // Bug 2c target
function atomLabel(atomElements, canon): string;  // private helper, returns el+subscript(canon) or '#'+canon
```

Established per-fragment offset pattern (from enrichLayers 'c' in parseInchi.ts):
- `const fragmentTexts = expandLayerText(layer.text)`
- iterate with `cumulativeOffset` starting 0; after each fragment `cumulativeOffset += fragCounts[fi] ?? 0`
- add `cumulativeOffset` to every parsed atom number before labeling.

CSS vars (src/styles.css): `--c-stereo`, `--c-stereo-plus`, `--c-stereo-minus` all exist.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: readingFor multi-fragment awareness + Explanation wiring</name>
  <files>src/lib/layerInfo.ts, src/components/Explanation.tsx, src/lib/__tests__/layerInfo.test.ts</files>
  <behavior>
    - readingFor(layer, atomElements) with no 3rd arg (or fragCounts=[] or length<=1) produces byte-identical output to current implementation — existing readingFor tests pass unchanged.
    - formulaReading('C12H19N.C11H17N.C6H6') renders three fragment groups separated by '; ' (each group is the existing comma-run for that fragment); a leading integer multiplier per segment (e.g. '2C6H6') is handled/expanded reasonably.
    - readingFor of the repro c-layer with fragCounts [13,12,6] contains NO bond pair crossing the A->C boundary (no bond between fragment-1's last atom 13 and fragment-2's first atom 14 that does not exist), and references offset canonicals (labels with subscripts >= 14 for fragments C/B). MAX=10 truncation preserved.
    - readingFor of the repro h-layer with fragCounts [13,12,6] labels fragment 2+ atoms with offset canonicals. MAX=8 truncation preserved.
    - readingFor of the repro t-layer with fragCounts [13,12,6] includes stereocenters at canonicals 9,10,11 AND 22,23 (fragment C's 9,10 offset by +13); rendered text references atom 22 and 23 (not a second '9'/'10'). '?' centers included (depends on Task 2a parseStereoAtoms change).
  </behavior>
  <action>
    Extend readingFor signature to `readingFor(layer, atomElements, fragCounts: number[] = [])`. When fragCounts is empty or length<=1, all branches MUST behave exactly as today (single fragment, offset 0) — backwards compatible.

    formulaReading (Bug 1b): split input on '.' into segments. For each segment, detect optional leading integer multiplier `/^(\d+)(?=[A-Z])/`; strip it and run the existing element loop on the remainder, expanding/noting the multiplier reasonably. Join per-fragment readings with '; '. Single segment with no multiplier keeps current output exactly.

    c-layer (Bug 1c): mirror the enrichLayers 'c' pattern — `expandLayerText(layer.text)`, accumulate `cumulativeOffset` from fragCounts, call parseConnectionBonds PER fragment text, add offset to each atom in each bond, then combine the bond list. This eliminates the spurious cross-fragment bond and fixes labels. Keep MAX=10 truncation on the combined list. Single fragment path (fragCounts empty/length<=1) must match current parseConnectionBonds(layer.text) result.

    h-layer (Bug 1d): same per-fragment expandLayerText + cumulative offset, mirroring the existing h-reading parser (fixed-H ranges + parseMobileHydrogens) applied per fragment with offset added to atom labels. Keep MAX=8 truncation.

    t-layer (Bug 1e): per-fragment expandLayerText + cumulative offset for stereocenter atom labels; uses parseStereoAtoms (which Task 2a makes capture '?'). List all stereocenters with correct offset labels; '?' ones may be noted as undefined/unspecified.

    Explanation.tsx (Bug 1f): import formulaFragmentCounts from '../lib/parseInchi'. Compute `const formulaLayer = layers.find(l => l.type === 'formula');` and `const fragCounts = formulaLayer ? formulaFragmentCounts(formulaLayer.text) : [];`. Pass fragCounts as the 3rd arg: `readingFor(layer, atomElements, fragCounts)`. If no formula layer, [] is passed.

    Tests: add to layerInfo.test.ts — build layers via parseInchi(repro), atomElements via buildAtomElements(layers) (import from '../parseAuxMapping'), fragCounts via formulaFragmentCounts. Add: formula reading contains '; ' fragment separation; c-layer reading has no A->C boundary bond and references subscripts >=14; t-layer reading references atom 22 and 23. Keep all existing readingFor tests calling readingFor(layer, atomElements) with no 3rd arg — they must still pass (NO-REGRESSION).
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx tsc -b && npx vitest run src/lib/__tests__/layerInfo.test.ts</automated>
  </verify>
  <done>readingFor handles multi-fragment via fragCounts with single-fragment byte-identical fallback; Explanation passes fragCounts; new + existing layerInfo tests pass; tsc clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: '?' undefined stereocenters across parse, color, highlight, LayerText</name>
  <files>src/lib/parseInchi.ts, src/lib/layerInfo.ts, src/lib/highlightUtils.ts, src/components/LayerText.tsx, src/lib/__tests__/layerInfo.test.ts</files>
  <behavior>
    - parseStereoAtoms('9?,10?,11-') deep-equals [9,10,11].
    - parseStereoParities('9?,10?,11-') === {9:'?', 10:'?', 11:'-'}.
    - parityColor('?') === 'var(--c-stereo)'; parityColor('+') === 'var(--c-stereo-plus)'; parityColor('-') === 'var(--c-stereo-minus)' (unchanged).
    - buildHighlightSpecs case 't' on repro layers with identity auxMap ({1:1,...,31:31}) + mock struct: union of highlighted atoms === {9,10,11,22,23}; the '?' atoms (9,10,22) appear in a spec whose color resolves from '--c-stereo' (a distinct undefined group, NOT lumped into minus).
    - b-layer behavior unchanged when no '?' present.
  </behavior>
  <action>
    Bug 2a — parseInchi.ts parseStereoAtoms regex: `/(\d+)[\-+]/g` -> `/(\d+)[\-+?]/g`. Confirm callers (enrichLayers t/b atoms, highlightUtils 'm'/'s' delegation, readingFor 't') tolerate the extra '?' atoms — they should, since they only map canonicals through auxMap.

    Bug 2b — layerInfo.ts parseStereoParities regex: `/(\d+)([\-+])/g` -> `/(\d+)([\-+?])/g` so the returned sign may be '?'.

    Bug 2c — layerInfo.ts parityColor: `'+' -> 'var(--c-stereo-plus)'`, `'-' -> 'var(--c-stereo-minus)'`, otherwise (including '?') -> `'var(--c-stereo)'`.

    Bug 2d — highlightUtils.ts case 't': add a third `undefinedAtoms` group. For sign '?' push the auxMapped id into undefinedAtoms (NOT minus). After the loop, emit a third spec with `color: resolveVarFn('--c-stereo')` when undefinedAtoms.length > 0. Keep existing plus (--c-stereo-plus) and minus (--c-stereo-minus) groups.

    Bug 2e — LayerText.tsx ParityText renderSegment token regex: `/(\d+)([\-+])/g` -> `/(\d+)([\-+?])/g` so '?' tokens are interactive. className: '+' -> styles.parityPlus, '-' -> styles.parityMinus, '?' -> just styles.inchiSubtoken (no color class). subHover stays `{kind:'stereo', atom, sign}` (sign may now be '?').

    Bug 2f — buildSubHoverSpecs case 'stereo' already calls parityColor(subHover.sign); '?' is handled by the 2c change, no further edit.

    Tests: extend layerInfo.test.ts (and add the highlight assertion in layerInfo.test.ts or src/lib/__tests__/highlightUtils.test.ts as fits the existing style) — parseStereoAtoms/parseStereoParities/parityColor assertions above, plus the buildHighlightSpecs case 't' union == {9,10,11,22,23} with the '?' group colored from '--c-stereo'. Use parseInchi(repro) for layers, identity auxMap, identity atomElements where needed, and a mock StructLike (findBondId/bonds/atoms forEach) matching the existing highlightUtils test mocks.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx tsc -b && npx vitest run</automated>
  </verify>
  <done>'?' stereocenters parse, color to --c-stereo, highlight as a distinct undefined group, and are interactive; all 5 repro centers {9,10,11,22,23} highlight; full vitest (185 existing + new) passes; tsc clean.</done>
</task>

</tasks>

<verification>
- `npx tsc -b` clean (no TS errors).
- `npx vitest run` — full suite green (185 prior + new tests).
- No edits to parseAuxMapping remapAuxToPoolIds or App.tsx.
- Changes confined to the six listed files.
</verification>

<success_criteria>
- readingFor multi-fragment correct (formula '; ' separation, no spurious c-bond, offset h/t labels); single-fragment output byte-identical (default fragCounts).
- All 5 repro stereocenters (canonicals 9,10,11,22,23) parse, highlight (with '?' group colored --c-stereo), and are interactive.
- tsc -b clean; full vitest passes.
</success_criteria>

<output>
Create `.planning/quick/260610-eoi-fix-readingfor-multi-fragment-text-and-t/260610-eoi-SUMMARY.md` when done.
</output>
