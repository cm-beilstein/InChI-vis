---
phase: 1
slug: scaffold-and-ketcher-mount
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | EDIT-01 | — | N/A | integration | `npm run dev` + browser verify | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | EDIT-01 | — | N/A | integration | `npm run build && npm run preview` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | PLSH-02 | — | N/A | integration | `npm run build && npm run preview` no 404s | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/setup.ts` — test setup/environment stubs
- [ ] `vitest` installed and configured in `vite.config.ts`

*Existing infrastructure covers basic build verification; Wave 0 adds vitest harness.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ketcher editor visible in browser | EDIT-01 | Requires browser rendering | Open `npm run dev`, verify editor canvas appears |
| `getInchi()` returns valid InChI string | EDIT-01 | Requires WASM execution in browser | Draw molecule, run `ketcher.getInchi()` in console |
| `highlights.create` changes atom color | EDIT-01 | Requires visual browser check | Call `ketcher.editor.highlights.create({atoms:[0], bonds:[], rgroupAttachmentPoints:[], color:'#ff0000'})` in console |
| CSS tokens not overridden by Ketcher | PLSH-02 | Requires browser DevTools inspection | Open DevTools, check `--color-formula` resolves to expected value |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
