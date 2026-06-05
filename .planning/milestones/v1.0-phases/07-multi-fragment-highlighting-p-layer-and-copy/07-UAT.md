---
status: testing
phase: 07-multi-fragment-highlighting-p-layer-and-copy
source: 07-00-SUMMARY.md, 07-01-SUMMARY.md, 07-02-SUMMARY.md
started: 2026-06-01T00:00:00Z
updated: 2026-06-01T00:00:00Z
---

## Current Test

number: 2
name: Multi-Fragment — h-Layer Correct Atom Highlighting
expected: |
  With the same two-fragment molecule open, hover the h-layer. Hydrogen-bearing atoms highlight correctly in both fragments — fragment-2 atoms light up at the right positions (not shifted to fragment-1 atom indices).
awaiting: user response

## Tests

### 1. Multi-Fragment — No Spurious Cross-Fragment Bonds
expected: Draw two separate molecules (e.g. benzene + toluene). InChI formula layer shows a dot separator (e.g. C7H8.C6H6). Hover the c-layer — highlights stay within each fragment. No cross-fragment bond highlights connecting atoms from different molecules.
result: issue
reported: "no"
severity: major

### 2. Multi-Fragment — h-Layer Correct Atom Highlighting
expected: With the same two-fragment molecule open, hover the h-layer. Hydrogen-bearing atoms highlight correctly in both fragments — fragment-2 atoms light up at the right positions (not shifted to fragment-1 atom indices).
result: [pending]

### 3. p-Layer — Heteroatom Protonation Site Highlight
expected: Draw a molecule containing at least one nitrogen or oxygen atom (e.g. aniline, pyridine, or ethanol). Hover the p-layer in the InChI display. The heteroatom(s) (N, O, etc.) highlight on the canvas in the proton color (purple/violet). Carbon and hydrogen atoms do NOT highlight.
result: [pending]

### 4. p-Layer — Pure-Carbon Molecule Shows No Highlight
expected: Draw a pure hydrocarbon (e.g. benzene or hexane). If the InChI has a p-layer, hover it. No atoms highlight (empty highlight), since there are no heteroatoms. The canvas stays unchanged.
result: [pending]

### 5. Copy Button — Appears When InChI Is Displayed
expected: Draw any molecule so the InChI string appears below the canvas. A small clipboard icon button is visible on the right side of the InChI display bar.
result: [pending]

### 6. Copy Button — Absent When Canvas Is Empty
expected: Clear the canvas (no molecule drawn). The InChI display area is empty. No copy button is visible — the clipboard icon is completely absent from the page.
result: [pending]

### 7. Copy Button — Copies InChI to Clipboard
expected: With a molecule drawn, click the clipboard icon button. The browser clipboard now contains the full InChI string (verbatim — same as what's displayed). You can verify by pasting into a text editor.
result: [pending]

### 8. Copy Button — "Copied!" Feedback Appears Then Disappears
expected: Click the copy button. Immediately a small "Copied!" label appears near the button. After approximately 1.5 seconds, the "Copied!" label automatically disappears and the button returns to its normal state.
result: [pending]

## Summary

total: 8
passed: 0
issues: 1
pending: 7
skipped: 0
blocked: 0

## Gaps

- truth: "Hovering c-layer on a multi-fragment molecule highlights only within-fragment atoms/bonds — no cross-fragment bonds"
  status: failed
  reason: "User reported: no"
  severity: major
  test: 1
  artifacts: []
  missing: []
