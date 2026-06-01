---
name: bug-disconnected-fragments
description: n* multiplier (2 disconnected benzenes) highlighting bug — root causes, all fixes applied, verification pending
metadata:
  type: project
---

## The Bug

Drawing 2 disconnected benzenes produces `InChI=1S/2C6H6/c2*1-2-4-6-5-3-1/h2*1-6H`. Hovering atoms in the c-layer or h-layer only highlighted atoms from ONE fragment.

## Root Causes (all fixed)

### 1. auxMap incomplete for identical fragments — `parseAuxMapping.ts`
Ketcher's AuxInfo N: field may only list N_per_unit=6 entries (base fragment) for a 12-atom molecule. `parseInchiWithAux` now detects this (mappedCount === N_per_unit && mult > 1) and expands: `auxMap[k + offset] = auxMap[k] + offset` for each copy. Assumes Ketcher assigns consecutive draw-order IDs per fragment.

### 2. ConnectionText rendered `2*` digit as canonical atom — `LayerText.tsx`
The `2` before `*` in `2*1-2-4-6-5-3-1` was parsed as canonical atom 2 sub-hover. Fixed: strip leading `n*` prefix in `ConnectionText`, render it as plain non-interactive span.

### 3. HLayerText atom range corrupted by `2*` prefix — `LayerText.tsx`
`expandAtoms('2*1-6')` → `parseInt('2*1') = 2` → produced atoms [2..6] instead of [1..6]. Fixed: strip leading `n*` prefix in `HLayerText` before parsing.

### 4. Sub-hover only resolved ONE atom per canonical index — `highlightUtils.ts`
**Core semantic issue**: for n* layers, canonical `1` is a LOCAL per-fragment index that refers to the equivalent atom in EVERY copy (1 in ring 1, 7 in ring 2, etc.). Fixed by adding `expandForMultiplier(baseCanonicals, layer)` helper:
- Reads mult from `layer.text.match(/^(\d+)\*/)`
- Computes N_per_unit = `layer.atoms.length / mult`
- Expands `[1]` → `[1, 7]` for mult=2, N_per_unit=6
Applied in `buildSubHoverSpecs` for `'atom'`, `'hAtoms'`, and `'mobileH'` cases.

## Status
All fixes applied. 120 tests pass, no TS errors. **Needs runtime verification** — confirm both rings highlight when hovering atoms in c-layer and h-layer of 2×benzene.

**Why:** The auxMap offset expansion assumes consecutive Ketcher IDs per fragment. If Ketcher interleaves IDs across fragments (unlikely but possible), the second ring would still not highlight correctly. Runtime test is the only way to verify.
