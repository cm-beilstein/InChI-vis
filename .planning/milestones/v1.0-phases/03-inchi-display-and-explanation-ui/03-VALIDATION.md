---
phase: 3
slug: inchi-display-and-explanation-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | INCHI-02 | — | N/A | unit | `npx vitest run src/lib/parseAuxMapping` | ✅ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | INCHI-02 | — | N/A | unit | `npx vitest run src/lib/layerInfo` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | INCHI-02, EXPL-01 | — | N/A | manual | Visual: layer strip renders with accent colors | — | ⬜ pending |
| 3-02-02 | 02 | 1 | EXPL-01, EXPL-03 | — | N/A | manual | Visual: hover dims non-active layers; idle shows DEFAULT_INFO | — | ⬜ pending |
| 3-03-01 | 03 | 1 | EXPL-02 | — | N/A | manual | Visual: legend card shows 11 rows with swatches + tooltip on hover | — | ⬜ pending |
| 3-03-02 | 03 | 1 | PLSH-03 | — | N/A | manual | Typography IBM Plex loads; transitions 160ms; no residual hover | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/layerInfo.test.ts` — stubs for LAYER_INFO coverage, readingFor() return types, swatchVar() mapping
- [ ] `src/lib/parseAuxMapping.test.ts` — extend existing test to cover `atomElements` extraction from `rA:` field (including multi-char elements: Cl, Br, I)
- [ ] Fixture: chlorobenzene real `getInchi(true)` output added to test fixtures for multi-char element empirical verification

*Wave 0 installs nothing — vitest infrastructure exists from Phase 2.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Layer strip renders accent colors correctly | INCHI-02, PLSH-03 | CSS custom property rendering requires browser | Draw benzene; confirm each layer chunk shows design-token color |
| Hover dims non-active layers with 160ms transition | EXPL-01, PLSH-03 | CSS transitions require browser | Hover formula layer; confirm c-layer dims; check DevTools 160ms |
| Explanation card updates on hover | EXPL-01 | React re-render requires browser | Hover each layer; confirm card prose + reading-code updates |
| Idle state shows DEFAULT_INFO | EXPL-03 | State management requires browser | Move cursor off all layers; confirm card resets to "Hover any layer" |
| Legend shows 11 rows with color swatches | EXPL-02 | DOM structure requires browser | Check legend renders 11 rows; each has a swatch in correct color |
| Legend tooltip slides in on row hover | EXPL-02 | CSS :hover + transform requires browser | Hover legend row; confirm tooltip appears with 4px slide |
| Sub-token spans present and wired | INCHI-02 | React event wiring requires browser | Inspect DOM; confirm formula sub-spans have onMouseEnter/Leave |
| IBM Plex font loads correctly | PLSH-03 | Font loading requires browser | DevTools Network: confirm IBM Plex fonts loaded; text renders in Plex |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
