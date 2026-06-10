import type React from 'react';
import type { Ketcher } from 'ketcher-core';
import type { MoleculePreset } from '../data/molecules';

export interface HandleMolSelectOpts {
  id: string;
  molecules: MoleculePreset[];
  ketcherRef: React.RefObject<Ketcher | null>;
  setSelectedMolId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  isSettingMoleculeRef: React.MutableRefObject<boolean>;
}

/**
 * Loads the preset molecule with the given id into Ketcher using its embedded
 * isomeric SMILES string (data/molecules.ts). Structures load directly via
 * ketcher.setMolecule(smiles) with NO network request — presets work fully offline.
 * Ketcher standalone generates the 2D layout from the SMILES. Manages isLoading and
 * selectedMolId state around the async operation.
 *
 * - Sets isLoading(true) before load; isLoading(false) in finally (D-04).
 * - Sets selectedMolId(id) optimistically; reverts to null on error (D-04).
 * - Sets isSettingMoleculeRef.current = true before load so handleChange in
 *   App.tsx does NOT clear selectedMolId when the editor 'change' event fires after
 *   setMolecule() (RESEARCH.md Pitfall 4). On the SUCCESS path the ref is cleared by
 *   the debounced handleChange in App.tsx (a 'change' event is guaranteed to fire after
 *   setMolecule), NOT here. On the ERROR path setMolecule rejected so no 'change' event
 *   fires; this function clears the ref locally in the catch block to avoid leaving it
 *   stuck true.
 * - Returns early without loading if id is not found in molecules array.
 * - Does NOT call getInchi() — setMolecule() triggers editor 'change' which fires
 *   handleChange → getInchi automatically. Manual call would create a race condition.
 */
export async function handleMolSelectLogic(opts: HandleMolSelectOpts): Promise<void> {
  const { id, molecules, ketcherRef, setSelectedMolId, setIsLoading, isSettingMoleculeRef } = opts;

  const mol = molecules.find(m => m.id === id);
  if (!mol || !ketcherRef.current) return;

  setIsLoading(true);
  setSelectedMolId(id);
  isSettingMoleculeRef.current = true;

  try {
    await ketcherRef.current.setMolecule(mol.smiles);
  } catch (err) {
    console.error('Preset load failed:', err);
    setSelectedMolId(null); // revert active preset on error (D-04)
    // setMolecule rejected on this path, so no 'change' event will fire to clear the
    // guard in App.tsx's debounce — clear it here to avoid leaving it stuck true.
    isSettingMoleculeRef.current = false;
  } finally {
    setIsLoading(false);
  }
}
