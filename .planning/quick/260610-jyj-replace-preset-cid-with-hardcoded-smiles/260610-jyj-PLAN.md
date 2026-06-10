---
phase: quick-260610-jyj
plan: 01
type: tdd
wave: 1
depends_on: []
files_modified:
  - src/__tests__/handleMolSelect.test.ts
  - src/__tests__/PresetMolecules.test.tsx
  - src/data/molecules.ts
  - src/lib/handleMolSelectLogic.ts
autonomous: true
requirements: [QUICK-260610-jyj]

must_haves:
  truths:
    - "Selecting a preset loads its structure into Ketcher with NO network request"
    - "Every preset carries a non-empty isomeric SMILES string instead of a numeric cid"
    - "setMolecule is called with the preset's SMILES on success"
    - "On setMolecule rejection, selectedMolId reverts to null and isSettingMoleculeRef.current is false"
    - "isLoading is reset to false in both success and failure paths"
    - "Unknown id returns early without calling setMolecule"
  artifacts:
    - path: "src/data/molecules.ts"
      provides: "MoleculePreset with smiles:string; every entry has hardcoded isomeric SMILES"
      contains: "smiles: string"
    - path: "src/lib/handleMolSelectLogic.ts"
      provides: "fetch-free preset loader calling setMolecule(mol.smiles)"
    - path: "src/__tests__/handleMolSelect.test.ts"
      provides: "tests asserting setMolecule(smiles), no fetch, error-path via setMolecule rejection"
    - path: "src/__tests__/PresetMolecules.test.tsx"
      provides: "tests asserting smiles fields instead of cid"
  key_links:
    - from: "src/lib/handleMolSelectLogic.ts"
      to: "ketcher.setMolecule"
      via: "direct call with mol.smiles"
      pattern: "setMolecule\\(mol\\.smiles\\)"
    - from: "src/lib/handleMolSelectLogic.ts"
      to: "PubChem"
      via: "MUST NOT exist"
      pattern: "pubchem"
---

<objective>
Replace presets' PubChem `cid` with a hardcoded isomeric `smiles` string and load it directly via `ketcher.setMolecule(smiles)`, removing the runtime PubChem SDF fetch entirely.

Purpose: presets must load offline with zero network dependency. SMILES carry no coordinates; Ketcher standalone generates layout on setMolecule — expected and correct.
Output: updated data file, fetch-free loader, and reworked tests (TDD: tests RED first).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

Project skill: superpowers TDD — write/rework the failing tests first (RED), then implement (GREEN).
Memory: never reconstruct InChI from parsed layers — but this task does NOT touch InChI parsing/hover code; leave it alone.

