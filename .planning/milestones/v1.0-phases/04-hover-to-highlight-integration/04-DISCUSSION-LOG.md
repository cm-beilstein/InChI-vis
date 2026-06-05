# Phase 4: Hover-to-Highlight Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 04-hover-to-highlight-integration
**Areas discussed:** Non-spatial layers, Bond highlighting, Highlight color fidelity, Stale highlight cleanup

---

## Non-spatial Layers

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas unchanged | Canvas stays clean — explanation card updates only. Matches canvas.jsx comment. | ✓ |
| Dim all atoms | All atoms get muted/dimmed visual signaling global layer | |

**User's choice:** Canvas unchanged — only explanation card updates
**Notes:** Matches design handoff canvas.jsx explicit comment "no canvas highlight (no spatial meaning here)" for q/p/version layers.

---

## Bond Highlighting

| Option | Description | Selected |
|--------|-------------|----------|
| Atoms only for Phase 4 | Simpler — just highlight atoms; bond ID mapping needs research | |
| Include bonds per canvas.jsx | Follow design handoff exactly: c-layer tints specific bonds | ✓ |

**User's choice:** Include bonds per canvas.jsx (high-fidelity)
**Notes:** Bond IDs in Ketcher API need researcher verification.

---

## Highlight Color Fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Match canvas.jsx exactly | Per-element, per-H-count, parity colors; resolve CSS vars at runtime | ✓ |
| Layer accent color only | Uniform accent color on all highlighted atoms; simpler | |

**User's choice:** Match canvas.jsx exactly
**Notes:** CSS vars resolved at runtime via `getComputedStyle(document.documentElement).getPropertyValue(...)`. No hard-coded hex values.

---

## Stale Highlight Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Clear-all before re-highlight | Reliable, zero accumulation risk, minor flicker | |
| Batch/atomic if API allows | No flicker if Ketcher supports atomic replace; fallback to clear+set | ✓ |

**User's choice:** Batch/atomic if Ketcher API allows, fallback to clear+set
**Notes:** Researcher must verify Ketcher 3.12.0 `highlights` API shape — whether it supports a full replace in one call.

---

## Claude's Discretion

- Highlight trigger architecture (useEffect, custom hook, or Zustand subscriber)
- Exact Ketcher `highlights` API shape (researcher to verify)
- Whether bond highlight IDs are indices or atom-pair tuples in the API
- File location for highlight logic

## Deferred Ideas

None — discussion stayed within phase scope.
