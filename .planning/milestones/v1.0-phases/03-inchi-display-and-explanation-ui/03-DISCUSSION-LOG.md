# Phase 3: InChI Display and Explanation UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 03-inchi-display-and-explanation-ui
**Areas discussed:** Reading-code richness, CSS organisation, InChI section hint text

---

## Reading-Code Richness

| Option | Description | Selected |
|--------|-------------|----------|
| Full element labels | Parse rA: from AuxInfo, store atomElements, enable C₁–C₂ style readings matching the design handoff exactly | ✓ |
| Numeric fallback only | Skip rA: parsing; c/h readings show "1–2", "atom 3 bears 1H" | |

**User's choice:** Full element labels
**Notes:** Accepts the ~1 extra task of extending parseAuxMapping.ts to parse rA: and adding atomElements to the store. Wants the reading-code block to match the design handoff exactly.

---

## CSS Organisation

| Option | Description | Selected |
|--------|-------------|----------|
| CSS Modules per component | One .module.css collocated with each .tsx — matches KetcherPanel.module.css pattern | ✓ |
| Additions to global styles.css | Append handoff classes directly to src/styles.css; closer to reference file | |

**User's choice:** CSS Modules per component
**Notes:** Consistent with the established pattern from Phase 1. Accepts the conversion of global class names to camelCase module references.

---

## InChI Section Hint Text

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from formula layer | Find layers.find(l => l.type === 'formula').text and display it | ✓ |
| Static hint | Always show "Hover any coloured chunk" | |
| Leave blank | No hint text | |

**User's choice:** Derive from formula layer
**Notes:** Shows the molecule formula (e.g. "C6H6") dynamically from the parsed store data. Empty canvas = no hint shown.

---

## Claude's Discretion

- Component file layout (flat in src/components/)
- Whether Legend is standalone or co-located in Explanation.tsx
- Whether LayerText sub-renderers are in InchiSection.tsx or a separate file
- Exact TypeScript types for readingFor() return value
- CSS Module class name mapping from handoff global names
- Legend tooltip via CSS-only :hover (no React state)
- dangerouslySetInnerHTML for reading-code block (internally generated, no user input)

## Deferred Ideas

None.
