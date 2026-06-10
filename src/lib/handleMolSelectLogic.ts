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
 * Fetches the SDF for the molecule with the given id from PubChem and loads it
 * into Ketcher. Manages isLoading and selectedMolId state around the async operation.
 *
 * - Sets isLoading(true) before fetch; isLoading(false) in finally (D-04).
 * - Sets selectedMolId(id) optimistically; reverts to null on error (D-04).
 * - Sets isSettingMoleculeRef.current = true before fetch so handleChange in
 *   App.tsx does NOT clear selectedMolId when the editor 'change' event fires after
 *   setMolecule() (RESEARCH.md Pitfall 4). On the SUCCESS path the ref is cleared by
 *   the debounced handleChange in App.tsx (a 'change' event is guaranteed to fire after
 *   setMolecule), NOT here. On the ERROR path no setMolecule() runs, so no 'change' event
 *   fires; this function clears the ref locally in the catch block to avoid leaving it
 *   stuck true.
 * - Returns early without fetching if id is not found in molecules array.
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
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${mol.cid}/SDF`
    );
    if (!res.ok) throw new Error(`PubChem ${res.status}`);
    const sdf = await res.text();
    await ketcherRef.current.setMolecule(sdf);
  } catch (err) {
    console.error('Preset load failed:', err);
    setSelectedMolId(null); // revert active preset on error (D-04)
    // No setMolecule() ran on this path, so no 'change' event will fire to clear the
    // guard in App.tsx's debounce — clear it here to avoid leaving it stuck true.
    isSettingMoleculeRef.current = false;
  } finally {
    setIsLoading(false);
  }
}
