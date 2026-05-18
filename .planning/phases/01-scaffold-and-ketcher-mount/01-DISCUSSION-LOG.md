# Phase 1: Scaffold and Ketcher Mount - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 01-scaffold-and-ketcher-mount
**Areas discussed:** Deployment target, App shell scope, WASM loading state, staticResourcesUrl

---

## Deployment Target

| Option | Description | Selected |
|--------|-------------|----------|
| Netlify | COOP/COEP headers via netlify.toml — no service worker needed, clean first load | |
| GitHub Pages | coi-serviceworker.js polyfill required; page reloads on first visit | ✓ |
| Both / decide later | Scaffold for both: include both coi-serviceworker.js AND netlify.toml | |

**User's choice:** GitHub Pages

---

| Option | Description | Selected |
|--------|-------------|----------|
| InChI-vis | Matches working directory name. Vite base: /InChI-vis/ | |
| explain-that-inchi | More descriptive slug. Vite base: /explain-that-inchi/ | ✓ |
| Something else | Custom repo name | |

**User's choice:** `explain-that-inchi` → Vite base `/explain-that-inchi/`, coi-serviceworker required

---

## App Shell Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full layout shell | Port Header + KetcherPanel; stub InchiSection, MappingStrip, Explanation, Footnote | ✓ |
| Minimal smoke test | Ketcher mounted in a bare div, tokens visible, no layout structure | |
| Ketcher panel only | Just KetcherPanel section from app.jsx | |

**User's choice:** Full layout shell

---

| Option | Description | Selected |
|--------|-------------|----------|
| Global import in main.tsx | Copy styles.css verbatim to src/styles.css, import once in main.tsx | ✓ |
| Inline into index.html | Paste :root block directly into index.html | |

**User's choice:** Global import in main.tsx

---

## WASM Loading State

| Option | Description | Selected |
|--------|-------------|----------|
| Dimmed panel with centered text | Semi-transparent overlay + "Loading editor…" in --ink-soft | ✓ |
| Spinner + text | CSS border-based spinner centered in panel | |
| Skeleton placeholder | Grey rectangle with pulse animation | |
| Nothing / let Ketcher handle it | No custom loading state — Ketcher internal loader | |

**User's choice:** Dimmed panel with "Loading editor…" text
**Notes:** isReady boolean state on App; onInit callback sets it to true; Editor always mounted (never conditional)

---

## staticResourcesUrl

| Option | Description | Selected |
|--------|-------------|----------|
| import.meta.env.BASE_URL | Resolves to /explain-that-inchi/ in production, / in dev | ✓ |
| '' (empty string) | Only correct for root-path deploys; 404s on GitHub Pages subpath | |

**User's choice:** `import.meta.env.BASE_URL`

---

## Claude's Discretion

- Exact WASM/worker filenames to copy from node_modules — resolve by inspecting dist/ after npm install
- CSS Module file structure within src/ — follow design handoff implicit structure
- CSS for the loading overlay — use design tokens, keep minimal

## Deferred Ideas

None.
