export interface MoleculePreset {
  id: string;
  name: string;
  formula: string;
  cid: number;
}

/**
 * Preset molecules for the molecule picker panel.
 * CIDs verified against PubChem 2026-06-08 via PUG REST API.
 * Formula uses Unicode subscript characters matching the design handoff.
 * SDF structures are fetched from PubChem at runtime via handleMolSelectLogic.
 */
export const MOLECULES: MoleculePreset[] = [
  // Simple & educational
  { id: 'methane',        name: 'Methane',         formula: 'CH₄',              cid: 297       },
  { id: 'ethanol',        name: 'Ethanol',          formula: 'C₂H₆O',           cid: 702       },
  { id: 'benzene',        name: 'Benzene',          formula: 'C₆H₆',            cid: 241       },
  { id: 'acetic',         name: 'Acetic acid',      formula: 'C₂H₄O₂',         cid: 176       },
  { id: 'alanine',        name: 'L-Alanine',        formula: 'C₃H₇NO₂',        cid: 5950      },
  { id: 'vanillin',       name: 'Vanillin',         formula: 'C₈H₈O₃',         cid: 1183      },
  { id: 'caffeine',       name: 'Caffeine',         formula: 'C₈H₁₀N₄O₂',     cid: 2519      },
  { id: 'nicotine',       name: '(S)-Nicotine',     formula: 'C₁₀H₁₄N₂',      cid: 89594     },
  { id: 'melatonin',      name: 'Melatonin',        formula: 'C₁₃H₁₆N₂O₂',    cid: 896       },
  { id: 'naloxone',       name: 'Naloxone',         formula: 'C₁₉H₂₁NO₄',     cid: 5284596   },
  // Analgesics & anti-inflammatories
  { id: 'aspirin',        name: 'Aspirin',          formula: 'C₉H₈O₄',         cid: 2244      },
  { id: 'ibuprofen',      name: 'Ibuprofen',        formula: 'C₁₃H₁₈O₂',      cid: 3672      },
  { id: 'acetaminophen',  name: 'Acetaminophen',    formula: 'C₈H₉NO₂',        cid: 1983      },
  { id: 'morphine',       name: 'Morphine',         formula: 'C₁₇H₁₉NO₃',     cid: 5288826   },
  // Cardiovascular & metabolic
  { id: 'metformin',      name: 'Metformin',        formula: 'C₄H₁₁N₅',        cid: 4091      },
  { id: 'atorvastatin',   name: 'Atorvastatin',     formula: 'C₃₃H₃₅FN₂O₅',   cid: 60823     },
  { id: 'warfarin',       name: 'Warfarin',         formula: 'C₁₉H₁₆O₄',      cid: 54678486  },
  { id: 'propranolol',    name: 'Propranolol',      formula: 'C₁₆H₂₁NO₂',     cid: 4946      },
  // Antibiotics & antivirals
  { id: 'amoxicillin',    name: 'Amoxicillin',      formula: 'C₁₆H₁₉N₃O₅S',   cid: 33613     },
  { id: 'penicillinG',    name: 'Penicillin G',     formula: 'C₁₆H₁₈N₂O₄S',   cid: 5904      },
  { id: 'ciprofloxacin',  name: 'Ciprofloxacin',    formula: 'C₁₇H₁₈FN₃O₃',   cid: 2764      },
  { id: 'oseltamivir',    name: 'Oseltamivir',      formula: 'C₁₆H₂₈N₂O₄',    cid: 65028     },
  // CNS & psychiatric
  { id: 'fluoxetine',     name: 'Fluoxetine',       formula: 'C₁₇H₁₈F₃NO',    cid: 3386      },
  { id: 'diazepam',       name: 'Diazepam',         formula: 'C₁₆H₁₃ClN₂O',   cid: 3016      },
  { id: 'dopamine',       name: 'Dopamine',         formula: 'C₈H₁₁NO₂',      cid: 681       },
  { id: 'serotonin',      name: 'Serotonin',        formula: 'C₁₀H₁₂N₂O',     cid: 5202      },
  { id: 'epinephrine',    name: 'Epinephrine',      formula: 'C₉H₁₃NO₃',      cid: 5816      },
  // Other notable drugs
  { id: 'sildenafil',     name: 'Sildenafil',       formula: 'C₂₂H₃₀N₆O₄S',   cid: 135398744 },
  { id: 'methotrexate',   name: 'Methotrexate',     formula: 'C₂₀H₂₂N₈O₅',    cid: 126941    },
  { id: 'dexamethasone',  name: 'Dexamethasone',    formula: 'C₂₂H₂₉FO₅',     cid: 5743      },
];
