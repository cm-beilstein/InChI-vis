---
status: partial
phase: 01-scaffold-and-ketcher-mount
source: [01-VERIFICATION.md]
started: 2026-05-19T00:00:00Z
updated: 2026-05-19T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dev server starts and editor is visible
expected: `npm run dev` starts on `http://localhost:5173/explain-that-inchi/`, layout renders, "Loading editor…" overlay is visible briefly then disappears after WASM init, Ketcher editor panel is visible and interactive
result: [pending]

### 2. getInchi() returns valid InChI
expected: Drawing a molecule (e.g. benzene) and calling `await ketcher.getInchi()` from the browser console (via DevTools or React DevTools to access the instance) returns a string beginning with `InChI=1S/`
result: [pending]

### 3. highlights.create() callable without error
expected: Calling `ketcher.editor.highlights.create({atoms:[0], bonds:[], rgroupAttachmentPoints:[], color:'oklch(0.55 0.14 155)'})` in DevTools does not throw, and the atom at index 0 changes color
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
