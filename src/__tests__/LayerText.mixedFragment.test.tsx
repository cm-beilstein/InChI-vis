// LayerText.mixedFragment.test.tsx — regression for quick-260610-d2r
// Mixed multi-fragment InChI layers of the form `N*...;N*...` (e.g. 2C7H8.2C6H6) must map a
// benzene-fragment token to its OWN canonicals (15-26), not the first toluene group (1-14).
//
// Before the Task 1 fix, the greedy top-level multMatch matched across the `;`, hijacking
// control into the single-group-multiplier branch (uses only fragCounts[0]), so benzene tokens
// mapped to toluene canonicals. The mixed-case assertions below FAIL against the unguarded code
// and PASS after the guard. The pure-single-group assertion proves no regression of that branch.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LayerText } from '../components/LayerText';
import type { Layer, SubHover } from '../lib/parseInchi';

const mockSetSubHover = vi.fn();

vi.mock('../store', () => {
  const storeState = () => ({
    setSubHover: mockSetSubHover,
  });
  const useInchiStore = vi.fn() as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };
  useInchiStore.getState = () => storeState();
  return { useInchiStore };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// Minimal Layer objects — LayerText only dispatches on `type`; rawText is passed separately.
const cLayer: Layer = { type: 'c', prefix: 'c', text: '', atoms: [], bonds: [] };
const hLayer: Layer = { type: 'h', prefix: 'h', text: '', atoms: [], bonds: [] };

// Capture the SubHover argument for the most recent mouseEnter that produced a non-null hit.
function lastHit(): SubHover | undefined {
  const calls = mockSetSubHover.mock.calls.filter((c) => c[0] != null);
  return calls.length ? (calls[calls.length - 1][0] as SubHover) : undefined;
}

describe('LayerText — mixed N*...;N*... cross-fragment canonical mapping (quick-260610-d2r)', () => {
  // Repro: InChI=1S/2C7H8.2C6H6/c2*1-7-5-3-2-4-6-7;2*1-2-4-6-5-3-1/h2*2-6H,1H3;2*1-6H
  // fragCounts = [7,7,6,6]; toluene -> canonicals 1-14, benzene -> canonicals 15-26.

  it('c-layer: hovering a benzene-fragment atom token maps to canonicals in [15,26]', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="2*1-7-5-3-2-4-6-7;2*1-2-4-6-5-3-1" fragCounts={[7, 7, 6, 6]} />
    );
    // The benzene segment is "2*1-2-4-6-5-3-1" (after the ';'). Its atom tokens render the
    // local digits 1-6. Find the LAST span whose text is exactly "4" — that belongs to the
    // benzene segment (the toluene segment's last "4" precedes it, benzene's follows the ';').
    const fours = Array.from(container.querySelectorAll('span')).filter((s) => s.textContent === '4');
    expect(fours.length).toBeGreaterThanOrEqual(2);
    const benzeneFour = fours[fours.length - 1];
    fireEvent.mouseEnter(benzeneFour);

    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('atom');
    const canonicals = hit!.canonicals ?? [hit!.canonical!];
    expect(canonicals.length).toBeGreaterThan(0);
    for (const c of canonicals) {
      expect(c).toBeGreaterThanOrEqual(15);
      expect(c).toBeLessThanOrEqual(26);
    }
  });

  it('h-layer: hovering a benzene-fragment H token maps to atoms in [15,26]', () => {
    const { container } = render(
      <LayerText layer={hLayer} rawText="2*2-6H,1H3;2*1-6H" fragCounts={[7, 7, 6, 6]} />
    );
    // The benzene segment is "2*1-6H" (after the ';'). Its single H token renders text "1-6H".
    const benzeneH = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '1-6H'
    );
    expect(benzeneH).toBeDefined();
    fireEvent.mouseEnter(benzeneH!);

    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('hAtoms');
    const atoms = hit!.atoms ?? [];
    expect(atoms.length).toBeGreaterThan(0);
    for (const a of atoms) {
      expect(a).toBeGreaterThanOrEqual(15);
      expect(a).toBeLessThanOrEqual(26);
    }
  });

  it('pure single-group N* (no ;) still maps via the multMatch branch across all copies', () => {
    // "2*1-2-4-6-5-3-1" with fragCounts [6,6]: hovering local atom 1 highlights it in both
    // copies, so canonicals must span both fragments (include a value > 6).
    const { container } = render(
      <LayerText layer={cLayer} rawText="2*1-2-4-6-5-3-1" fragCounts={[6, 6]} />
    );
    const ones = Array.from(container.querySelectorAll('span')).filter((s) => s.textContent === '1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
    fireEvent.mouseEnter(ones[0]);

    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('atom');
    const canonicals = hit!.canonicals ?? [hit!.canonical!];
    expect(canonicals.some((c) => c > 6)).toBe(true);
  });
});
