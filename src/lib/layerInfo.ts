// TypeScript port of design_handoff_explain_that_inchi/layers-info.js
// Adapted per D-02/D-03: mol.atoms replaced by atomElements: Record<number, string>
// swatchVar ported from app.jsx lines 464-472.
// parseMobileHydrogens, parseConnectionBonds, parseStereoAtoms imported from parseInchi.ts (D-05).

import type { Layer, LayerType } from './parseInchi';
import { parseMobileHydrogens, parseConnectionBonds, parseStereoAtoms } from './parseInchi';

// ---------------------------------------------------------------------------
// LAYER_INFO — verbatim from layers-info.js lines 1-81
// ---------------------------------------------------------------------------

export interface LayerInfoEntry {
  title: string;
  accent: string;
  blurb: string;
  egLabel: string;
  eg?: string;
}

export const LAYER_INFO: Record<LayerType, LayerInfoEntry> = {
  version: {
    title: 'Version',
    accent: 'var(--c-version)',
    blurb:
      "Identifies the InChI version. '1' is version 1; the trailing 'S' marks the Standard InChI — the canonical form most databases use.",
    egLabel: 'Reads as',
    eg: 'version <b>1</b>, <b>S</b>tandard',
  },
  formula: {
    title: 'Molecular formula',
    accent: 'var(--c-formula)',
    blurb:
      'The Hill-system formula of the heavy atoms (plus total H count). Carbon first, then hydrogen, then the rest alphabetically. This layer answers the question "what is in the molecule" before any structure is described.',
    egLabel: 'Reads as',
  },
  c: {
    title: 'Connection layer',
    accent: 'var(--c-conn)',
    blurb:
      'How the heavy atoms are wired together, using canonical atom numbers. Hyphens chain bonds; parentheses open branches. The skeleton, without any hydrogens.',
    egLabel: 'Reads as',
  },
  h: {
    title: 'Hydrogen layer',
    accent: 'var(--c-hydro)',
    blurb:
      "Where the hydrogens live. '1H3' means atom 1 carries three H. Ranges like '1-6H' apply to each atom in the range. Parenthesised groups like '(H,3,4)' are mobile (tautomeric) protons shared between atoms.",
    egLabel: 'Reads as',
  },
  q: {
    title: 'Net charge',
    accent: 'var(--c-charge)',
    blurb: 'The overall formal charge of the molecule. Absent when the species is neutral.',
    egLabel: 'Reads as',
  },
  p: {
    title: 'Proton balance',
    accent: 'var(--c-proton)',
    blurb:
      'Adjustments to the proton count relative to the neutral form — used for ionised and zwitterionic species.',
    egLabel: 'Reads as',
  },
  b: {
    title: 'Double-bond stereo',
    accent: 'var(--c-stereo)',
    blurb:
      'Geometry around stereogenic double bonds (E/Z, cis/trans). Each entry names the two atoms defining a double bond and a + or – sign for its parity.',
    egLabel: 'Reads as',
  },
  t: {
    title: 'Tetrahedral stereo',
    accent: 'var(--c-stereo)',
    blurb:
      'Tetrahedral (sp³) stereocenters. Each entry is an atom number followed by + or – — the parity of the four-substituent arrangement under the canonical ordering.',
    egLabel: 'Reads as',
  },
  m: {
    title: 'Enantiomer marker',
    accent: 'var(--c-stereo)',
    blurb:
      "A single bit (0 or 1) that disambiguates which enantiomer the t-layer parities describe. '1' means the parities are as written; '0' means take the mirror image.",
    egLabel: 'Reads as',
  },
  s: {
    title: 'Stereo flag',
    accent: 'var(--c-stereo)',
    blurb:
      "How the stereo information should be interpreted. '1' = absolute, '2' = relative, '3' = racemic.",
    egLabel: 'Reads as',
  },
  i: {
    title: 'Isotope layer',
    accent: 'var(--c-isotope)',
    blurb:
      'Non-natural isotopic substitutions — deuterium, ¹³C, and so on. Atoms not mentioned have natural isotopic abundance.',
    egLabel: 'Reads as',
  },
};

// ---------------------------------------------------------------------------
// DEFAULT_INFO — verbatim from layers-info.js lines 83-89
// ---------------------------------------------------------------------------

export const DEFAULT_INFO = {
  title: 'Hover any layer',
  blurb:
    'Move your cursor over a coloured chunk of the InChI string above to see what it encodes and watch the structure light up.',
  accent: 'var(--ink-faint)',
};

// ---------------------------------------------------------------------------
// subscript — verbatim from layers-info.js lines 184-189
// ---------------------------------------------------------------------------

export function subscript(n: number): string {
  const s = '₀₁₂₃₄₅₆₇₈₉';
  return String(n)
    .split('')
    .map(d => s[+d])
    .join('');
}

// ---------------------------------------------------------------------------
// atomLabel — adapted per D-02: mol.atoms replaced by atomElements
// ---------------------------------------------------------------------------

function atomLabel(atomElements: Record<number, string>, canon: number): string {
  const el = atomElements[canon];
  if (!el) return '#' + canon;
  return el + subscript(canon);
}

// ---------------------------------------------------------------------------
// formulaReading — verbatim from layers-info.js lines 193-205
// ---------------------------------------------------------------------------

export function formulaReading(s: string): string {
  const out: string[] = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (!m[1]) continue;
    const el = m[1];
    const n = m[2] ? parseInt(m[2], 10) : 1;
    const name = ELEMENT_NAMES[el] || el;
    out.push(`<b>${n}</b> ${name}${n === 1 ? '' : 's'}`);
  }
  return out.join(', ');
}

