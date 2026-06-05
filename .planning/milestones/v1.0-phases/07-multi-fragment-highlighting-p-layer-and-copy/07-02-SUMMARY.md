---
phase: "07"
plan: "02"
subsystem: "highlight-engine, ui-components"
tags: ["p-layer", "highlighting", "copy-to-clipboard", "InchiSection", "TDD-green"]
dependency_graph:
  requires:
    - "07-00"  # RED tests established for INCHI-07 and PLSH-04
  provides:
    - "p-layer protonation site highlights"
    - "copy-to-clipboard button"
  affects:
    - "src/lib/highlightUtils.ts"
    - "src/hooks/useKetcherHighlights.ts"
    - "src/components/InchiSection.tsx"
    - "src/components/InchiSection.module.css"
tech_stack:
  added: []
  patterns:
    - "case 'p' in buildHighlightSpecs switch — heteroatom filter via atomElements"
    - "useState(false) + setTimeout(1500ms) for clipboard feedback"
    - "try/catch silent failure for navigator.clipboard.writeText"
key_files:
  created: []
  modified:
    - "src/lib/highlightUtils.ts"
    - "src/hooks/useKetcherHighlights.ts"
    - "src/components/InchiSection.tsx"
    - "src/components/InchiSection.module.css"
decisions:
  - "p-layer highlights all heteroatom (non-C, non-H) atoms using --c-proton color; pure-carbon returns [] silently"
  - "copy button uses conditional JSX (not CSS display:none) so it is absent from DOM when canvas is empty"
  - "inline SVG clipboard icon with currentColor for stroke/fill — no external icon library"
  - "try/catch silent failure on clipboard.writeText per threat model (T-07-03 accept)"
  - "setTimeout leak (T-07-05) accepted for this tool — 1.5s max, low risk single-page tool"
metrics:
  duration: "7min"
  completed: "2026-06-01"
  tasks_completed: 2
  files_modified: 4
---

# Phase 7 Plan 02: p-Layer Highlight and Copy-to-Clipboard Summary

p-layer protonation site highlighting and one-click copy-to-clipboard button implemented; all INCHI-07 and PLSH-04 RED tests turned GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add p-layer case to buildHighlightSpecs | cc00935 | src/lib/highlightUtils.ts, src/hooks/useKetcherHighlights.ts |
| 2 | Add copy-to-clipboard button to InchiSection | 3a8a53b | src/components/InchiSection.tsx, src/components/InchiSection.module.css |

## What Was Built

### Task 1: p-Layer Protonation Site Highlighting

**highlightUtils.ts:**
- Removed `'p'` from the NON-SPATIAL guard array (`['version', 'q', 'i', 'b']` — was `['version', 'q', 'p', 'i', 'b']`)
- Added `case 'p':` block in the switch statement (before `case 'm'`): iterates `atomElements` entries, filters for `el !== 'C' && el !== 'H'`, maps canonical indices through `auxMap`, returns `[]` if no heteroatoms, otherwise returns one `HighlightSpec` with `color: resolveVarFn('--c-proton')`

**useKetcherHighlights.ts:**
- Removed `'p'` from the early-return guard (`['version', 'q', 'i']` — was `['version', 'q', 'p', 'i']`) so `buildHighlightSpecs` is called on p-layer hover events

The existing test `'p layer: returns empty array []'` continues to pass unchanged because the fixture uses all-carbon `atomElements` which produces no heteroatoms.

### Task 2: Copy-to-Clipboard Button

**InchiSection.tsx:**
- Added `useState` to React import
- Added `const [copied, setCopied] = useState(false)`
- Added `async handleCopy()` with `try/catch`: `await navigator.clipboard.writeText(inchi)` → `setCopied(true)` → `setTimeout(() => setCopied(false), 1500)`
- Copy button rendered only in non-empty branch (conditional JSX): `<button className={styles.copyBtn} aria-label="Copy InChI to clipboard">` with inline SVG clipboard icon using `currentColor`
- `{copied && <span className={styles.copiedFeedback}>Copied!</span>}` after the button

**InchiSection.module.css:**
- Added `position: relative` and `padding-right: 40px` to `.inchiDisplay`
- Added `.copyBtn`: absolute right:10px top:50% transform, background:none border:none, cursor:pointer, color:var(--ink-faint), 160ms transition, line-height:0
- Added `.copyBtn:hover`: color:var(--c-formula)
- Added `.copyBtn svg`: width:16px height:16px display:block
- Added `.copiedFeedback`: absolute right:36px top:50% transform, font-mono 11px, color:var(--c-formula), white-space:nowrap, pointer-events:none

## Verification

All tests in scope pass:

- `highlightUtils.test.ts`: 36/36 pass — INCHI-07 Test A (N heteroatom → --c-proton), Test B (all-C → []), existing p-layer no-op test still passes
- `InchiSection.test.tsx`: 10/10 pass — PLSH-04 Test C (button present when non-empty), Test D (button absent when empty), Test E (clipboard called with verbatim inchi), Test F (Copied! appears), Test G (Copied! gone after 1500ms)
- `npx tsc --noEmit`: 0 errors

Pre-existing failures in `parseInchi.test.ts` and `parseAuxMapping.test.ts` (5 INCHI-06 tests) are out of scope for this plan — they are implemented by plan 07-01 in a parallel worktree.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- src/lib/highlightUtils.ts: FOUND (modified, case 'p' present)
- src/hooks/useKetcherHighlights.ts: FOUND (modified, 'p' removed from guard)
- src/components/InchiSection.tsx: FOUND (modified, copy button present)
- src/components/InchiSection.module.css: FOUND (modified, .copyBtn present)
- Commit cc00935: FOUND
- Commit 3a8a53b: FOUND
