---
phase: quick-260610-ist
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/highlightUtils.ts
  - src/hooks/useKetcherHighlights.ts
  - src/lib/__tests__/highlightUtils.test.ts
  - src/hooks/__tests__/useKetcherHighlights.test.ts
autonomous: true
requirements: [QUICK-260610-ist]

must_haves:
  truths:
    - "Hovering an /h-layer token (e.g. 4-11H) highlights only the explicit drawn H atoms among that token's atoms — no heavy-atom fill, no bonds."
    - "Hovering an /h-layer token always renders implicit-H count badges, even when the token has zero explicit H atoms drawn (purely implicit token)."
    - "Hovering a formula-layer H token (e.g. H19) highlights explicit drawn H atoms in that fragment AND renders implicit-H badges for every H-bearing heavy atom in that fragment."
    - "Formula-H hover for one fragment does not badge or highlight atoms in any other fragment (no cross-fragment leakage)."
    - "Mobile-H hover behavior is unchanged."
  artifacts:
    - path: "src/lib/highlightUtils.ts"
      provides: "hAtoms case emits explicit-H-only specs (no heavy/bond)"
    - path: "src/hooks/useKetcherHighlights.ts"
      provides: "badge rendering decoupled from specs.length; formula-H fragment-scoped implicit badges"
  key_links:
    - from: "useKetcherHighlights hook"
      to: "renderHBadges"
      via: "always-call for hAtoms; per-count-group synthetic call for formula-H"
      pattern: "renderHBadges"
---

<objective>
Unify hydrogen hover behavior across the formula layer and the /h-layer. Both should
highlight ONLY explicit (drawn) H atoms and render implicit-H count badges at heavy
atoms — with NO heavy-atom fill and NO bonds. Fragment-scoped via canonRange. Mobile-H
(`(H,3,4)`) is untouched.

This REVERSES the Phase 8 hAtoms behavior (which filled heavy atoms + highlighted H–heavy
bonds) and ADDS implicit badge rendering to the formula-H branch (which previously rendered
no badges).

Purpose: a viewer hovering H19 (or any /h token) can account for every hydrogen — explicit
ones highlighted on canvas, implicit ones shown as "H"/"H2"/"H3" badges on their heavy atoms.

Output: updated highlightUtils.ts (hAtoms case), useKetcherHighlights.ts (badge gating +
formula-H badge path), and updated/extended tests. Per InChI passthrough rule, badge counts
are read from already-parsed /h-layer data — never reconstruct the InChI string.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@src/lib/highlightUtils.ts
@src/hooks/useKetcherHighlights.ts
@src/components/LayerText.tsx
@src/lib/__tests__/highlightUtils.test.ts
@src/hooks/__tests__/useKetcherHighlights.test.ts

<interfaces>
From src/lib/parseInchi.ts:
- `interface SubHover { kind: 'element'|'atom'|'stereo'|'hAtoms'|'mobileH'; el?; canonRange?: [number,number]; canonical?; canonicals?; atom?; sign?; atoms?: number[]; count?: number; }`
- `type AuxMap = Record<number, number>` (canonical 1-based → Ketcher pool 0-based)
- `parseHydrogenAtoms(text: string): Record<number, number>` (local-canonical → declared H count; strips mobile-H groups)
- `formulaFragmentCounts(formulaText: string): number[]` (heavy-atom count per fragment)
- `expandLayerText(text: string): string[]` (per-fragment text, handles `;` and `N*`)

From src/lib/highlightUtils.ts:
- `buildSubHoverSpecs(subHover, auxMap, atomElements, hAtomPoolIds, layer, struct, resolveVarFn): HighlightSpec[]`
- `HighlightSpec = { atoms: number[]; bonds: number[]; rgroupAttachmentPoints: number[]; color: string }`
- `hydroColor`, `parseHydrogenAtoms`, `formulaFragmentCounts`, `expandLayerText` are re-exported here

