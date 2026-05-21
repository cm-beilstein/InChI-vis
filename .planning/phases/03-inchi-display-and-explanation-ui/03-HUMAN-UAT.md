---
status: complete
phase: 03-inchi-display-and-explanation-ui
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md]
started: 2026-05-21T09:25:00Z
updated: 2026-05-21T10:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. IBM Plex Font Load + Visual Design Fidelity
expected: In browser DevTools → Network tab (with cache disabled), IBM Plex Sans, Mono, and Serif font files load successfully (no 404s). InChI strip renders in IBM Plex Mono at 19px; card title in IBM Plex Serif at 26px; prose in IBM Plex Sans at 14.5px. Hover transitions at ~160ms match design handoff.
result: pass

### 2. Color-Coded InChI Strip Renders
expected: Draw any molecule in the Ketcher canvas (e.g. benzene). Below the canvas an InChI strip appears. The formula layer (e.g. "C6H6") and any other layers (connectivity "c", hydrogen "h", etc.) each appear as distinctly colored chips or spans — each layer has its own accent color matching the design handoff.
result: pass

### 3. Layer Hover — Highlight and Clear
expected: Hover over one of the layer chips in the InChI strip. It highlights with an accent-color background (~160ms smooth transition). Move the cursor off the chip — the highlight clears and the strip returns to its default appearance.
result: pass

### 4. Sub-token Hover
expected: In the formula layer, hover over an individual element symbol (e.g. "C" in "C6H6"). A tighter sub-token highlight appears on just that token (different from the full-layer highlight). Move off and the sub-highlight clears. Try the same in the connection layer on an atom number, or in a stereo layer on a parity sign.
result: pass

### 5. Explanation Card — Idle State
expected: With no layer hovered, the explanation card on the left shows a generic idle message — title "Hover any layer" (or similar invitation text) and a neutral subtitle. The card's left border accent strip is visible in a faint/neutral color.
result: pass

### 6. Explanation Card — Active State
expected: Hover over a layer chip in the InChI strip. The explanation card immediately updates to show the layer-specific title and description/prose. The left border accent strip changes to the layer's accent color. Different layers show different explanations.
result: pass

### 7. Legend — All Layers with Correct Swatches
expected: A legend panel lists all 11 InChI layer types. Each row shows a color swatch and the layer name. Layers present in the drawn molecule appear fully colored; layers absent from the current InChI appear visually muted (lower opacity or greyed out).
result: pass

### 8. Legend Tooltip
expected: Hover over a legend row. A tooltip slides in from the right with a smooth CSS transition (~160ms). The tooltip shows a short description of that InChI layer. Moving the cursor off hides the tooltip.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

