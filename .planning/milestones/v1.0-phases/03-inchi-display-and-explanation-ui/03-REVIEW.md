---
phase: 03-inchi-display-and-explanation-ui
reviewed: 2026-05-21T07:35:04Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/store.test.ts
  - src/components/Explanation.module.css
  - src/components/Explanation.tsx
  - src/components/InchiSection.module.css
  - src/components/InchiSection.tsx
  - src/components/LayerText.tsx
  - src/components/Legend.module.css
  - src/components/Legend.tsx
  - src/lib/__tests__/layerInfo.test.ts
  - src/lib/__tests__/parseAuxMapping.test.ts
  - src/lib/layerInfo.ts
  - src/lib/parseAuxMapping.ts
  - src/store.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-21T07:35:04Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the InChI display strip, explanation panel, legend, store, and parsing utilities added in Phase 3. The architecture is sound: the Zustand store is minimal and correctly typed, the CSS Modules pattern is applied consistently, and the `dangerouslySetInnerHTML` usage is justified by the controlled data source (WASM output). No critical issues were found.

Three warnings are worth fixing before shipping: an unchecked type cast that can produce a runtime crash if the InChI string ever contains an unexpected layer prefix, a silent data failure when parsing on Windows due to unhandled `\r\n` line endings, and a stale `subHover` state that can persist when the InChI data is reset to empty. Four info-level findings cover dead exports, an exposed global, and a minor logical redundancy.

## Warnings

### WR-01: Unchecked `as LayerType` cast in `parseInchi.ts` can crash Explanation

**File:** `src/lib/parseInchi.ts:221`

**Issue:** The first character of each InChI segment is blindly cast to `LayerType` without validation. If the WASM InChI string ever contains a layer prefix that is not in the `LayerType` union (e.g., a future InChI extension, a non-standard layer, or corrupted output), `LAYER_INFO[layer.type]` in `Explanation.tsx` will return `undefined`. The component then dereferences it with `info!.title` (line 54), `info!.blurb` (line 55), and `info!.egLabel` (line 57), throwing a `TypeError` at render time.

**Fix:** Validate the prefix against the known set before pushing to the layers array, and skip or fall back to a generic "unknown" entry for unrecognised prefixes:

```typescript
const KNOWN_LAYER_PREFIXES = new Set<string>(['c','h','q','p','b','t','m','s','i']);

// In parseInchi(), replace line 221–223:
const prefix = p[0];
if (!KNOWN_LAYER_PREFIXES.has(prefix)) continue; // skip unknown layers
layers.push({ type: prefix as LayerType, prefix, text: p.slice(1), atoms: [], bonds: [] });
```

---

### WR-02: `parseInchiWithAux` silently fails on Windows `\r\n` line endings

**File:** `src/lib/parseAuxMapping.ts:90`

**Issue:** The function splits on the literal string `'\nAuxInfo='`. If Ketcher's WASM runtime returns `'\r\nAuxInfo='` (possible on Windows, acknowledged as Assumption A2 in the source comment), `indexOf` returns `-1`, the function takes the no-AuxInfo branch, and the entire raw string (including the `AuxInfo` block) is used as `inchi`. This means `auxMap` and `atomElements` will both be `{}` silently — atom highlights and element labels will not work, with no error surfaced to the user.

**Fix:** Normalise line endings before splitting:

```typescript
export function parseInchiWithAux(raw: string): { ... } {
  const normalised = raw.replace(/\r\n/g, '\n');
  const sep = '\nAuxInfo=';
  const idx = normalised.indexOf(sep);
  if (idx === -1) {
    return { inchi: normalised, layers: parseInchi(normalised), auxMap: {}, atomElements: {} };
  }
  const inchiStr = normalised.slice(0, idx);
  const auxBody = normalised.slice(idx + sep.length);
  // ...
}
```

---

### WR-03: `subHover` not cleared when InChI data is reset to empty