// ---------------------------------------------------------------------------
// ELEMENT_NAMES — verbatim from layers-info.js lines 207-210
// ---------------------------------------------------------------------------

export const ELEMENT_NAMES: Record<string, string> = {
  H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', S: 'sulfur',
  P: 'phosphorus', F: 'fluorine', Cl: 'chlorine', Br: 'bromine', I: 'iodine',
};

// ---------------------------------------------------------------------------
// elementColor — verbatim from layers-info.js lines 212-215
// ---------------------------------------------------------------------------

export function elementColor(el: string): string {
  const known = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I'];
  return known.includes(el) ? `var(--c-el-${el})` : 'var(--c-formula)';
}

// ---------------------------------------------------------------------------
// hydroColor — verbatim from layers-info.js lines 218-221
// ---------------------------------------------------------------------------

export function hydroColor(count: number | null | undefined): string | null {
  if (!count || count < 1) return null;
  return `var(--c-hydro-${Math.min(count, 4)})`;
}

// ---------------------------------------------------------------------------
// parseStereoParities — verbatim from layers-info.js lines 224-229
// NOTE: distinct from parseStereoAtoms in parseInchi.ts — returns {atom: parity} not atom[]
// ---------------------------------------------------------------------------

export function parseStereoParities(text: string): Record<number, string> {
  const out: Record<number, string> = {};
  for (const m of text.matchAll(/(\d+)([\-+])/g)) {
    out[parseInt(m[1], 10)] = m[2];
  }
  return out;
}

// ---------------------------------------------------------------------------
// parityColor — verbatim from layers-info.js lines 231-233
// ---------------------------------------------------------------------------

export function parityColor(sign: string): string {
  return sign === '+' ? 'var(--c-stereo-plus)' : 'var(--c-stereo-minus)';
}

// ---------------------------------------------------------------------------
// swatchVar — ported from app.jsx lines 464-472 (not in layers-info.js)
// Maps LayerType to CSS token suffix for color lookup.
// ---------------------------------------------------------------------------

export function swatchVar(type: LayerType): string {
  if (type === 'c') return 'conn';
  if (type === 'h') return 'hydro';
  if (type === 'q') return 'charge';
  if (type === 'p') return 'proton';
  if (type === 'i') return 'isotope';
  if ('btms'.includes(type)) return 'stereo';
  return type; // 'version', 'formula' — use type as-is
}

// ---------------------------------------------------------------------------
// readingFor — adapted per D-02: mol.atoms replaced by atomElements
// Port of layers-info.js lines 92-175
// Uses parseConnectionBonds, parseMobileHydrogens, parseStereoAtoms from parseInchi.ts
// ---------------------------------------------------------------------------

export function readingFor(layer: Layer, atomElements: Record<number, string>): string {
  switch (layer.type) {
    case 'version':
      return layer.text === '1S'
        ? 'version <b>1</b>, <b>S</b>tandard'
        : 'version ' + layer.text;
    case 'formula':
      return formulaReading(layer.text);
    case 'c': {
      const bonds = parseConnectionBonds(layer.text);
      if (!bonds.length) return 'no heavy-atom bonds';
      const MAX = 10;
      const shown = bonds.slice(0, MAX);
      const out = shown
        .map(([a, b]) => `<b>${atomLabel(atomElements, a)}</b>–<b>${atomLabel(atomElements, b)}</b>`)
        .join(' · ');
      return bonds.length > MAX
        ? out + ` · <span style="color:var(--ink-faint)">+ ${bonds.length - MAX} more</span>`
        : out;
    }
    case 'h': {
      const parts: string[] = [];
      const re = /([\d,\-]+)H(\d*)(?=,|$)/g;
      const cleaned = layer.text.replace(/\([^)]*\)/g, '');
      let m: RegExpExecArray | null;
      while ((m = re.exec(cleaned))) {
        const count = m[2] ? parseInt(m[2], 10) : 1;
        for (const range of m[1].split(',')) {
          if (!range) continue;
          if (range.includes('-')) {
            const [a, b] = range.split('-').map(n => parseInt(n, 10));
            for (let k = a; k <= b; k++)
              parts.push(`<b>${atomLabel(atomElements, k)}</b> bears ${count}H`);
          } else {
            parts.push(`<b>${atomLabel(atomElements, parseInt(range, 10))}</b> bears ${count}H`);
          }
        }
      }
      const mob = parseMobileHydrogens(layer.text);
      if (mob.length) {
        parts.push(
          `mobile H shared by ${mob.map(n => `<b>${atomLabel(atomElements, n)}</b>`).join(' / ')}`
        );
      }
      const MAX = 8;
      const shown = parts.slice(0, MAX);
      return parts.length > MAX
        ? shown.join(' · ') + ` · <span style="color:var(--ink-faint)">+ ${parts.length - MAX} more</span>`
        : shown.join(' · ');
    }
    case 't': {
      const nums = parseStereoAtoms(layer.text);
      return nums.length
        ? 'stereocenter at ' + nums.map(n => `<b>${atomLabel(atomElements, n)}</b>`).join(', ')
        : layer.text;
    }
    case 'm':
      return layer.text === '0'
        ? 'take the <b>mirror image</b> of the listed parities'
        : 'parities as listed';
    case 's':
      return layer.text === '1'
        ? '<b>absolute</b> configuration'
        : layer.text === '2'
        ? '<b>relative</b> configuration'
        : '<b>racemic</b>';
    case 'b':
      return 'double-bond geometry: <b>' + layer.text + '</b>';
    case 'q':
      return 'net charge: <b>' + layer.text + '</b>';
    case 'p':
      return 'proton offset: <b>' + layer.text + '</b>';
    case 'i':
      return 'isotope: <b>' + layer.text + '</b>';
    default:
      return layer.text;
  }
}
