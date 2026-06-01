---
name: project-state
description: Overall project status — explain-that-inchi v1.0 complete, currently fixing disconnected-fragment highlighting bugs
metadata:
  type: project
---

All 6 GSD phases for v1.0 are COMPLETE (100%). The app is a static Vite+React+TypeScript tool for interactively explaining InChI strings. Ketcher 3.12.0 (ketcher-react + ketcher-standalone + ketcher-core) provides the molecule editor and WASM InChI computation.

**Why:** Next action after the bug fixes is `/gsd-verify-work` then `/gsd-complete-milestone` to archive v1.0.

**How to apply:** Don't re-plan completed phases. Focus is on post-completion bug fixes before archiving.

Key files:
- `src/lib/parseInchi.ts` — layer parser + enrichLayers (handles n* expansion)
- `src/lib/parseAuxMapping.ts` — AuxInfo N: field → auxMap, + parseInchiWithAux
- `src/lib/highlightUtils.ts` — buildHighlightSpecs / buildSubHoverSpecs
- `src/components/LayerText.tsx` — per-layer text renderers incl. ConnectionText, HLayerText
- `src/hooks/useKetcherHighlights.ts` — bridges Zustand store → Ketcher highlight API
