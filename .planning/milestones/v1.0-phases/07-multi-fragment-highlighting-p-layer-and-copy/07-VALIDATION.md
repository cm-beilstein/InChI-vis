---
phase: "07"
slug: multi-fragment-highlighting-p-layer-and-copy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 07-00-01 | 00 | 0 | INCHI-06 | N/A | unit (RED) | `npm test -- --run src/lib/__tests__/parseAuxMapping.test.ts src/lib/__tests__/parseInchi.test.ts` | ✅ existing files | ⬜ pending |
| 07-00-02 | 00 | 0 | INCHI-07, PLSH-04 | Clipboard write uses verbatim string | unit (RED) | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts src/__tests__/InchiSection.test.tsx` | ✅ existing files | ⬜ pending |
| 07-01-01 | 01 | 1 | INCHI-06 | N/A | unit (GREEN) | `npm test -- --run src/lib/__tests__/parseAuxMapping.test.ts` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | INCHI-06 | N/A | unit (GREEN) | `npm test -- --run src/lib/__tests__/parseInchi.test.ts src/lib/__tests__/highlightUtils.test.ts` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | INCHI-07 | N/A | unit (GREEN) | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 1 | PLSH-04 | Clipboard write uses verbatim string only | unit (GREEN) | `npm test -- --run src/__tests__/InchiSection.test.tsx && npm test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/parseAuxMapping.test.ts` — multi-fragment N: fixture + offset tests (RED)
- [ ] `src/lib/__tests__/parseInchi.test.ts` — multi-fragment enrichLayers c/h offset tests (RED)
- [ ] `src/lib/__tests__/highlightUtils.test.ts` — p-layer heteroatom highlight test (RED)
- [ ] `src/__tests__/InchiSection.test.tsx` — copy button render, click, feedback, hidden-when-empty tests (RED)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hovering C7 layer on toluene+benzene highlights correct 7 atoms | INCHI-06 | Requires live Ketcher canvas | Draw `InChI=1S/C7H8.C6H6/...`, hover formula layer, verify toluene atoms highlight |
| Hovering p+1 on C17H14N2 highlights N atoms | INCHI-07 | Requires live Ketcher canvas | Load indolizinium InChI, hover p-layer, verify N canonical indices 18 and 19 light up |
| Copy button copies verbatim string to OS clipboard | PLSH-04 | Requires real browser clipboard | Click copy icon, paste into text editor, verify exact match with displayed InChI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
