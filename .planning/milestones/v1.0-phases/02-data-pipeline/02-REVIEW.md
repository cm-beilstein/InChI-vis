---
phase: 02-data-pipeline
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/store.test.ts
  - src/lib/__tests__/parseAuxMapping.test.ts
  - src/lib/__tests__/parseInchi.test.ts
  - src/lib/parseAuxMapping.ts
  - src/lib/parseInchi.ts
  - src/store.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Eight files covering the data pipeline — InChI parsing, AuxInfo mapping, the Zustand store,
App.tsx wiring, and the test suite — were reviewed. The logic is sound for well-formed inputs,
the generation-counter stale-result guard in App.tsx is correct, and the store shape matches
the test expectations precisely.

Three warnings cover real defects: a platform-dependent newline that silently drops the entire
atom map on Windows (the open question flagged in the code's own comment), an unsafe type cast
that will misclassify unknown InChI layer prefixes, and an unvalidated input path in `parseInchi`
that silently produces garbage layers instead of a clean failure. Three info items flag the
exposed window global, a vitest environment gap, and a range-split edge case that fails silently.

---

## Warnings

### WR-01: CRLF separator silently discards AuxMap on Windows

**File:** `src/lib/parseAuxMapping.ts:52`
**Issue:** The separator literal `'\nAuxInfo='` uses Unix LF only. The file's own comment
(lines 20-22) flags "Assumption A2" — that Ketcher may emit `\r\n` on Windows. If Ketcher
returns `\r\nAuxInfo=`, `raw.indexOf('\nAuxInfo=')` still matches because `\n` is present
after `\r`. However, `inchiStr = raw.slice(0, idx)` would then include the trailing `\r`,
corrupting the InChI string passed to `parseInchi`. More importantly, if the WASM worker
ever emits `\r\nAuxInfo=` with `\r` attached to the end of the InChI line, the InChI
string fed to `parseInchi` will have a trailing `\r` that makes the layer-count check
behave unexpectedly.

The open question comment acknowledges this needs live verification, but the code has no
defensive trim in place. This should be hardened before the phase is closed.

**Fix:**
```typescript
// Normalise line endings before splitting — handles CRLF from WASM on Windows
const normalised = raw.replace(/\r\n/g, '\n');
const sep = '\nAuxInfo=';
const idx = normalised.indexOf(sep);
if (idx === -1) {
  return { inchi: normalised, layers: parseInchi(normalised), auxMap: {} };
}
const inchiStr = normalised.slice(0, idx);
const auxBody  = normalised.slice(idx + sep.length);
```

---

### WR-02: Unsafe `LayerType` cast for unknown prefixes

**File:** `src/lib/parseInchi.ts:221`
**Issue:** `const prefix = p[0] as LayerType` casts the first character of any InChI layer
segment directly to `LayerType` without validation. If a future InChI version adds a new
layer prefix not in the union (e.g., `'x'`), or if a malformed string is parsed, the value
stored in `layer.type` will be a string that is not a valid `LayerType`. Downstream code that
switch/matches on `LayerType` will hit `default` silently. The TypeScript type system provides
no protection here because the `as` cast suppresses the narrowing error.

**Fix:**
```typescript
const KNOWN_PREFIXES = new Set<string>(['c','h','q','p','b','t','m','s','i']);
const rawPrefix = p[0];
const prefix: LayerType = KNOWN_PREFIXES.has(rawPrefix)
  ? (rawPrefix as LayerType)
  : 'i'; // treat unknown layers as isotope (inert/passthrough)
```
Alternatively, unknown layers can be skipped entirely with `continue`.

---

### WR-03: `parseInchi` does not validate the `InChI=` prefix

**File:** `src/lib/parseInchi.ts:211`
**Issue:** `s.slice('InChI='.length)` unconditionally strips 6 characters from the head of
the input without checking that the string actually starts with `InChI=`. If Ketcher ever
returns an error string, an empty string, or a partial response (network timeout, WASM init
race), `parseInchi` will silently return a layer array with a garbage `version.text` value.
The App.tsx guard (`result.layers.length < 2`) catches the empty-canvas case but not the
malformed-input case — a one-layer result with `version.text = 'rror message...'` would pass
the guard undetected.

**Fix:**
```typescript
export function parseInchi(s: string): Layer[] {
  if (!s.startsWith('InChI=')) return []; // triggers layers.length < 2 guard in App.tsx
  const body = s.slice('InChI='.length);
  // ... rest unchanged
}
```

---

## Info

### IN-01: `window.ketcher` exposes internal instance in production builds

**File:** `src/App.tsx:21`
**Issue:** `(window as any).ketcher = ketcher` attaches the Ketcher editor instance to the
global window object. This is a useful debugging aid during development but leaks implementation
details in production builds. There is no tree-shaking or build-mode guard.

**Fix:**
```typescript
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ketcher = ketcher;
}
```

---

### IN-02: Vitest environment is `node` — future component tests will silently skip DOM APIs

**File:** `vitest.config.ts:5`
**Issue:** `environment: 'node'` is correct for the current pure-function tests. Phase 3 will
introduce React component tests (InChI display, hover interactions) that require a DOM
environment. If those test files are added without updating the config or adding a per-file
`@vitest-environment jsdom` annotation, DOM-dependent tests will throw `ReferenceError:
document is not defined` at runtime rather than failing with a useful message.

**Fix:** Add a comment noting the constraint, or switch the default and annotate the pure-function
tests with `@vitest-environment node`:
```typescript
export default defineConfig({
  test: {
    // NOTE: pure parsing tests use node; add @vitest-environment jsdom to component test files
    environment: 'node',
  },
});
```

---

### IN-03: Range-split in `parseHydrogenAtoms` silently ignores malformed ranges

**File:** `src/lib/parseInchi.ts:104`
**Issue:** `range.split('-').map(n => parseInt(n, 10))` destructures into `[a, b]`. If a
range string is malformed — e.g., a trailing dash `"1-"` produces `["1",""]` — `parseInt("",10)`
returns `NaN`. The loop `for (let k = NaN; k <= NaN; k++)` never executes, so atoms are silently
omitted. For well-formed InChI this is harmless, but there is no warning or guard.

**Fix:**
```typescript
const [a, b] = range.split('-').map(n => parseInt(n, 10));
if (isNaN(a) || isNaN(b)) continue; // malformed range — skip silently (or log in DEV)
for (let k = a; k <= b; k++) out[k] = count;
```

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
