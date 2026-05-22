// InchiSection.test.tsx — PLSH-01 empty state acceptance tests
// Wave 0 RED state: 'renders the inchi-display box' and 'shows placeholder text'
// FAIL against the current InchiSection which returns null when layers is empty.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InchiSection } from '../components/InchiSection';
import type { Layer } from '../lib/parseInchi';

// Mutable state controlled per-test
let mockLayers: Layer[] = [];
let mockHoverIdx: number | null = null;

const mockSetHover = vi.fn();
const mockSetSubHover = vi.fn();

// Mock the store module — selector pattern matching InchiSection's usage
vi.mock('../store', () => {
  const storeState = () => ({
    layers: mockLayers,
    hoverIdx: mockHoverIdx,
    setHover: mockSetHover,
    setSubHover: mockSetSubHover,
    inchi: '',
    auxMap: {},
    atomElements: {},
    setInchiData: vi.fn(),
  });

  const useInchiStore = vi.fn((selector: (s: ReturnType<typeof storeState>) => unknown) =>
    selector(storeState())
  ) as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };

  useInchiStore.getState = () => storeState();

  return { useInchiStore };
});

beforeEach(() => {
  mockLayers = [];
  mockHoverIdx = null;
  vi.clearAllMocks();
});

describe('InchiSection — PLSH-01 empty state', () => {
  it('renders the inchi-display box even when layers is empty', () => {
    // Mock: layers = [], hoverIdx = null (set in beforeEach)
    const { container } = render(<InchiSection />);
    // After PLSH-01 fix, must render a container with data-empty="true"
    // RED signal: current code returns null so this assertion fails
    expect(container.querySelector('[data-empty="true"]')).toBeInTheDocument();
  });

  it('shows the exact placeholder text when layers is empty', () => {
    // Mock: layers = [], hoverIdx = null
    render(<InchiSection />);
    // RED signal: current code returns null so this assertion fails
    expect(screen.getByText('Draw a molecule above to see its InChI.')).toBeInTheDocument();
  });

  it('does NOT render InChI= prefix when layers is empty', () => {
    // Mock: layers = [], hoverIdx = null
    render(<InchiSection />);
    // This test passes in RED state (returns null → no InChI= prefix rendered).
    // Must continue to pass after the PLSH-01 fix.
    expect(screen.queryByText(/InChI=/)).not.toBeInTheDocument();
  });

  it('renders InChI= prefix and layers when layers is non-empty', () => {
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(<InchiSection />);
    // Regression test: current code renders the prefix when layers exist
    expect(screen.getByText(/InChI=/)).toBeInTheDocument();
  });

  it('does not apply data-empty="true" when layers is non-empty', () => {
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [], bonds: [] }];
    const { container } = render(<InchiSection />);
    expect(container.querySelector('[data-empty="true"]')).not.toBeInTheDocument();
  });
});
