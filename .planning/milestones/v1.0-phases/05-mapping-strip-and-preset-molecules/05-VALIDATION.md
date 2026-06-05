---
phase: 5
slug: mapping-strip-and-preset-molecules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | MAP-01 | — | N/A | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | MAP-02 | — | N/A | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-01-stub | 01 | 1 | EDIT-02 | — | N/A | unit stub | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | EDIT-02 | — | N/A | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | EDIT-03 | — | N/A | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/MappingStrip.test.tsx` — stubs for MAP-01, MAP-02
- [ ] `src/__tests__/PresetMolecules.test.tsx` — stubs for EDIT-02, EDIT-03
- [ ] `src/__tests__/handleMolSelect.test.ts` — stubs for EDIT-02 fetch behavior

*Existing test infrastructure in vitest.config.ts covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas overlay shows correct molecule name, formula, heavy-atom count | MAP-02 | Requires live Ketcher canvas + InChI WASM | Load caffeine preset; verify overlay shows "Caffeine", "C8H10N4O2", "24" |
| Mapping strip identity/divergent color coding | MAP-01 | Visual CSS state verification | Draw ethanol; verify pairs with matching indices are dimmed, divergent pairs highlighted |
| Full pipeline end-to-end on preset load | EDIT-02, EDIT-03 | Requires live Ketcher + WASM | Click preset → InChI updates → layers parse → mapping strip updates, all within one debounce |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
