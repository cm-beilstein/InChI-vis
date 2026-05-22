export interface MoleculePreset {
  id: string;
  name: string;
  formula: string;
  cid: number;
}

/**
 * 10 preset molecules for the molecule picker panel.
 * CIDs verified against PubChem 2026-05-22 (D-01, D-03).
 * Formula uses Unicode subscript characters matching the design handoff.
 * SDF structures are fetched from PubChem at runtime via handleMolSelectLogic.
 */
export const MOLECULES: MoleculePreset[] = [
  { id: 'methane',   name: 'Methane',        formula: 'CH₄',                   cid: 297     },
  { id: 'ethanol',   name: 'Ethanol',         formula: 'C₂H₆O',            cid: 702     },
  { id: 'benzene',   name: 'Benzene',         formula: 'C₆H₆',             cid: 241     },
  { id: 'acetic',    name: 'Acetic acid',     formula: 'C₂H₄O₂',      cid: 176     },
  { id: 'alanine',   name: 'L-Alanine',       formula: 'C₃H₇NO₂',     cid: 5950    },
  { id: 'vanillin',  name: 'Vanillin',        formula: 'C₈H₈O₃',      cid: 1183    },
  { id: 'caffeine',  name: 'Caffeine',        formula: 'C₈H₁₀N₄O₂', cid: 2519 },
  { id: 'nicotine',  name: '(S)-Nicotine',    formula: 'C₁₀H₁₄N₂',  cid: 89594 },
  { id: 'melatonin', name: 'Melatonin',       formula: 'C₁₃H₁₆N₂O₂', cid: 896 },
  { id: 'naloxone',  name: 'Naloxone',        formula: 'C₁₉H₂₁NO₄',  cid: 5284596 },
];
