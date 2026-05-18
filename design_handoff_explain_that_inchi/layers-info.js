// Per-layer prose: title, what it encodes, why it matters.
const LAYER_INFO = {
  version: {
    title: "Version",
    accent: "var(--c-version)",
    blurb:
      "Identifies the InChI version. '1' is version 1; the trailing 'S' marks the Standard InChI \u2014 the canonical form most databases use.",
    egLabel: "Reads as",
    eg: "version <b>1</b>, <b>S</b>tandard",
  },
  formula: {
    title: "Molecular formula",
    accent: "var(--c-formula)",
    blurb:
      "The Hill-system formula of the heavy atoms (plus total H count). Carbon first, then hydrogen, then the rest alphabetically. This layer answers the question \u201cwhat is in the molecule\u201d before any structure is described.",
    egLabel: "Reads as",
  },
  c: {
    title: "Connection layer",
    accent: "var(--c-conn)",
    blurb:
      "How the heavy atoms are wired together, using canonical atom numbers. Hyphens chain bonds; parentheses open branches. The skeleton, without any hydrogens.",
    egLabel: "Reads as",
  },
  h: {
    title: "Hydrogen layer",
    accent: "var(--c-hydro)",
    blurb:
      "Where the hydrogens live. '1H3' means atom 1 carries three H. Ranges like '1-6H' apply to each atom in the range. Parenthesised groups like '(H,3,4)' are mobile (tautomeric) protons shared between atoms.",
    egLabel: "Reads as",
  },
  q: {
    title: "Net charge",
    accent: "var(--c-charge)",
    blurb:
      "The overall formal charge of the molecule. Absent when the species is neutral.",
    egLabel: "Reads as",
  },
  p: {
    title: "Proton balance",
    accent: "var(--c-proton)",
    blurb:
      "Adjustments to the proton count relative to the neutral form \u2014 used for ionised and zwitterionic species.",
    egLabel: "Reads as",
  },
  b: {
    title: "Double-bond stereo",
    accent: "var(--c-stereo)",
    blurb:
      "Geometry around stereogenic double bonds (E/Z, cis/trans). Each entry names the two atoms defining a double bond and a + or \u2013 sign for its parity.",
    egLabel: "Reads as",
  },
  t: {
    title: "Tetrahedral stereo",
    accent: "var(--c-stereo)",
    blurb:
      "Tetrahedral (sp\u00b3) stereocenters. Each entry is an atom number followed by + or \u2013 \u2014 the parity of the four-substituent arrangement under the canonical ordering.",
    egLabel: "Reads as",
  },
  m: {
    title: "Enantiomer marker",
    accent: "var(--c-stereo)",
    blurb:
      "A single bit (0 or 1) that disambiguates which enantiomer the t-layer parities describe. '1' means the parities are as written; '0' means take the mirror image.",
    egLabel: "Reads as",
  },
  s: {
    title: "Stereo flag",
    accent: "var(--c-stereo)",
    blurb:
      "How the stereo information should be interpreted. '1' = absolute, '2' = relative, '3' = racemic.",
    egLabel: "Reads as",
  },
  i: {
    title: "Isotope layer",
    accent: "var(--c-isotope)",
    blurb:
      "Non-natural isotopic substitutions \u2014 deuterium, ¹³C, and so on. Atoms not mentioned have natural isotopic abundance.",
    egLabel: "Reads as",
  },
};

// Idle / default state shown when nothing is hovered.
const DEFAULT_INFO = {
  title: "Hover any layer",
  blurb:
    "Move your cursor over a coloured chunk of the InChI string above to see what it encodes and watch the structure light up.",
  accent: "var(--ink-faint)",
};

