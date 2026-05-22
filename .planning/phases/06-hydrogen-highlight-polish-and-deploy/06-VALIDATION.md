---
phase: 06
slug: hydrogen-highlight-polish-and-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (separate `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds (106 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-W0-01 | Wave 0 | 0 | PLSH-01 | — | N/A | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ❌ W0 | ⬜ pending |
| 06-W0-02 | Wave 0 | 0 | INCHI-05 | — | N/A | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ extend | ⬜ pending |
| 06-01 | INCHI-05 plan | 1 | INCHI-05 | — | H pool IDs sourced from render.ctab, not AuxInfo | unit | `npm test -- --run src/lib/__tests__/highlightUtils.test.ts` | ✅ | ⬜ pending |
| 06-02 | PLSH-01 plan | 1 | PLSH-01 | — | N/A | unit | `npm test -- --run src/__tests__/InchiSection.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03 | Deploy plan | 1 | — | — | N/A | manual | `npm run build && ls dist/` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/InchiSection.test.tsx` — stubs for PLSH-01 (empty state render, placeholder text)
- [ ] Additional test cases in `src/lib/__tests__/highlightUtils.test.ts` — H-branch in `buildSubHoverSpecs` (H pool IDs returned, silent no-op when empty) and `buildHighlightSpecs` formula case (H pool IDs appended)

*Existing `highlightUtils.test.ts` (29 tests) — extend in-place, do not create a new file.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| H sub-token hover lights explicit H atoms in canvas | INCHI-05 | Requires live Ketcher canvas interaction | Draw CH4 with Show H enabled; hover the H sub-token in formula; confirm H atoms highlight |
| Empty canvas shows dimmed placeholder (no layout shift) | PLSH-01 | Visual/layout check | Clear canvas; confirm `.inchi-display` box persists dim with placeholder text |
| `vite build` produces clean bundle, WASM loads | SC-03 | Requires browser + network | `npm run build && npm run preview`; check Network tab for 404s; `window.crossOriginIsolated === true` |
| GitHub Actions deploys on master push | SC-03 | Requires GitHub Actions run | Push a commit; check Actions tab for green deploy run |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
