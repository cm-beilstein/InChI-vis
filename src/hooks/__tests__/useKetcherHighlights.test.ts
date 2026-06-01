import { describe, it, expect, vi } from 'vitest';
import { applyKetcherHighlights, whiteAtomLabels } from '../useKetcherHighlights';
import type { HighlightSpec } from '../../lib/highlightUtils';

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

describe('whiteAtomLabels', () => {
  it('sets fill:white on heteroatom labels (N, O, S, H)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const nEl = makeAtomEl(5, 'N');
    const oEl = makeAtomEl(6, 'O');
    svg.append(nEl, oEl);
    const specs: HighlightSpec[] = [{ atoms: [5, 6], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    whiteAtomLabels(svg, specs);
    expect((nEl as HTMLElement).style.fill).toBe('white');
    expect((oEl as HTMLElement).style.fill).toBe('white');
  });

  it('does NOT set fill on C atoms (no visible label in skeletal formula)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const cEl = makeAtomEl(3, 'C');
    svg.append(cEl);
    const specs: HighlightSpec[] = [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    whiteAtomLabels(svg, specs);
    expect((cEl as HTMLElement).style.fill).toBe('');
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
    expect((nEl as HTMLElement).style.fill).toBe('white');
    expect((clEl as HTMLElement).style.fill).toBe('white');
  });
});
