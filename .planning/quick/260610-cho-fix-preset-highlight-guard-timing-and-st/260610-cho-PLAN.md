---
phase: quick-260610-cho
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/handleMolSelectLogic.ts
  - src/App.tsx
autonomous: true
requirements: [BUG-1-preset-guard-debounce, BUG-2-catch-staleness-guard]
must_haves:
  truths:
    - "Loading a preset leaves the preset button highlighted (selectedMolId stays set across the 150ms debounce)"
    - "Drawing freely after load still resets selectedMolId to null"
    - "A stale (older-generation) getInchi() rejection in the catch block does not blank the store while a newer draw is in flight"
    - "tsc -b stays clean and the existing vitest suite passes"
  artifacts:
    - path: "src/App.tsx"
      provides: "Debounced handleChange that clears isSettingMoleculeRef after reading it, and a staleness-guarded catch block"
      contains: "thisGen !== generationRef.current"
    - path: "src/lib/handleMolSelectLogic.ts"
      provides: "Preset loader that sets isSettingMoleculeRef true but no longer clears it in finally"
  key_links:
    - from: "src/lib/handleMolSelectLogic.ts"
      to: "src/App.tsx debounced handleChange"
      via: "isSettingMoleculeRef ownership transfer (set in logic, cleared in debounce callback)"
      pattern: "isSettingMoleculeRef"
---

<objective>
Fix two timing bugs in the InChI live-update loop in src/App.tsx.

Purpose: The preset-highlight guard (`isSettingMoleculeRef`) is defeated by the 150ms debounce so loading a preset immediately clears its own highlight; and the catch block in handleChange can blank the store with a stale async result. Both are timing/ordering bugs with well-understood fixes.

Output: Modified src/App.tsx and src/lib/handleMolSelectLogic.ts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@src/App.tsx
@src/lib/handleMolSelectLogic.ts
@src/__tests__/handleMolSelect.test.ts

<notes>
- CLAUDE.md rule: never reconstruct InChI strings; display verbatim Ketcher output. These fixes touch neither — they only adjust ref lifetime and add a guard. Do not alter the getInchi/parseInchiWithAux/setInchiData data path.
- The test file src/__tests__/handleMolSelect.test.ts asserts isLoading and selectedMolId call sequences only. It does NOT assert isSettingMoleculeRef. Removing the ref-clear from handleMolSelectLogic's finally will not break these tests.
- Multiple `change` events may fire during one setMolecule load; the debounce coalesces them into a single callback ~150ms after the last event.
</notes>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move isSettingMoleculeRef clearing out of handleMolSelectLogic finally</name>
  <files>src/lib/handleMolSelectLogic.ts</files>
  <action>
    BUG 1 (part 1 of 2). In handleMolSelectLogic, transfer ownership of clearing
    isSettingMoleculeRef to the debounced handleChange callback (Task 2 clears it).

    - Keep `isSettingMoleculeRef.current = true;` where it is set (currently line ~35, before fetch).
    - In the `finally` block (line ~47-50), REMOVE the line `isSettingMoleculeRef.current = false;`.
      Leave `setIsLoading(false);` in finally untouched.
    - The error/catch path still calls `setSelectedMolId(null)` — that is unchanged.
      Note: when the error path runs, no setMolecule() happens, so no `change` event fires
      and the ref would never be cleared by the debounce. To avoid leaving the ref stuck true
      on a fetch failure, add `isSettingMoleculeRef.current = false;` inside the `catch` block
      (right alongside the existing setSelectedMolId(null)). This keeps the ref true ONLY for
      the success path where a change event is guaranteed to fire.
    - Update the JSDoc comment block: the bullet describing isSettingMoleculeRef should note
      that the ref is cleared by the debounced handleChange in App.tsx (not here) on the
      success path, and cleared locally on the error path.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx vitest run src/__tests__/handleMolSelect.test.ts</automated>
  </verify>
  <done>handleMolSelectLogic sets isSettingMoleculeRef true before fetch, clears it only in the catch block, no longer clears it in finally. handleMolSelect test file passes unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Clear guard inside debounced callback + add staleness guard to catch</name>
  <files>src/App.tsx</files>
  <action>
    Two changes inside the debounced setTimeout callback in handleChange (lines ~73-112).

    BUG 1 (part 2 of 2): The callback reads `if (!isSettingMoleculeRef.current) setSelectedMolId(null);`
    (line ~75). Because the ref is now held true through the debounce window (Task 1), this read
    correctly skips the reset for preset loads. Immediately AFTER reading the ref, clear it so a
    subsequent genuine free-draw resets selectedMolId. Replace the single read line with:
    read the current value into a local const (e.g. `const wasSettingMolecule = isSettingMoleculeRef.current;`),
    then `isSettingMoleculeRef.current = false;` to release the guard, then
    `if (!wasSettingMolecule) setSelectedMolId(null);`.
    Keep the existing isHighlightingRef guard at the top of handleChange and the generationRef
    increment logic exactly as they are. Do NOT remove the debounce. Do NOT call getInchi manually.

    BUG 2: The catch block (lines ~108-111) calls
    `useInchiStore.getState().setInchiData('', [], {}, {}, [])` without the staleness guard the
    success path uses at line ~81. Add the same guard: in the catch block, first check
    `if (thisGen !== generationRef.current) return;` and only call setInchiData('', [], {}, {}, [])
    when thisGen still matches the current generation. `thisGen` is already in scope (captured at
    line ~77 before the try). Preserve the existing catch comment about empty/disconnected canvas.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx tsc -b && npx vitest run</automated>
  </verify>
  <done>In handleChange's debounced callback: the guard value is read into a local, the ref is then cleared, and selectedMolId resets only when the change was a free-draw. The catch block returns early without touching the store when thisGen is stale. tsc -b is clean and the full vitest suite passes.</done>
</task>

</tasks>

<verification>
- `npx tsc -b` exits clean (no type errors).
- `npx vitest run` — full suite passes (handleMolSelect tests unchanged and green).
- Manual reasoning check (no browser required): on a preset success path the ref is true when the
  debounced callback reads it → selectedMolId NOT cleared → preset stays highlighted. On a free
  draw the ref is false → selectedMolId cleared. On a stale getInchi rejection the catch returns
  early → store not blanked.
</verification>

<success_criteria>
- BUG 1: After loading a preset, selectedMolId is not reset to null by the debounced change handler; the preset button retains its highlight.
- BUG 1: Free-drawing after a preset load clears selectedMolId (guard released after first read).
- BUG 1: Fetch failure path does not leave isSettingMoleculeRef stuck true.
- BUG 2: The catch block only blanks the store when thisGen === generationRef.current; stale generations return without side effects.
- tsc -b clean; full vitest suite passing; debounce, isHighlightingRef guard, and generation-counter logic all preserved.
</success_criteria>

<output>
Create `.planning/quick/260610-cho-fix-preset-highlight-guard-timing-and-st/260610-cho-SUMMARY.md` when done
</output>