// Human-friendly explanation of a given layer's *text* for the current molecule.
function readingFor(layer, mol) {
  if (!layer || !mol) return "";
  switch (layer.type) {
    case "version":
      return layer.text === "1S"
        ? "version <b>1</b>, <b>S</b>tandard"
        : "version " + layer.text;
    case "formula":
      return formulaReading(layer.text);
    case "c": {
      const bonds = parseConnectionBonds(layer.text);
      if (!bonds.length) return "no heavy-atom bonds";
      const MAX = 10;
      const shown = bonds.slice(0, MAX);
      const out = shown
        .map(([a, b]) => `<b>${atomLabel(mol, a)}</b>\u2013<b>${atomLabel(mol, b)}</b>`)
        .join(" \u00b7 ");
      return bonds.length > MAX
        ? out + ` \u00b7 <span style="color:var(--ink-faint)">+ ${bonds.length - MAX} more</span>`
        : out;
    }
    case "h": {
      const parts = [];
      const re = /([\d,\-]+)H(\d*)(?=,|$)/g;
      const cleaned = layer.text.replace(/\([^)]*\)/g, "");
      let m;
      while ((m = re.exec(cleaned))) {
        const count = m[2] ? parseInt(m[2], 10) : 1;
        for (const range of m[1].split(",")) {
          if (!range) continue;
          if (range.includes("-")) {
            const [a, b] = range.split("-").map(n => parseInt(n, 10));
            for (let k = a; k <= b; k++)
              parts.push(`<b>${atomLabel(mol, k)}</b> bears ${count}H`);
          } else {
            parts.push(
              `<b>${atomLabel(mol, parseInt(range, 10))}</b> bears ${count}H`
            );
          }
        }
      }
      const mob = parseMobileHydrogens(layer.text);
      if (mob.length) {
        parts.push(
          `mobile H shared by ${mob
            .map(n => `<b>${atomLabel(mol, n)}</b>`)
            .join(" / ")}`
        );
      }
      const MAX = 8;
      const shown = parts.slice(0, MAX);
      return parts.length > MAX
        ? shown.join(" \u00b7 ") + ` \u00b7 <span style="color:var(--ink-faint)">+ ${parts.length - MAX} more</span>`
        : shown.join(" \u00b7 ");
    }
    case "t": {
      const nums = parseStereoAtoms(layer.text);
      return nums.length
        ? "stereocenter at " +
            nums.map(n => `<b>${atomLabel(mol, n)}</b>`).join(", ")
        : layer.text;
    }
    case "m":
      return layer.text === "0"
        ? "take the <b>mirror image</b> of the listed parities"
        : "parities as listed";
    case "s":
      return layer.text === "1"
        ? "<b>absolute</b> configuration"
        : layer.text === "2"
        ? "<b>relative</b> configuration"
        : "<b>racemic</b>";
    case "b":
      return "double-bond geometry: <b>" + layer.text + "</b>";
    case "q":
      return "net charge: <b>" + layer.text + "</b>";
    case "p":
      return "proton offset: <b>" + layer.text + "</b>";
    case "i":
      return "isotope: <b>" + layer.text + "</b>";
    default:
      return layer.text;
  }
}

// Find atom by canonical number and return a label like "C\u2082"
function atomLabel(mol, canon) {
  const a = mol.atoms.find(x => x.canonical === canon);
  if (!a) return "#" + canon;
  return a.el + subscript(canon);
}

function subscript(n) {
  const s = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
  return String(n)
    .split("")
    .map(d => s[+d])
    .join("");
}

// "C6H6" -> "<b>6</b> carbons, <b>6</b> hydrogens"
function formulaReading(s) {
  const out = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1]) continue;
    const el = m[1];
    const n = m[2] ? parseInt(m[2], 10) : 1;
    const name = ELEMENT_NAMES[el] || el;
    out.push(`<b>${n}</b> ${name}${n === 1 ? "" : "s"}`);
  }
  return out.join(", ");
}

const ELEMENT_NAMES = {
  H: "hydrogen", C: "carbon", N: "nitrogen", O: "oxygen", S: "sulfur",
  P: "phosphorus", F: "fluorine", Cl: "chlorine", Br: "bromine", I: "iodine",
};

// Map element symbol -> CSS color (var) for canvas halos.
function elementColor(el) {
  const known = ["C","H","N","O","S","P","F","Cl","Br","I"];
  return known.includes(el) ? `var(--c-el-${el})` : "var(--c-formula)";
}

// Map hydrogen count -> shaded color (darker = more H).
function hydroColor(count) {
  if (!count || count < 1) return null;
  return `var(--c-hydro-${Math.min(count, 4)})`;
}

// Parse the t- or b-layer text "2-,5+,18+" -> {2: "-", 5: "+", 18: "+"}
function parseStereoParities(text) {
  const out = {};
  for (const m of text.matchAll(/(\d+)([\-+])/g)) {
    out[parseInt(m[1], 10)] = m[2];
  }
  return out;
}

function parityColor(sign) {
  return sign === "+" ? "var(--c-stereo-plus)" : "var(--c-stereo-minus)";
}

Object.assign(window, {
  LAYER_INFO, DEFAULT_INFO, readingFor, atomLabel, subscript,
  elementColor, hydroColor, parseStereoParities, parityColor,
});
