/**
 * Tests for handleMolSelectLogic — embedded-SMILES (fetch-free) preset loader.
 *
 * handleMolSelect is a closure defined inside App(). It cannot be imported directly.
 * These tests use the extracted pure helper `handleMolSelectLogic` exported from
 * src/lib/handleMolSelectLogic.ts.
 *
 * Contract:
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
 * Presets carry an embedded isomeric SMILES string and load directly via
 * ketcher.setMolecule(smiles) — there is NO network request. The failure path is
 * exercised by making setMolecule reject (e.g. layout generation failure).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMolSelectLogic } from '../lib/handleMolSelectLogic';
import { MOLECULES } from '../data/molecules';

// Minimal Ketcher mock — only setMolecule is needed
const mockSetMolecule = vi.fn().mockResolvedValue(undefined);
const mockKetcherRef = { current: { setMolecule: mockSetMolecule } } as unknown as React.RefObject<any>;

// State mock helpers
const mockSetSelectedMolId = vi.fn((_id: string | null) => {});
const mockSetIsLoading = vi.fn((_loading: boolean) => {});
const mockIsSettingMoleculeRef = { current: false };

const BENZENE = MOLECULES.find(m => m.id === 'benzene')!;

beforeEach(() => {
  vi.clearAllMocks();
  mockSetMolecule.mockResolvedValue(undefined);
  mockIsSettingMoleculeRef.current = false;
});

describe('handleMolSelectLogic — success path', () => {
  it('calls ketcherRef.current.setMolecule() with the preset SMILES on success', async () => {
    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    expect(mockSetMolecule).toHaveBeenCalledWith(BENZENE.smiles);
  });

  it('sets isLoading to true first and false last on success', async () => {
    const isLoadingValues: boolean[] = [];
    const trackingSetIsLoading = vi.fn((loading: boolean) => {
      isLoadingValues.push(loading);
    });

    await handleMolSelectLogic({
      id: 'benzene',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: trackingSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    // First call: true (before load). Last call: false (finally block).
    expect(isLoadingValues[0]).toBe(true);
    expect(isLoadingValues[isLoadingValues.length - 1]).toBe(false);
  });
});

describe('handleMolSelectLogic — failure path (setMolecule rejects)', () => {
  it('reverts selectedMolId to null and clears isSettingMoleculeRef on setMolecule rejection', async () => {
    mockSetMolecule.mockRejectedValueOnce(new Error('layout failed'));
    mockIsSettingMoleculeRef.current = false;

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
    expect(mockIsSettingMoleculeRef.current).toBe(false);
  });

  it('resets isLoading to false after setMolecule rejection', async () => {
    mockSetMolecule.mockRejectedValueOnce(new Error('layout failed'));

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
});

describe('handleMolSelectLogic — guard conditions', () => {
  it('returns early without calling setMolecule if id is not in MOLECULES', async () => {
    await handleMolSelectLogic({
      id: 'unknown-molecule',
      molecules: MOLECULES,
      ketcherRef: mockKetcherRef,
      setSelectedMolId: mockSetSelectedMolId,
      setIsLoading: mockSetIsLoading,
      isSettingMoleculeRef: mockIsSettingMoleculeRef,
    });

    expect(mockSetMolecule).not.toHaveBeenCalled();
  });
});
