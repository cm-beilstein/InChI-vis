---
phase: 4
slug: hover-to-highlight-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | INCHI-03 | — | N/A | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | INCHI-04 | — | N/A | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 0 | INCHI-03 | — | N/A | unit | `npx vitest run src/hooks/__tests__/useKetcherHighlights.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | INCHI-03 | — | N/A | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | INCHI-04 | — | N/A | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | INCHI-03, INCHI-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/highlightUtils.test.ts` — stubs for INCHI-03, INCHI-04 (buildHighlightSpecs all layer types + sub-hover kinds)
- [ ] `src/hooks/__tests__/useKetcherHighlights.test.ts` — hook lifecycle stubs (clear on leave, isReady guard)
- [ ] `src/lib/highlightUtils.ts` — extract pure highlight functions so they are testable in Node (no browser globals required for logic)

*Existing infrastructure: `vitest.config.ts` present, `environment: 'node'` configured, existing test files prove the pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Single-frame flicker on rapid hover switching is visually acceptable | INCHI-03 | Ketcher canvas render timing cannot be unit-tested in Node | Load dev server, hover rapidly across all layers in a multi-atom molecule, observe no stale accumulation (success criterion 4) |
| CSS color tokens resolve correctly (oklch strings passed to Ketcher render correctly) | INCHI-03 | Requires browser CSS cascade + Ketcher SVG/canvas renderer | Load dev server, hover formula layer, inspect canvas element halos for correct accent color |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
