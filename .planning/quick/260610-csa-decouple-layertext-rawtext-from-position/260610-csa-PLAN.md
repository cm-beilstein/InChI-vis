---
phase: quick-260610-csa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/components/InchiSection.tsx]
autonomous: true
requirements: [QUICK-260610-csa]

must_haves:
  truths:
    - "Each rendered LayerText displays the verbatim segment content for its own layer, with no positional misalignment when empty segments are skipped during parsing"
    - "The copy button still copies the full verbatim InChI string from the original Ketcher output"
  artifacts:
    - path: "src/components/InchiSection.tsx"
      provides: "LayerText rawText sourced from l.text (per-layer verbatim), rawParts removed"
      contains: "rawText={l.text}"
  key_links:
    - from: "src/components/InchiSection.tsx (layers.map)"
      to: "LayerText rawText prop"
      via: "l.text per-layer verbatim segment (prefix already stripped by parseInchi)"
      pattern: "rawText=\\{l\\.text\\}"
    - from: "src/components/InchiSection.tsx (handleCopy)"
      to: "navigator.clipboard"
      via: "writeText(inchi) — unchanged, full verbatim string"
      pattern: "writeText\\(inchi\\)"
---

<objective>
Decouple `LayerText` `rawText` from the positional `rawParts` index in `InchiSection.tsx`.

Purpose: `parseInchi` skips empty segments (`if (!p) continue`), so `rawParts[i]` (a positional split of the raw InChI body) can misalign with `layers[i]`, rendering the wrong verbatim text for a layer. `parseInchi` already stores each layer's verbatim per-segment content (prefix stripped) directly in `layer.text` — using it eliminates the misalignment.

Output: A single-line change in the `LayerText` invocation plus removal of the now-unused `rawParts` computation, with `tsc` and the full vitest suite staying green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

@src/components/InchiSection.tsx
@src/lib/parseInchi.ts

<interfaces>
<!-- Verified from codebase. Executor needs no further exploration. -->

From src/lib/parseInchi.ts — Layer.text is verbatim per-segment content with prefix stripped:
  version → text = parts[0]
  formula → text = parts[1]
  others  → text = parts[i].slice(1)   (prefix char already removed)
enrichLayers never mutates `text`, so `layer.text` is identical to the aligned
`rawParts[i].slice(l.prefix.length)` and is correct even when segments misalign.

From src/components/LayerText.tsx:
  export function LayerText({ layer, rawText, fragCounts = [] }:
    { layer: Layer; rawText: string; fragCounts?: number[] })
  // Contract: rawText must be the verbatim slice (layer.prefix stripped). l.text satisfies this.

Current line 84 (to change):
  <LayerText layer={l} rawText={(rawParts[i] ?? l.prefix + l.text).slice(l.prefix.length)} fragCounts={fragCounts} />
Current line 30 (to remove):
  const rawParts = inchi ? inchi.slice('InChI='.length).split('/') : [];
Note: `inchi` is still referenced by handleCopy (writeText(inchi)) — no unused-variable error after removing rawParts.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Source LayerText rawText from l.text and remove rawParts</name>
  <files>src/components/InchiSection.tsx</files>
  <action>
Make two edits in src/components/InchiSection.tsx:

1. In the `layers.map` render, change the `LayerText` invocation so `rawText` is sourced directly from the per-layer verbatim text: set `rawText={l.text}`. This reads one untouched segment (prefix already stripped by parseInchi), eliminating the positional `rawParts[i]` misalignment that occurs because parseInchi skips empty segments.

2. Remove the now-unused `rawParts` computation line (`const rawParts = inchi ? inchi.slice('InChI='.length).split('/') : [];`) and its preceding comment line ("Verbatim segments from the raw Ketcher string — never reconstruct from layer.text.").

Do NOT touch `handleCopy` — it must keep calling `navigator.clipboard.writeText(inchi)` with the full verbatim InChI string. Only the per-layer LayerText display sourcing changes.

This honors the no-reconstruction rule (CLAUDE.md / project memory): using a single layer's untouched `.text` is NOT re-joining parsed layer.text fields. The forbidden action is concatenating layers to rebuild the full InChI string; the copy button still uses the verbatim `inchi`, so no reconstruction occurs. This matches how layerInfo.ts and highlightUtils.ts already read per-segment text.
  </action>
  <verify>
    <automated>cd /home/bsmue/code/explain-that-inchi && npx tsc -b && npx vitest run</automated>
  </verify>
  <done>
`npx tsc -b` is clean (no unused-variable or other errors). `npx vitest run` passes the full suite (168 tests), including src/__tests__/InchiSection.test.tsx and its copy-button test (Test E asserts writeText called with the verbatim string). InchiSection.tsx contains `rawText={l.text}` and no longer references `rawParts`.
  </done>
</task>

</tasks>

<verification>
- `npx tsc -b` exits 0 with no diagnostics.
- `npx vitest run` reports all tests passing (≥168).
- `grep -n "rawParts" src/components/InchiSection.tsx` returns nothing.
- `grep -n "rawText={l.text}" src/components/InchiSection.tsx` returns the LayerText line.
- `grep -n "writeText(inchi)" src/components/InchiSection.tsx` still present (copy button unchanged).
</verification>

<success_criteria>
- LayerText rawText is sourced from `l.text` (per-layer verbatim), removing positional coupling to `rawParts`.
- `rawParts` computation removed; no unused-variable TS error (`inchi` still used by handleCopy).
- Copy button behavior unchanged — full verbatim InChI copied.
- tsc clean; full vitest suite green.
</success_criteria>

<output>
Create `.planning/quick/260610-csa-decouple-layertext-rawtext-from-position/260610-csa-SUMMARY.md` when done
</output>
