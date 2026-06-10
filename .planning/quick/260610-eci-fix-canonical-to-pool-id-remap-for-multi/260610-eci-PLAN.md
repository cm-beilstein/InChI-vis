---
phase: quick-260610-eci
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/parseAuxMapping.ts
  - src/App.tsx
  - src/lib/__tests__/remapAuxToPoolIds.test.ts
autonomous: true
requirements: [QUICK-260610-eci]
must_haves:
  truths:
    - "For multi-component molecules, hovering an InChI layer highlights the correct fragment's atoms (no cross-fragment mismatch)"
    - "Single-component (sequential) molecules continue to map canonical→poolId identically to before (no regression)"
    - "When the AuxInfo /rC: coordinate field is absent, remap falls back to iteration-order pool IDs"
    - "tsc -b is clean and the full vitest suite passes including new regression tests"
  artifacts:
    - path: "src/lib/parseAuxMapping.ts"
      provides: "parseInchiWithAux now returns molfileCoords; new pure remapAuxToPoolIds helper"
      contains: "remapAuxToPoolIds"
    - path: "src/lib/__tests__/remapAuxToPoolIds.test.ts"
      provides: "Regression test using the real 3-component repro dump + fallback cases"
      contains: "remapAuxToPoolIds"
  key_links:
    - from: "src/App.tsx handleChange"
      to: "remapAuxToPoolIds"
      via: "actualAuxMap = remapAuxToPoolIds(result.auxMap, result.molfileCoords ?? [], liveAtoms, poolIds)"
      pattern: "remapAuxToPoolIds"
    - from: "remapAuxToPoolIds"
      to: "parseInchiWithAux molfileCoords"
      via: "molfileCoords (parsed from /rC:) indexed by molfile rank"
      pattern: "molfileCoords"
---

<objective>
Fix the canonical→Ketcher pool-ID remap for multi-component molecules.

Purpose: The current inline remap in `handleChange` assumes molfile serialization order (which AuxInfo `N:` rank values reference) equals `molecule.atoms` pool-ID iteration order. For multi-component molecules, getInchi's molfile groups atoms by connected component while pool IDs are interleaved across components, so the two orders diverge — ~25/31 atoms map to the WRONG pool ID and hovering a fragment highlights the wrong atoms. Proven offline with the user's real `getInchi(true)` output.

Fix: coordinate matching via the AuxInfo `/rC:` field, which lists each molfile atom's coordinates in molfile order. Match each molfile rank to the live Ketcher atom at the same coordinates (Ketcher exports molfile with y negated). Fall back to the old iteration-order behavior when coordinates are missing or unmatched, guaranteeing no regression for the single-component sequential case.

Output: extended `parseInchiWithAux` (returns `molfileCoords`), a new pure `remapAuxToPoolIds` helper, the rewired `handleChange`, and a regression test using the exact repro dump.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Existing contracts the executor must preserve. From src/lib/parseInchi.ts -->
```typescript
export type AuxMap = Record<number, number>; // canonical 1-based → Ketcher 0-based (per D-10)
export interface Layer { type: LayerType; prefix: string; text: string; atoms: number[]; bonds: number[][]; }
```

From src/lib/parseAuxMapping.ts — current parseInchiWithAux return shape (MUST be preserved and extended, not broken):
```typescript
export function parseInchiWithAux(raw: string): {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  atomElements: Record<number, string>;
};
```
The AuxInfo body is `raw.slice(idx + '\nAuxInfo='.length)`. parseInchiWithAux already isolates `auxBody`; the `/rC:` parse must run over that same body.

NOTE: The "never reconstruct InChI" rule in MEMORY does NOT apply here — this work is purely about the canonical→poolId mapping, not display of the InChI string.
</interfaces>

