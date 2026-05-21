import { describe, it, expect, vi } from 'vitest';
import { applyKetcherHighlights } from '../useKetcherHighlights';
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
