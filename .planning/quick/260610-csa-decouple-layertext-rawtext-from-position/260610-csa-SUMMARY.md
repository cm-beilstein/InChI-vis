---
phase: quick-260610-csa
plan: 01
subsystem: inchi-display
tags: [bugfix, react, parsing]
requires: [parseInchi.Layer.text]
provides: [per-layer-verbatim-rawtext]
affects: [src/components/InchiSection.tsx]
tech-stack:
  added: []
  patterns: ["per-layer verbatim text sourced directly from layer.text (no positional split)"]
key-files:
  created: []
  modified: [src/components/InchiSection.tsx]
decisions:
  - "Source LayerText rawText from l.text instead of positional rawParts[i] split"
metrics:
  duration: ~3 min
  completed: 2026-06-10
  tasks: 1
  files: 1
---

# Quick 260610-csa: Decouple LayerText rawText from positional rawParts Summary

Sourced `LayerText`'s `rawText` directly from each layer's own verbatim `l.text` (prefix already stripped by `parseInchi`), removing the positional `rawParts[i]` split that could misalign with `layers[i]` because `parseInchi` skips empty segments.

## What Changed

In `src/components/InchiSection.tsx`:

1. **LayerText invocation** — changed `rawText={(rawParts[i] ?? l.prefix + l.text).slice(l.prefix.length)}` to `rawText={l.text}`. Each rendered layer now displays its own untouched verbatim segment, eliminating positional misalignment.
2. **Removed `rawParts` computation** — deleted `const rawParts = inchi ? inchi.slice('InChI='.length).split('/') : [];` and its preceding comment. `inchi` is still used by `handleCopy`, so no unused-variable error.

`handleCopy` is unchanged — it still calls `navigator.clipboard.writeText(inchi)` with the full verbatim InChI string.

## No-Reconstruction Compliance

This honors the project's no-reconstruction rule (CLAUDE.md / project memory). Reading a single layer's untouched `.text` is NOT re-joining parsed `layer.text` fields — the forbidden action is concatenating layers to rebuild the full InChI string. The copy button still emits the verbatim `inchi`, so no reconstruction occurs. This matches how `layerInfo.ts` and `highlightUtils.ts` already read per-segment text.

## Verification

- `npx tsc -b` — exits 0, no diagnostics (no unused-variable error after `rawParts` removal). **CLEAN**
- `npx vitest run` — **174 tests passed (11 files)**, including `src/__tests__/InchiSection.test.tsx` (10 tests) and its copy-button test asserting `writeText` is called with the verbatim string. The stderr lines observed are expected `console.error` output from the failure-path tests in `handleMolSelect.test.ts`, which themselves pass.
- `grep -n "rawParts" src/components/InchiSection.tsx` — returns nothing.
- `grep -n "rawText={l.text}" src/components/InchiSection.tsx` — returns the LayerText line (81).
- `grep -n "writeText(inchi)" src/components/InchiSection.tsx` — still present (line 33).

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/components/InchiSection.tsx (modified, `rawText={l.text}`, no `rawParts`)
- FOUND: commit 4736a28