<rc_field_format>
The `/rC:` field in AuxInfo lists molfile-order atom coordinates:
`/rC:x,y,z;x,y,z;.../`  — semicolon-separated triples, comma-separated x,y,z.
Index i (0-based) = molfile rank i. Take x and y, ignore z. Stop at the next `/`.
Ketcher exports molfile with y NEGATED relative to the live editor's screen y.
</rc_field_format>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Parse /rC: in parseInchiWithAux and add the pure remapAuxToPoolIds helper</name>
  <files>src/lib/parseAuxMapping.ts</files>
  <behavior>
    - parseInchiWithAux on the repro RAW string returns molfileCoords with 31 entries; molfileCoords[0] ≈ {x:3.4973, y:-5.2743}.
    - parseInchiWithAux on a string WITHOUT a /rC: field returns molfileCoords: [].
    - remapAuxToPoolIds with valid coords matches each canonical to the live atom whose (x, -y) is nearest within epsilon; benzene/component pool IDs land in the correct fragment buckets (verified in Task 4).
    - remapAuxToPoolIds with molfileCoords=[] returns fallbackPoolIds[rank] for every canonical (identity-equivalent to old behavior).
    - remapAuxToPoolIds when a single rank has no coords or no live match falls back to fallbackPoolIds[rank] for that one entry only.
  </behavior>
  <action>
Extend `parseInchiWithAux` to parse the `/rC:` field from the AuxInfo body into `molfileCoords: {x:number;y:number}[]` (index = 0-based molfile rank). Use a regex/slice that captures the substring after `/rC:` up to the next `/`, split on `;`, then split each triple on `,` taking the first two numbers (parseFloat) as x and y; ignore z. If there is no `/rC:` field, set `molfileCoords: []`. Add `molfileCoords` to BOTH return paths of parseInchiWithAux (the no-AuxInfo early return → `molfileCoords: []`, and the main return). Keep all existing fields (inchi, layers, auxMap, atomElements) unchanged. Add `molfileCoords` to the function's return-type annotation.

Add an exported pure helper `remapAuxToPoolIds(auxMap: AuxMap, molfileCoords: {x:number;y:number}[], liveAtoms: {poolId:number;x:number;y:number}[], fallbackPoolIds: number[]): Record<number, number>`. For each canonical `c` with `auxMap[c] = rank`: read `coords = molfileCoords[rank]`. If coords exists, find the live atom minimizing `Math.abs(liveAtom.x - coords.x) + Math.abs(-liveAtom.y - coords.y)` (compare liveAtom.x ≈ coords.x and -liveAtom.y ≈ coords.y, since Ketcher screen y is the negation of molfile y). If the best match's combined distance is < epsilon (0.05), set `result[c] = matchedPoolId`. Otherwise — when molfileCoords is empty, `coords` is undefined, or no live atom is within epsilon — fall back to `result[c] = fallbackPoolIds[rank]` (only assign if defined). Keep the helper PURE: no DOM, no Ketcher imports.

Do not modify parseAuxMapping, buildAtomElements, or any parseInchi internals.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx tsc -b 2>&1 | tail -5</automated>
  </verify>
  <done>parseInchiWithAux returns molfileCoords (array, [] when /rC: absent); remapAuxToPoolIds exported as a pure function; tsc -b clean.</done>
</task>

<task type="auto">
  <name>Task 2: Wire remapAuxToPoolIds into App.tsx handleChange</name>
  <files>src/App.tsx</files>
  <action>
