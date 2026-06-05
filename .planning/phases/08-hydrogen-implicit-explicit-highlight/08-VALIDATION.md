---
phase: 8
slug: hydrogen-implicit-explicit-highlight
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

Current baseline: 156 tests passing across 11 test files. Phase 8 must keep this baseline green.

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green (156 + new tests)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-??-01 | 01 | 0 | INCHI-08-a | — | N/A | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 08-??-02 | 01 | 0 | INCHI-08-b | — | N/A | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 08-??-03 | 01 | 0 | INCHI-08-c | — | N/A | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 08-??-04 | 01 | 0 | INCHI-08-d | — | N/A | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 08-??-05 | 01 | 1 | INCHI-08-e | — | N/A | unit (regression) | `npm test -- --reporter=verbose` | ✅ existing | ⬜ pending |
| 08-??-06 | 01 | 1 | INCHI-08-f | — | N/A | unit (regression) | `npm test -- --reporter=verbose` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useKetcherHighlights.test.ts` — add tests for `renderHBadges` (badge text content, `data-h-badge` attribute, position, mobile vs fixed-H text) and `cleanHBadges` (all `[data-h-badge]` removed)
- [ ] `src/lib/__tests__/highlightUtils.test.ts` — add tests for `case 'hAtoms'` with explicit H in `hAtomPoolIds` (bond lookup path returns H atom, heavy atom, and bond IDs)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Badge appears visually above atom in live Ketcher canvas | INCHI-08 | Raphaël SVG coordinate calculation requires visual inspection | Hover a fixed-H sub-token (e.g. `7H2`); confirm badge text appears above atom, not offset to side or below |
| Badge clears on hover-out | INCHI-08 | DOM lifecycle timing | Move mouse off sub-token span; confirm badge disappears immediately |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
