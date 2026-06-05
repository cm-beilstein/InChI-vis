import { describe, it, expect, vi } from 'vitest';
import { applyKetcherHighlights, whiteAtomLabels, renderHBadges, cleanHBadges } from '../useKetcherHighlights';
import type { HighlightSpec, StructLike } from '../../lib/highlightUtils';
import type { SubHover, AuxMap } from '../../lib/parseInchi';

function makeMockEditor() {
  return {
    highlights: {
      clear: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('applyKetcherHighlights', () => {
  it('calls clear() before any create()', () => {
    const editor = makeMockEditor();
    const spec: HighlightSpec = { atoms: [0], bonds: [], rgroupAttachmentPoints: [], color: '#ff0000' };
    applyKetcherHighlights(editor, [spec]);
    expect(editor.highlights.clear).toHaveBeenCalledTimes(1);
    expect(editor.highlights.create).toHaveBeenCalledWith(spec);
  });

  it('calls clear() but NOT create() when specs is empty', () => {
    const editor = makeMockEditor();
    applyKetcherHighlights(editor, []);
    expect(editor.highlights.clear).toHaveBeenCalledTimes(1);
    expect(editor.highlights.create).not.toHaveBeenCalled();
  });

  it('passes multiple specs as variadic args to create()', () => {
    const editor = makeMockEditor();
    const spec1: HighlightSpec = { atoms: [0], bonds: [], rgroupAttachmentPoints: [], color: '#ff0000' };
    const spec2: HighlightSpec = { atoms: [1], bonds: [], rgroupAttachmentPoints: [], color: '#00ff00' };
    applyKetcherHighlights(editor, [spec1, spec2]);
    expect(editor.highlights.create).toHaveBeenCalledWith(spec1, spec2);
  });
});

function makeAtomEl(atomId: number, label: string): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  el.setAttribute('data-atom-id', String(atomId));
  el.setAttribute('data-atomLabel', label);
  return el as unknown as SVGElement;
}

/**
 * Creates a `<g>` element containing a `<text data-atom-id="atomId">` child.
 * Mocks `getBBox()` on the group to return predictable coordinates for badge positioning tests.
 * JSDOM does not implement getBBox natively — cast and assign manually.
 */
function makeAtomGroup(atomId: number, x: number, y: number): SVGGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g') as SVGGElement;
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('data-atom-id', String(atomId));
  text.setAttribute('data-atomLabel', 'C');
  g.appendChild(text);
  // JSDOM does not implement getBBox — mock it so renderHBadges can read atom position
  (g as unknown as { getBBox(): DOMRect }).getBBox = () =>
    ({ x, y, width: 20, height: 16 } as DOMRect);
  return g;
}

const resolveVarFn = (name: string): string => name;

describe('whiteAtomLabels', () => {
  it('sets fill:white on heteroatom labels (N, O, S, H)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const nEl = makeAtomEl(5, 'N');
    const oEl = makeAtomEl(6, 'O');
    svg.append(nEl, oEl);
    const specs: HighlightSpec[] = [{ atoms: [5, 6], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    whiteAtomLabels(svg, specs);
    expect((nEl as unknown as HTMLElement).style.fill).toBe('white');
    expect((oEl as unknown as HTMLElement).style.fill).toBe('white');
  });

  it('does NOT set fill on C atoms (no visible label in skeletal formula)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const cEl = makeAtomEl(3, 'C');
    svg.append(cEl);
    const specs: HighlightSpec[] = [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    whiteAtomLabels(svg, specs);
    expect((cEl as unknown as HTMLElement).style.fill).toBe('');
  });

  it('skips atoms with no matching DOM element without throwing', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const specs: HighlightSpec[] = [{ atoms: [99], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    expect(() => whiteAtomLabels(svg, specs)).not.toThrow();
  });

  it('handles multiple specs correctly', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const nEl = makeAtomEl(1, 'N');
    const clEl = makeAtomEl(2, 'Cl');
    svg.append(nEl, clEl);
    const specs: HighlightSpec[] = [
      { atoms: [1], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(1,2,3)' },
      { atoms: [2], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(4,5,6)' },
    ];
    whiteAtomLabels(svg, specs);
    expect((nEl as unknown as HTMLElement).style.fill).toBe('white');
    expect((clEl as unknown as HTMLElement).style.fill).toBe('white');
  });
});

// ---------------------------------------------------------------------------
// Phase 8: renderHBadges + cleanHBadges tests (RED — functions not yet exported)
// ---------------------------------------------------------------------------

describe('renderHBadges', () => {
  it('injects exactly one [data-h-badge] SVG text element per atom in subHover.atoms when atom group exists', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    const g1 = makeAtomGroup(1, 200, 50);
    svg.append(g0, g1);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1, 2], count: 1 };
    // canonical 1 → pool 0, canonical 2 → pool 1
    const auxMap: AuxMap = { 1: 0, 2: 1 };

    renderHBadges(svg, subHover, auxMap, resolveVarFn);

    const badges = svg.querySelectorAll('[data-h-badge]');
    expect(badges.length).toBe(2);
  });

  it('sets textContent to "H2" for kind hAtoms with count 2', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 2 };
    const auxMap: AuxMap = { 1: 0 };

    renderHBadges(svg, subHover, auxMap, resolveVarFn);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('H2');
  });

  it('sets textContent to "H?" and font-style="italic" for kind mobileH', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'mobileH', atoms: [1] };
    const auxMap: AuxMap = { 1: 0 };

    renderHBadges(svg, subHover, auxMap, resolveVarFn);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('H?');
    expect(badge!.getAttribute('font-style')).toBe('italic');
  });

  it('does NOT throw when atom pool ID has no matching DOM element (graceful skip)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // No atom groups in SVG — all atoms are missing

    const subHover: SubHover = { kind: 'hAtoms', atoms: [99], count: 1 };
    const auxMap: AuxMap = { 99: 42 }; // pool 42 not in SVG

    expect(() => renderHBadges(svg, subHover, auxMap, resolveVarFn)).not.toThrow();
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('skips badge for heavy atom that already has an explicit H bonded in the canvas', () => {
    // canonical 1 → pool 0 (heavy atom), pool 5 = explicit H bonded to pool 0
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 1 };
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 0, end: 5 }, 0); } },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('renders badge for heavy atom that has NO explicit H bonded (implicit H only)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 1 };
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5]; // pool 5 is H, but bonded to pool 3 (different atom)
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 3, end: 5 }, 0); } },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(1);
  });

  it('renders badges for a mix: atoms with implicit H get badges, atoms with explicit H do not', () => {
    // canonical 1 → pool 0 (implicit H only), canonical 2 → pool 1 (has explicit H pool 5 bonded)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    const g1 = makeAtomGroup(1, 200, 50);
    svg.append(g0, g1);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1, 2], count: 1 };
    const auxMap: AuxMap = { 1: 0, 2: 1 };
    const hAtomPoolIds = [5];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 1, end: 5 }, 0); } }, // pool 1 has explicit H (pool 5)
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    // pool 0 (canonical 1) → no explicit H bonded → badge rendered
    // pool 1 (canonical 2) → explicit H (pool 5) bonded → no badge
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(1);
  });

  it('places implicit H badge in the largest angular gap — away from bonded explicit H and bond lines', () => {
    // Heavy atom pool 0 at (100,100); explicit H pool 5 directly above at (100,70).
    // Only one neighbor in SVG → gap is the full circle minus that direction.
    // Gap midpoint = opposite direction → badge goes downward (badge y > heavy center y).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 100); // center: (110, 108)
    const g5 = makeAtomGroup(5, 100, 70);  // center: (110, 78) — above g0
    svg.append(g0, g5);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 2 };
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 0, end: 5 }, 0); } },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    // Only neighbor is above → gap midpoint is below → badge y > 108
    const badgeY = parseFloat(badge!.getAttribute('y')!);
    expect(badgeY).toBeGreaterThan(108);
  });

  it('avoids bond lines: badge placed in the open sector when heavy atom is bonded to a heavy neighbor', () => {
    // Heavy atom pool 0 at (100,100); heavy neighbor pool 1 at (140,100) — directly to the right.
    // No explicit H. Largest gap is the left half (opposite to the bond).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 100); // center: (110, 108)
    const g1 = makeAtomGroup(1, 140, 100); // center: (150, 108) — to the right
    svg.append(g0, g1);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 1 };
    const auxMap: AuxMap = { 1: 0 };
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 0, end: 1 }, 0); } },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, [], struct);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    // Neighbor is to the right (angle 0°) → gap midpoint is left (angle 180°) → badge x < 110
    const badgeX = parseFloat(badge!.getAttribute('x')!);
    expect(badgeX).toBeLessThan(110);
  });

  it('shows residual implicit H badge when atom has some explicit H but not all (e.g. H3 total, 1 explicit → H2 badge)', () => {
    // Reproduces the case: methyl group drawn with 2 explicit H, InChI h-layer says H3 → 1 implicit H remains
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 3 }; // InChI says 3H total
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5, 6]; // 2 explicit H atoms (pool 5 and 6) bonded to pool 0
    const struct: StructLike = {
      findBondId: () => null,
      bonds: {
        forEach: (cb) => {
          cb({ begin: 0, end: 5 }, 0); // pool 0 bonded to explicit H pool 5
          cb({ begin: 0, end: 6 }, 1); // pool 0 bonded to explicit H pool 6
        },
      },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    const badges = svg.querySelectorAll('[data-h-badge]');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toBe('H'); // 3 total − 2 explicit = 1 implicit → "H"
  });
});

describe('cleanHBadges', () => {
  it('removes all [data-h-badge] elements from the SVG root', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const ns = 'http://www.w3.org/2000/svg';

    const badge1 = document.createElementNS(ns, 'text');
    badge1.setAttribute('data-h-badge', 'true');
    badge1.textContent = 'H';

    const badge2 = document.createElementNS(ns, 'text');
    badge2.setAttribute('data-h-badge', 'true');
    badge2.textContent = 'H2';

    svg.append(badge1, badge2);
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(2);

    cleanHBadges(svg);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('does not throw on an empty SVG root', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(() => cleanHBadges(svg)).not.toThrow();
  });
});