**File:** `src/App.tsx:56`

**Issue:** When the canvas is emptied or produces fewer than two layers (the empty-canvas guard), `setInchiData('', [], {}, {})` is called but `setSubHover(null)` is not. If the user had a sub-token hovered and then clears the canvas, `subHover` retains a stale value in the store. Any Phase 4 consumer reading `subHover` to drive atom highlights in the Ketcher canvas will act on a canonical atom index that no longer corresponds to any drawn atom.

**Fix:** Clear `subHover` alongside the empty-data reset in both guard branches:

```typescript
// Line 56 — empty-canvas guard
useInchiStore.getState().setInchiData('', [], {}, {});
useInchiStore.getState().setSubHover(null);   // add this
return;

// Line 62 — error catch
useInchiStore.getState().setInchiData('', [], {}, {});
useInchiStore.getState().setSubHover(null);   // add this
```

---

## Info

### IN-01: Dead exports in `layerInfo.ts` — `elementColor`, `hydroColor`, `parseStereoParities`, `parityColor`

**File:** `src/lib/layerInfo.ts:165,174,184,196`

**Issue:** Four functions are exported but never imported anywhere in production code (`elementColor`, `hydroColor`, `parseStereoParities`, `parityColor`). They are not covered by the test suite either. These appear to be preparatory Phase 4 building blocks left exported prematurely, or holdovers from the JS handoff that were not needed after the TypeScript port.

**Fix:** Either remove the `export` keyword (making them module-private) or, if they are intentional Phase 4 stubs, add a comment to that effect. Removing unused exports reduces the public API surface and prevents accidental dependencies from forming.

---

### IN-02: `window.ketcher` global assignment ships in production builds

**File:** `src/App.tsx:23`

**Issue:** `(window as any).ketcher = ketcher` is always executed in production. This leaks the Ketcher API object to any third-party scripts or browser extensions that can access `window`, and exposes internal WASM state.

**Fix:** Guard behind a development check:

```typescript
if (import.meta.env.DEV) {
  (window as any).ketcher = ketcher;
}
```

---

### IN-03: Unreachable fallback `|| l.desc` in `Legend.tsx`

**File:** `src/components/Legend.tsx:81`

**Issue:** `info?.blurb || l.desc` — `info` is looked up from `LAYER_INFO[l.type]`, where `l.type` is always a member of `ALL_LAYERS` (a hand-curated constant containing only the 11 valid `LayerType` values) and `LAYER_INFO` is typed `Record<LayerType, LayerInfoEntry>` with all 11 entries present. Therefore `info` is never `undefined` and `info.blurb` is never falsy. The `|| l.desc` branch is dead code.

**Fix:** Remove the optional chain and fallback:

```typescript
{info.blurb}
```

---

### IN-04: Dynamic CSS Modules access for `hydro${count}` bypasses TypeScript checking

**File:** `src/components/LayerText.tsx:169`

**Issue:** `(styles as Record<string, string>)[`hydro${Math.min(count, 4)}`]` uses a cast to bypass CSS Modules' static type checking. If the CSS class names `hydro1`–`hydro4` are ever renamed or removed, this will silently produce `undefined`, causing the string `'undefined inchiSubtoken_hash'` to appear in the DOM as a class attribute (harmless but incorrect). The `as Record<string, string>` cast suppresses the type error instead of resolving it.

**Fix:** Use the same static lookup table pattern already established for element classes in the same file:

```typescript
const HYDRO_CLASS: Record<number, string> = {
  1: styles.hydro1,
  2: styles.hydro2,
  3: styles.hydro3,
  4: styles.hydro4,
};

// Replace line 169:
const hydroClass = [
  HYDRO_CLASS[Math.min(count, 4)] ?? '',
  styles.inchiSubtoken
].filter(Boolean).join(' ');
```

---

_Reviewed: 2026-05-21T07:35:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
