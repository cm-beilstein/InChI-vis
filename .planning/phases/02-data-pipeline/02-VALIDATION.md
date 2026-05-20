---
phase: 2
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (needs `environment: 'node'` fix — Wave 0) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| fix-vitest-config | 01 | 0 | INCHI-01 | — | N/A | infra | `npm test -- --run` | ❌ W0 | ⬜ pending |
| create-store | 01 | 1 | INCHI-01 | — | N/A | manual | check DevTools | ✅ after task | ⬜ pending |
| parse-aux-mapping | 01 | 1 | INCHI-01 | — | parseInt keys prevent prototype pollution | unit | `npm test -- --run src/lib/__tests__/parseAuxMapping.test.ts` | ❌ W0 | ⬜ pending |
| parse-inchi | 01 | 1 | INCHI-01 | — | N/A | unit | `npm test -- --run src/lib/__tests__/parseInchi.test.ts` | ❌ W0 | ⬜ pending |
| subscribe-pipeline | 01 | 2 | INCHI-01 | — | N/A | manual | draw molecule, observe state ≤150ms | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/parseAuxMapping.test.ts` — stubs for INCHI-01 auxMap correctness
- [ ] `src/lib/__tests__/parseInchi.test.ts` — stubs for INCHI-01 layers[] correctness
- [ ] Fix `vitest.config.ts`: change `environment: 'jsdom'` to `environment: 'node'` (jsdom not installed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live debounced update ≤150ms | INCHI-01 | Requires browser + Ketcher WASM | Draw a molecule, observe React DevTools state updates within 150ms of last change |
| Generation guard prevents stale overwrite | INCHI-01 | Requires async timing in browser | Draw rapidly; state always reflects the last drawn structure, not an earlier WASM response |
| Empty canvas produces `layers: [], auxMap: {}` | INCHI-01 | Requires browser + Ketcher WASM | Clear the canvas, observe DevTools state shows empty arrays |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
