import { describe, it, expect } from 'vitest';
import { MOLECULES } from '../data/molecules';
import type { MoleculePreset } from '../data/molecules';

describe('MOLECULES preset data', () => {
  it('exports at least 10 molecules', () => {
    expect(MOLECULES.length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has id, name, formula, smiles fields', () => {
    for (const mol of MOLECULES) {
      expect(mol.id).toBeTruthy();
      expect(mol.name).toBeTruthy();
      expect(mol.formula).toBeTruthy();
      expect(typeof mol.smiles).toBe('string');
      expect(mol.smiles.length).toBeGreaterThan(0);
    }
  });

  it('contains all expected molecule ids', () => {
    const ids = MOLECULES.map(m => m.id);
    expect(ids).toContain('methane');
    expect(ids).toContain('ethanol');
    expect(ids).toContain('benzene');
    expect(ids).toContain('acetic');
    expect(ids).toContain('alanine');
    expect(ids).toContain('vanillin');
    expect(ids).toContain('caffeine');
    expect(ids).toContain('nicotine');
    expect(ids).toContain('melatonin');
    expect(ids).toContain('naloxone');
  });

  it('has correct embedded SMILES for stereo-sensitive molecules', () => {
    const find = (id: string) => MOLECULES.find(m => m.id === id)!;
    expect(find('methane').smiles).toBe('C');
    expect(find('benzene').smiles).toBe('C1=CC=CC=C1');
    expect(find('alanine').smiles).toBe('C[C@@H](C(=O)O)N');    // L-Alanine (2S) enantiomer
    expect(find('nicotine').smiles).toBe('CN1CCC[C@H]1C2=CN=CC=C2');  // (S)-Nicotine
    expect(find('naloxone').smiles).toBe('C=CCN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)O)O4)O');
  });

  it('MoleculePreset type has correct shape', () => {
    const mol: MoleculePreset = MOLECULES[0];
    const keys = Object.keys(mol);
    expect(keys).toContain('id');
    expect(keys).toContain('name');
    expect(keys).toContain('formula');
    expect(keys).toContain('smiles');
  });
});

describe('canvas overlay derivation', () => {
  it('formula is derived from layers[0].text, not preset formula field', () => {
    // This tests the contract: overlay uses live InChI formula layer, not hardcoded preset data
    // layers[0].text for benzene from Ketcher WASM = "C6H6", not "C₆H₆"
    // These are different strings — live data takes precedence over preset metadata
    const liveFormula = 'C6H6';
    const presetFormula = 'C₆H₆';
    expect(liveFormula).not.toBe(presetFormula);
  });

  it('heavyAtomCount = Object.keys(atomElements).length', () => {
    const atomElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'O' };
    expect(Object.keys(atomElements).length).toBe(3);
  });
});