From src/hooks/useKetcherHighlights.ts:
- `renderHBadges(svgRoot, subHover, auxMap, resolveVarFn, hAtomPoolIds=[], struct?)` — reads `subHover.atoms` (canonical) + `subHover.count`; per-atom implicitCount = count − bonded-explicit-H; skips atoms with implicitCount ≤ 0; draws "H"/"H2"/"H3" (mobileH → "H?").
- Hook effect currently: `if (specs.length > 0) { whiteAtomLabels(...); if (hAtoms||mobileH) renderHBadges(...) }`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: RED — rewrite hAtoms-case + badge-gating tests, add formula-H badge tests</name>
  <files>src/lib/__tests__/highlightUtils.test.ts, src/hooks/__tests__/useKetcherHighlights.test.ts</files>
  <behavior>
    In highlightUtils.test.ts — UPDATE the existing "case hAtoms — Phase 8 explicit-H bond path"
    describe block to the NEW contract (intentional behavior change, not regression):
    - Implicit-only token (hAtomPoolIds empty): spec emits NO heavy atom and NO bonds.
      (Old test expected `specs[0].atoms` to contain heavy pool 0 — that assertion is removed.)
      Expectation: for `{kind:'hAtoms', atoms:[1], count:1}`, auxMap {1:0}, hAtomPoolIds [],
      the returned specs contain NO atom equal to the heavy pool (0) and bonds is empty
      (acceptable: `specs` is `[]`, OR a spec whose atoms exclude heavy pool 0).
    - Explicit H token: spec.atoms includes ONLY the explicit H pool ID (6); does NOT include
      the bonded heavy atom (0); spec.bonds is EMPTY.
    - Mixed token: spec.atoms includes only the explicit H pool ID (6), excludes implicit
      heavy atom (0); spec.bonds is empty.
    Keep the existing INCHI-04 hAtoms tests' INTENT but note they pass canonical atoms that ARE
    heavy atoms with empty hAtomPoolIds — under the new contract those produce empty atoms.
    Update those two INCHI-04 hAtoms tests ("atoms from subHover.atoms[]" and "count 3") to
    pass hAtomPoolIds matching the mapped pool IDs so the explicit-H atoms are emitted, OR
    rewrite their assertions to the new explicit-only contract. Keep color assertions only
    where a spec is still emitted.

    In useKetcherHighlights.test.ts — ADD a new describe block "formula-H fragment-scoped badges"
    that drives a new exported helper (see Task 2). Tests (JSDOM, reuse makeAtomGroup pattern):
    - Given a fragment canonRange and an /h-layer parsed into per-atom counts, the helper renders
      one badge per in-range H-bearing heavy atom that has remaining implicit H.
    - Cross-fragment: heavy atoms outside canonRange get NO badge.
    - An in-range heavy atom whose H are all drawn explicitly gets NO badge (reuses skip logic).
    The new helper signature is decided in Task 2; write the test against that signature.
  </behavior>
  <action>
    Rewrite the assertions in the "case hAtoms — Phase 8 explicit-H bond path" describe block of
    src/lib/__tests__/highlightUtils.test.ts to assert the LOCKED new contract: hAtoms specs
    contain ONLY explicit-H pool IDs (those in hAtomPoolIds), never the bonded heavy atom, and
    bonds is always empty. Update the two INCHI-04 hAtoms tests so they remain meaningful under
    the new contract (supply hAtomPoolIds so an explicit-H spec is emitted, or assert empty).
    Do NOT touch any mobileH test. Add the new "formula-H fragment-scoped badges" describe block
    in useKetcherHighlights.test.ts targeting the helper introduced in Task 2 (name it and its
    signature here, then implement to match in Task 2). Run the suite and confirm the rewritten
    and new tests FAIL (RED) while all untouched tests still pass.
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/highlightUtils.test.ts src/hooks/__tests__/useKetcherHighlights.test.ts 2>&1 | tail -20</automated>
  </verify>
  <done>New/rewritten tests fail (RED) describing the explicit-only hAtoms contract and the formula-H badge behavior; mobileH tests and unrelated tests remain green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: GREEN — explicit-only hAtoms spec + always-render hAtoms badges + formula-H badge path</name>
  <files>src/lib/highlightUtils.ts, src/hooks/useKetcherHighlights.ts</files>
  <behavior>
    1. hAtoms case (highlightUtils.ts) emits a single spec whose atoms are ONLY the canonical
       atoms whose pool ID is in hAtomPoolIds (explicit drawn H). No heavy-atom collection, no
       bond collection. If no explicit H atoms → return [] (empty spec set is fine; badges run
       separately in the hook). Color stays hydroColor(count).
    2. Hook: for kind 'hAtoms' and 'mobileH', renderHBadges runs ALWAYS (decoupled from
       specs.length), so purely-implicit tokens still badge. whiteAtomLabels still runs only
       when specs.length > 0. cleanHBadges still runs first on every path.
    3. Hook: for kind 'element' with el==='H' (formula-H), after applying explicit-H specs,
       render implicit badges scoped to subHover.canonRange by reading the /h-layer:
         - Locate the /h-layer in `layers`; expand per-fragment with expandLayerText +
           formulaFragmentCounts to recover GLOBAL canonical → declared H count
           (parseHydrogenAtoms per fragment + cumulative offset — same pattern as case 'h').
         - Keep only heavy atoms whose global canonical is within canonRange [lo,hi].
         - Group those by declared count; for each count group, synthesize
           `{kind:'hAtoms', atoms:<global canonicals>, count}` and call renderHBadges
           (which already subtracts bonded explicit H and skips atoms at ≤0 implicit).
         - If canonRange is undefined (single-fragment formula-H), use the whole /h-layer.
       This makes H19 behave like hovering the union of fragment A's /h tokens.
  </behavior>
  <action>
    Edit the `case 'hAtoms'` block in buildSubHoverSpecs (highlightUtils.ts) to collect ONLY
    canonical atoms whose auxMap pool ID is in hAtomPoolIds; drop the heavyKAtoms and bondIds
    logic entirely. Return one spec `{atoms: explicitHPoolIds, bonds: [], rgroupAttachmentPoints: [], color: resolveVarFn(stripVar(hydroColor(count) ?? 'var(--c-hydro-1)'))}`
    or `[]` if none. This implements LOCKED rule 1 (no heavy fill, no bonds) per the InChI
    passthrough rule — counts already come from parsed layer data.

    In useKetcherHighlights.ts, add an exported helper (matching the signature written in Task 1's
    test) e.g. `renderFormulaHBadges(svgRoot, canonRange, layers, auxMap, resolveVarFn, hAtomPoolIds, struct)`
    that derives global-canonical → declared-count from the /h-layer (reuse expandLayerText +
    formulaFragmentCounts + parseHydrogenAtoms with cumulative offset, exactly like case 'h'),
    filters by canonRange, groups by count, and calls the existing renderHBadges once per count
    group with a synthetic hAtoms subHover. Do NOT reconstruct any InChI string.

    In the hook effect: (a) move the renderHBadges call for hAtoms/mobileH OUT of the
    `if (specs.length > 0)` block so badges render even with zero explicit-H specs; keep
    whiteAtomLabels inside the specs.length>0 guard; (b) when subHover.kind==='element' &&
    subHover.el==='H', call renderFormulaHBadges after applyKetcherHighlights/cleanHBadges.
    Ensure cleanHBadges still precedes all badge rendering on every code path.
  </action>
  <verify>
    <automated>npx tsc -b 2>&1 | tail -5 && npx vitest run 2>&1 | tail -8</automated>
  </verify>
  <done>npx tsc -b is clean; all tests pass including the rewritten hAtoms contract, the always-render badge case, and the formula-H fragment-scoped badge tests; no cross-fragment leakage; mobileH unchanged; total ≥ 202 passing.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| parsed InChI layers → highlight/badge logic | All data already parsed in-browser; no external/untrusted input crosses here. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick260610-01 | Tampering | InChI string reconstruction | mitigate | Badge counts read from already-parsed /h-layer (parseHydrogenAtoms over expandLayerText); never re-join layer.text — enforces CLAUDE.md/MEMORY passthrough rule. |
| T-quick260610-02 | Information disclosure | none | accept | Pure client-side UI highlight feature; no data leaves the browser. |
</threat_model>

<verification>
- `npx tsc -b` exits clean (no type errors).
- `npx vitest run` — all tests pass, total ≥ 202 (baseline) with the intentionally rewritten hAtoms tests now asserting the new contract.
- hAtoms specs never contain heavy-atom pool IDs or bond IDs.
- Purely-implicit /h token still produces badges (badge path decoupled from specs.length).
- Formula-H hover badges only heavy atoms within canonRange (no cross-fragment leakage).
- Mobile-H tests unchanged and green.
</verification>

<success_criteria>
- LOCKED rule 1 (hAtoms: explicit-H only highlight + always-on implicit badges, no heavy fill/bonds) implemented and tested.
- LOCKED rule 2 (formula-H: fragment-scoped explicit-H highlight + implicit badges for all H-bearing heavy atoms in fragment) implemented and tested.
- LOCKED rule 3 (mobile-H) untouched.
- Badge counts sourced from parsed layer data only (passthrough rule honored).
</success_criteria>

<output>
Create `.planning/quick/260610-ist-unify-h-hover-formula-h-count-and-h-laye/260610-ist-SUMMARY.md` when done.
</output>
