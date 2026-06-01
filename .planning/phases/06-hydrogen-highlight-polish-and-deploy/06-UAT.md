---
status: complete
phase: 06-hydrogen-highlight-polish-and-deploy
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
started: 2026-06-01T07:46:00.000Z
updated: 2026-06-01T07:46:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Empty state placeholder
expected: Open the app with an empty canvas (no molecule drawn). The InChI section below the editor shows a dimmed box with the text "Draw a molecule above to see its InChI." The box is visible but greyed out — it does NOT disappear.
result: pass

### 2. No layout shift on first draw
expected: With the empty state showing, draw a molecule (e.g., benzene). The InChI section smoothly fills in with the InChI string — the page does NOT jump or reflow because the box was already occupying its layout slot.
result: issue
reported: "when I draw molecule the inchi string box gets smaller"
severity: major

### 3. Explicit H hover — H atoms highlight
expected: Draw a molecule with explicit hydrogen atoms (e.g., draw CH4 or add explicit H to any atom via Ketcher's right-click > Add H). Then hover the "H..." sub-token in the formula layer of the InChI display. The explicit H atoms should glow/halo in the Ketcher canvas with the H element color (same highlight style as other element hovers).
result: issue
reported: "yes it works, however, C and H have the same color. they need to have different colors"
severity: major

### 4. No explicit H — hovering H is a silent no-op
expected: Draw a molecule with only implicit H (e.g., benzene C6H6 — Ketcher draws H implicitly). Hover the "H6" sub-token in the formula layer. Nothing should crash or show phantom highlights. The app stays responsive.
result: pass

### 5. Formula layer hover includes explicit H
expected: With explicit H atoms drawn, hover the entire formula layer chunk (not a sub-token — hover the formula layer span itself). The formula layer hover should highlight ALL atoms including the explicit H atoms (they glow alongside the carbon/other atoms).
result: pass

### 6. GitHub Actions deploy workflow present
expected: The file .github/workflows/deploy.yml exists in the repository root. (Can verify with `ls .github/workflows/` or check via file browser.)
result: pass

## Summary

total: 6
passed: 4
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Drawing a molecule does not shrink the InChI display box — the box maintains consistent height in both empty and filled states"
  status: failed
  reason: "User reported: when I draw molecule the inchi string box gets smaller"
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "Hovering the H sub-token highlights explicit H atoms in a colour visually distinct from C atoms (--c-el-H ≠ --c-el-C)"
  status: failed
  reason: "User reported: yes it works, however, C and H have the same color. they need to have different colors"
  severity: major
  test: 3
  artifacts: []
  missing: []
