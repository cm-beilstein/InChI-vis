/**
 * Wave 0 stub — tests for handleMolSelect fetch behaviour (EDIT-02).
 *
 * handleMolSelect is a closure defined inside App(). It cannot be imported directly.
 * These tests use an extracted pure helper `_handleMolSelectLogic` that the
 * implementation MUST export from src/lib/handleMolSelectLogic.ts (created in Plan 03 Task 1).
 *
 * Contract: Plan 03 Task 1 must export:
 *
 *   export async function handleMolSelectLogic(opts: {
 *     id: string;
 *     molecules: MoleculePreset[];
 *     ketcherRef: React.RefObject<Ketcher | null>;
 *     setSelectedMolId: (id: string | null) => void;
 *     setIsLoading: (loading: boolean) => void;
 *     isSettingMoleculeRef: React.MutableRefObject<boolean>;
 *   }): Promise<void>
 *
 * If the implementation instead opts to keep handleMolSelect as a private closure
 * and test via a React integration wrapper, replace this file with an integration
 * test using @testing-library/react that renders a minimal App wrapper.
 * Either approach is acceptable — the test coverage requirements below must be met.
 *
 * All tests in this file are RED until Plan 03 Task 1 creates the implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMolSelectLogic } from '../lib/handleMolSelectLogic';
import { MOLECULES } from '../data/molecules';
import type { MoleculePreset } from '../data/molecules';

// Minimal Ketcher mock — only setMolecule is needed
const mockSetMolecule = vi.fn().mockResolvedValue(undefined);
const mockKetcherRef = { current: { setMolecule: mockSetMolecule } } as unknown as React.RefObject<any>;

// State mock helpers
let capturedSelectedMolId: string | null = null;
let capturedIsLoading: boolean = false;
const mockSetSelectedMolId = vi.fn((id: string | null) => { capturedSelectedMolId = id; });
const mockSetIsLoading = vi.fn((loading: boolean) => { capturedIsLoading = loading; });
const mockIsSettingMoleculeRef = { current: false };

const BENZENE = MOLECULES.find(m => m.id === 'benzene')!;
const MOCK_SDF = '\n  Ketcher  0200\n\n  6  6  0  0  0  0  0  0  0  0  0 V2000\n'; // minimal valid SDF stub

beforeEach(() => {
  vi.clearAllMocks();
  capturedSelectedMolId = null;
  capturedIsLoading = false;
  mockIsSettingMoleculeRef.current = false;
});

describe('handleMolSelectLogic — success path', () => {
  it('fetches the correct PubChem URL for the given CID', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => MOCK_SDF,
    } as Response);

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${BENZENE.cid}/SDF`
    );
  });

  it('calls ketcherRef.current.setMolecule() with the SDF text on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => MOCK_SDF,
    } as Response);

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    expect(mockSetMolecule).toHaveBeenCalledWith(MOCK_SDF);
  });

  it('sets isLoading to true before fetch and false after success', async () => {
    const isLoadingValues: boolean[] = [];
    const trackingSetIsLoading = vi.fn((loading: boolean) => {
      isLoadingValues.push(loading);
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => MOCK_SDF,
    } as Response);

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: trackingSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    // First call: true (before fetch). Last call: false (finally block).
    expect(isLoadingValues[0]).toBe(true);
    expect(isLoadingValues[isLoadingValues.length - 1]).toBe(false);
  });
});

describe('handleMolSelectLogic — failure path', () => {
  it('reverts selectedMolId to null on non-ok fetch response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    } as Response);

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    // setSelectedMolId(id) called first (optimistic), then setSelectedMolId(null) on error
    const calls = mockSetSelectedMolId.mock.calls;
    expect(calls.at(-1)![0]).toBeNull(); // last call must revert to null (D-04)
  });

  it('reverts selectedMolId to null on network error (fetch throws)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    const calls = mockSetSelectedMolId.mock.calls;
    expect(calls.at(-1)![0]).toBeNull();
  });

  it('resets isLoading to false after fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    } as Response);

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    const isLoadingCalls = mockSetIsLoading.mock.calls;
    expect(isLoadingCalls.at(-1)![0]).toBe(false); // finally block always resets
  });

  it('does NOT call setMolecule() on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Unavailable',
    } as Response);

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    expect(mockSetMolecule).not.toHaveBeenCalled();
  });
});

describe('handleMolSelectLogic — guard conditions', () => {
  it('returns early without fetch if id is not in MOLECULES', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    await handleMolSelectLogic({
      id: 'unknown-molecule',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