In `handleChange`, after collecting `poolIds` (iteration order) and `hAtomPoolIds`, build a `liveAtoms` array from the same render struct: iterate `(ketcher.editor as any).render.ctab.molecule.atoms.forEach((atom, id) => ...)` pushing `{ poolId: id, x: atom.pp.x, y: atom.pp.y }`. Keep the existing `poolIds` array (iteration order) as the fallback. Replace the inline `for (const [canonStr, rank] of Object.entries(result.auxMap)) { ... poolIds[rank] ... }` loop with a single call:
`const actualAuxMap = remapAuxToPoolIds(result.auxMap, result.molfileCoords ?? [], liveAtoms, poolIds);`
Import `remapAuxToPoolIds` from `./lib/parseAuxMapping`. Leave the debounce, generation guard (`thisGen !== generationRef.current`), `isSettingMoleculeRef`/`isHighlightingRef` logic, empty-canvas guard, hAtomPoolIds collection, and the `setInchiData(...)` call UNCHANGED. The `pp` access may need an `any` cast consistent with the existing eslint-disable pattern around the atoms forEach.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx tsc -b 2>&1 | tail -5</automated>
  </verify>
  <done>handleChange builds liveAtoms and calls remapAuxToPoolIds; the inline rank→poolId loop is gone; tsc -b clean; all prior guards preserved.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Regression test with the real 3-component repro dump + fallback cases</name>
  <files>src/lib/__tests__/remapAuxToPoolIds.test.ts</files>
  <behavior>
    - Parse the exact repro RAW string (from task_detail) via parseInchiWithAux; molfileCoords has 31 entries.
    - remapAuxToPoolIds(auxMap, molfileCoords, liveAtoms, fallbackPoolIds): canonical 26..31 → pool IDs all within {24,25,26,27,28,29}; canonical 1..13 → within {6,7,8,9,10,11,55,56,57,58,64,65,66}; canonical 14..25 → within {42,43,44,45,46,47,54,59,60,61,62,63}.
    - The full result is a bijection over 31 distinct pool IDs.
    - No-regression: a small synthetic single-component case where molfileCoords matches liveAtoms in the same order yields the same mapping as fallbackPoolIds[rank].
    - Fallback: molfileCoords=[] forces every canonical to fallbackPoolIds[rank].
  </behavior>
  <action>
Create `src/lib/__tests__/remapAuxToPoolIds.test.ts` following the vitest style of the sibling tests in `src/lib/__tests__/`. Import `parseInchiWithAux` and `remapAuxToPoolIds` from `../parseAuxMapping`.

Use the EXACT repro RAW string from task_detail (the `InChI=1S/...\nAuxInfo=1/0/N:...;...;.../...rC:3.4973,-5.2743,0;...` dump — copy verbatim, single line). Build `liveAtoms` from the live dump in task_detail (poolId:label@x,y with screen y POSITIVE): pool IDs 6,7,8,9,10,11,24,25,26,27,28,29,42,43,44,45,46,47,54,55,56,57,58,59,60,61,62,63,64,65,66 with their listed x,y. Set `fallbackPoolIds = [6,7,8,9,10,11,24,25,26,27,28,29,42,43,44,45,46,47,54,55,56,57,58,59,60,61,62,63,64,65,66]`.

Assertions: parse RAW → expect molfileCoords.length === 31; run remapAuxToPoolIds; assert the three fragment-bucket membership claims above (use `expect([...buckets]).toContain(result[c])` per canonical, or a set-subset check); assert `new Set(Object.values(result)).size === 31` (bijection). Add the no-regression synthetic case (molfileCoords order == liveAtoms order → result[c] === fallbackPoolIds[auxMap[c]]) and the empty-molfileCoords fallback case (result[c] === fallbackPoolIds[auxMap[c]] for all c). Use epsilon tolerance built into the helper; live dump coords are 2-decimal-rounded and rC coords ~4-decimal with y negated, so the 0.05 epsilon absorbs rounding.

Do NOT touch layerInfo.ts (readingFor) or the t-layer '?' handling — explicitly out of scope.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx vitest run src/lib/__tests__/remapAuxToPoolIds.test.ts 2>&1 | tail -20</automated>
  </verify>
  <done>New test passes: 3-component repro maps every canonical into its correct fragment bucket, result is a 31-way bijection, and both fallback/no-regression cases pass.</done>
</task>

</tasks>

<verification>
- `npx tsc -b` is clean (no new type errors).
- `npx vitest run` — full suite passes (171 existing + new file).
- New repro test confirms multi-component fragment buckets and bijection.
- Fallback test confirms identity-equivalent behavior when molfileCoords is empty (no single-component regression).
</verification>

<success_criteria>
- parseInchiWithAux returns molfileCoords parsed from /rC: ([] when absent).
- remapAuxToPoolIds is a pure, exported, unit-tested function using coordinate matching with epsilon 0.05 and iteration-order fallback.
- handleChange wires remapAuxToPoolIds in place of the inline rank→poolId loop, with all prior guards intact.
- tsc -b clean; full vitest suite green.
- No changes to readingFor/layerInfo.ts or t-layer '?' handling.
</success_criteria>

<output>
Create `.planning/quick/260610-eci-fix-canonical-to-pool-id-remap-for-multi/260610-eci-SUMMARY.md` when done.
</output>