Locked SMILES map (id → isomeric SMILES) — use EXACTLY these values:
methane: C
ethanol: CCO
benzene: C1=CC=CC=C1
acetic: CC(=O)O
alanine: C[C@@H](C(=O)O)N
vanillin: COC1=C(C=CC(=C1)C=O)O
caffeine: CN1C=NC2=C1C(=O)N(C(=O)N2C)C
nicotine: CN1CCC[C@H]1C2=CN=CC=C2
melatonin: CC(=O)NCCC1=CNC2=C1C=C(C=C2)OC
naloxone: C=CCN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)O)O4)O
aspirin: CC(=O)OC1=CC=CC=C1C(=O)O
ibuprofen: CC(C)CC1=CC=C(C=C1)C(C)C(=O)O
acetaminophen: CC(=O)NC1=CC=C(C=C1)O
morphine: CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O
metformin: CN(C)C(=N)N=C(N)N
atorvastatin: CC(C)C1=C(C(=C(N1CC[C@H](C[C@H](CC(=O)O)O)O)C2=CC=C(C=C2)F)C3=CC=CC=C3)C(=O)NC4=CC=CC=C4
warfarin: CC(=O)CC(C1=CC=CC=C1)C2=C(C3=CC=CC=C3OC2=O)O
propranolol: CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O
amoxicillin: CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)[C@@H](C3=CC=C(C=C3)O)N)C(=O)O)C
penicillinG: CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)CC3=CC=CC=C3)C(=O)O)C
ciprofloxacin: C1CC1N2C=C(C(=O)C3=CC(=C(C=C32)N4CCNCC4)F)C(=O)O
oseltamivir: CCC(CC)O[C@@H]1C=C(C[C@@H]([C@H]1NC(=O)C)N)C(=O)OCC
fluoxetine: CNCCC(C1=CC=CC=C1)OC2=CC=C(C=C2)C(F)(F)F
diazepam: CN1C(=O)CN=C(C2=C1C=CC(=C2)Cl)C3=CC=CC=C3
dopamine: C1=CC(=C(C=C1CCN)O)O
serotonin: C1=CC2=C(C=C1O)C(=CN2)CCN
epinephrine: CNC[C@@H](C1=CC(=C(C=C1)O)O)O
sildenafil: CCCC1=NN(C2=C1N=C(NC2=O)C3=C(C=CC(=C3)S(=O)(=O)N4CCN(CC4)C)OCC)C
methotrexate: CN(CC1=CN=C2C(=N1)C(=NC(=N2)N)N)C3=CC=C(C=C3)C(=O)N[C@@H](CCC(=O)O)C(=O)O
dexamethasone: C[C@@H]1C[C@H]2[C@@H]3CCC4=CC(=O)C=C[C@@]4([C@]3([C@H](C[C@@]2([C@]1(C(=O)CO)O)C)O)F)C
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Rework tests to RED (smiles + fetch-free loader)</name>
  <files>src/__tests__/handleMolSelect.test.ts, src/__tests__/PresetMolecules.test.tsx</files>
  <behavior>
    handleMolSelect.test.ts:
    - Remove the `fetch` mock/spy and the PubChem-URL assertion test entirely. Remove MOCK_SDF.
    - Success: assert `mockSetMolecule` was called with `BENZENE.smiles` (the preset's smiles value).
    - Success: isLoading first call true, last call false (unchanged behavior, no fetch).
    - Failure path triggered by `setMolecule` rejecting: make a test where `mockSetMolecule` is `vi.fn().mockRejectedValueOnce(new Error('layout failed'))`; assert last `setSelectedMolId` call is null AND `mockIsSettingMoleculeRef.current === false` after; assert last `setIsLoading` call is false.
    - Keep "returns early on unknown id" — assert `mockSetMolecule` NOT called (replace the old fetch-not-called assertion).
    PresetMolecules.test.tsx:
    - "every entry has id, name, formula, smiles fields": replace cid checks with `typeof mol.smiles === 'string'` and `mol.smiles.length > 0`.
    - "MoleculePreset type has correct shape": keys test expects `smiles` (not `cid`).
    - Replace the CID-value test with a smiles-equality test for methane='C', benzene='C1=CC=CC=C1', alanine='C[C@@H](C(=O)O)N', nicotine='CN1CCC[C@H]1C2=CN=CC=C2', naloxone='C=CCN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)O)O4)O'.
    - Leave the "canvas overlay derivation" describe block untouched.
  </behavior>
  <action>Rewrite both test files per the behavior block above. Use the locked SMILES values from `<context>` verbatim. Do not change the loader/data files yet — tests must reference `mol.smiles` and `setMolecule(smiles)` so they fail RED against the current `cid`-based code.</action>
  <verify>
    <automated>npx vitest run src/__tests__/handleMolSelect.test.ts src/__tests__/PresetMolecules.test.tsx 2>&1 | grep -qE 'fail|FAIL' && echo RED-CONFIRMED</automated>
  </verify>
  <done>Both test files reference `smiles`/`setMolecule(smiles)`, no fetch mocks remain, and they fail against current implementation (RED).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement smiles data + fetch-free loader (GREEN)</name>
  <files>src/data/molecules.ts, src/lib/handleMolSelectLogic.ts</files>
  <behavior>
    - molecules.ts: MoleculePreset replaces `cid: number` with `smiles: string`; every entry's `cid: N` becomes `smiles: '<value>'` from the locked map; order/ids/name/formula and section comments unchanged; header doc comment updated to say structures are embedded isomeric SMILES (sourced once from PubChem PUG REST on 2026-06-10), loaded directly via setMolecule — no runtime fetch.
    - handleMolSelectLogic.ts: no fetch, no PubChem URL; try block calls `await ketcherRef.current.setMolecule(mol.smiles)`; all guard/state semantics preserved (early return on !mol||!ketcherRef.current; setIsLoading(true), setSelectedMolId(id), isSettingMoleculeRef.current=true before; catch → console.error, setSelectedMolId(null), isSettingMoleculeRef.current=false; finally → setIsLoading(false)); doc comment says it loads embedded SMILES not a fetched SDF.
  </behavior>
  <action>In molecules.ts replace the interface field and every entry's `cid: N` with `smiles: '<value>'` using the EXACT SMILES from `<context>` (single-quote strings; SMILES contain no single quotes). Update the header doc comment. In handleMolSelectLogic.ts delete the `fetch(...)`, the `res.ok` check, and `res.text()`; replace with `await ketcherRef.current.setMolecule(mol.smiles)`. Keep all surrounding state/guard lines exactly. Update the function doc comment to describe embedded-SMILES loading. Do NOT reintroduce any fetch to PubChem.</action>
  <verify>
    <automated>npx tsc -b && npx vitest run 2>&1 | tail -5</automated>
  </verify>
  <done>`npx tsc -b` clean; full `npx vitest run` passes (208 baseline, count may shift slightly from removed/added tests but all green); no `pubchem`/`fetch(` reference remains in handleMolSelectLogic.ts.</done>
</task>

</tasks>

<verification>
- `grep -ic pubchem src/lib/handleMolSelectLogic.ts` returns 0
- `grep -c 'cid' src/data/molecules.ts` returns 0 (no stray cid fields)
- `npx tsc -b` clean
- `npx vitest run` all green
</verification>

<success_criteria>
Presets carry isomeric SMILES and load via setMolecule with no network call; loader keeps all original state/guard semantics; tests assert smiles and the setMolecule-rejection error path; type-check and full suite pass.
</success_criteria>

<output>
Create `.planning/quick/260610-jyj-replace-preset-cid-with-hardcoded-smiles/260610-jyj-SUMMARY.md` when done.
</output>
