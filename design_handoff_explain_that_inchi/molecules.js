// Molecule data with canonical InChI numbering.
// `canonical` on each atom = its index in the InChI canonical numbering (1-based).
// `ketcher`   on each atom = its index in the editor's draw order (1-based).
//   By default we auto-assign ketcher = array position + 1 (i.e., the order the
//   user would have laid them down) and let the InChI canonicaliser permute it.
// Bonds reference atom *array index*, not canonical number.

const MOLECULES = [
  {
    id: "methane",
    name: "Methane",
    formula: "CH\u2084",
    inchi: "InChI=1S/CH4/h1H4",
    note: "The smallest organic molecule. Only formula + hydrogen layers needed.",
    atoms: [
      { el: "C", x: 200, y: 155, canonical: 1, h: 4 },
    ],
    bonds: [],
  },

  {
    id: "ethanol",
    name: "Ethanol",
    formula: "C\u2082H\u2086O",
    inchi: "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3",
    note: "A short chain. Watch the connection layer trace C\u2013C\u2013O.",
    atoms: [
      { el: "C", x: 140, y: 175, canonical: 1, h: 3 },
      { el: "C", x: 200, y: 140, canonical: 2, h: 2 },
      { el: "O", x: 260, y: 175, canonical: 3, h: 1 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
    ],
  },

  {
    id: "benzene",
    name: "Benzene",
    formula: "C\u2086H\u2086",
    inchi: "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H",
    note: "Aromatic ring. The connection layer closes back on atom 1 \u2014 a cycle.",
    atoms: [
      { el: "C", x: 200, y:  95, canonical: 1, h: 1 },
      { el: "C", x: 254, y: 125, canonical: 2, h: 1 },
      { el: "C", x: 254, y: 187, canonical: 4, h: 1 },
      { el: "C", x: 200, y: 217, canonical: 6, h: 1 },
      { el: "C", x: 146, y: 187, canonical: 5, h: 1 },
      { el: "C", x: 146, y: 125, canonical: 3, h: 1 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 2 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 0, order: 1 },
    ],
  },

  {
    id: "acetic",
    name: "Acetic acid",
    formula: "C\u2082H\u2084O\u2082",
    inchi: "InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)",
    note: "The (H,3,4) is a mobile proton \u2014 it can sit on either O\u2083 or O\u2084.",
    atoms: [
      { el: "C", x: 145, y: 175, canonical: 1, h: 3 },     // CH3
      { el: "C", x: 205, y: 140, canonical: 2, h: 0 },     // C=O carbon
      { el: "O", x: 205, y:  82, canonical: 3, h: 0, mobile: true }, // =O
      { el: "O", x: 265, y: 175, canonical: 4, h: 1, mobile: true }, // -OH
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 2 },
      { a: 1, b: 3, order: 1 },
    ],
  },

  {
    id: "alanine",
    name: "L-Alanine",
    formula: "C\u2083H\u2087NO\u2082",
    inchi: "InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1",
    note: "Has a stereocenter \u2014 the t/m/s layers fix its absolute configuration as L (S).",
    atoms: [
      { el: "C", x: 145, y: 195, canonical: 1, h: 3 },                  // CH3
      { el: "C", x: 200, y: 165, canonical: 2, h: 1, stereo: true },    // alpha-C (stereocenter)
      { el: "C", x: 255, y: 195, canonical: 3, h: 0 },                  // COOH carbon
      { el: "N", x: 200, y: 105, canonical: 4, h: 2 },                  // NH2
      { el: "O", x: 310, y: 165, canonical: 5, h: 0, mobile: true },    // =O
      { el: "O", x: 255, y: 255, canonical: 6, h: 1, mobile: true },    // -OH
    ],
    bonds: [
      { a: 0, b: 1, order: 1, wedge: "up" }, // CH3 toward viewer
      { a: 1, b: 2, order: 1 },
      { a: 1, b: 3, order: 1 },
      { a: 2, b: 4, order: 2 },
      { a: 2, b: 5, order: 1 },
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: "vanillin",
    name: "Vanillin",
    formula: "C\u2088H\u2088O\u2083",
    inchi: "InChI=1S/C8H8O3/c1-11-8-4-6(5-9)2-3-7(8)10/h2-5,10H,1H3",
    note: "An aromatic aldehyde \u2014 the c-layer wraps the benzene ring and dangles a CHO branch.",
    atoms: [
      { el: "C", x: 175,  y: 55,  canonical: 1,  h: 3 },   // OMe methyl
      { el: "C", x: 200,  y: 200, canonical: 2,  h: 1 },   // ring CH
      { el: "C", x: 165,  y: 180, canonical: 3,  h: 1 },   // ring CH
      { el: "C", x: 235,  y: 140, canonical: 4,  h: 1 },   // ring CH
      { el: "C", x: 275,  y: 200, canonical: 5,  h: 1 },   // aldehyde C
      { el: "C", x: 235,  y: 180, canonical: 6,  h: 0 },   // ring C bearing CHO
      { el: "C", x: 165,  y: 140, canonical: 7,  h: 0 },   // ring C bearing OH
      { el: "C", x: 200,  y: 120, canonical: 8,  h: 0 },   // ring C bearing OMe
      { el: "O", x: 275,  y: 245, canonical: 9,  h: 0 },   // =O
      { el: "O", x: 130,  y: 120, canonical: 10, h: 1 },   // -OH
      { el: "O", x: 200,  y: 80,  canonical: 11, h: 0 },   // OMe O
    ],
    bonds: [
      { a: 0, b: 10, order: 1 },          // CH3-O
      { a: 10, b: 7, order: 1 },          // O-C8 (ring)
      { a: 7, b: 3, order: 2 },           // 8-4 double (Kekulé)
      { a: 3, b: 5, order: 1 },           // 4-6
      { a: 5, b: 1, order: 2 },           // 6-2 double
      { a: 1, b: 2, order: 1 },           // 2-3
      { a: 2, b: 6, order: 2 },           // 3-7 double
      { a: 6, b: 7, order: 1 },           // 7-8 closes ring
      { a: 5, b: 4, order: 1 },           // 6-5 (CHO branch)
      { a: 4, b: 8, order: 2 },           // 5=O9
      { a: 6, b: 9, order: 1 },           // 7-OH
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: "caffeine",
    name: "Caffeine",
    formula: "C\u2088H\u2081\u2080N\u2084O\u2082",
    inchi: "InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3",
    note: "Fused 5+6 ring system. The connection layer threads through both rings in one trace.",
    atoms: [
      { el: "C", x: 130,  y: 75,  canonical: 1,  h: 3 },   // N-CH3 (on N10)
      { el: "C", x: 235,  y: 240, canonical: 2,  h: 3 },   // N-CH3 (on N11)
      { el: "C", x: 320,  y: 105, canonical: 3,  h: 3 },   // N-CH3 (on N12)
      { el: "C", x: 145,  y: 150, canonical: 4,  h: 1 },   // imidazole CH
      { el: "C", x: 200,  y: 130, canonical: 5,  h: 0 },   // fusion C
      { el: "C", x: 200,  y: 175, canonical: 6,  h: 0 },   // fusion C
      { el: "C", x: 240,  y: 105, canonical: 7,  h: 0 },   // carbonyl C
      { el: "C", x: 275,  y: 175, canonical: 8,  h: 0 },   // carbonyl C
      { el: "N", x: 175,  y: 195, canonical: 9,  h: 0 },   // imidazole N
      { el: "N", x: 170,  y: 110, canonical: 10, h: 0 },   // methylated N
      { el: "N", x: 240,  y: 195, canonical: 11, h: 0 },   // methylated N
      { el: "N", x: 285,  y: 130, canonical: 12, h: 0 },   // methylated N
      { el: "O", x: 240,  y: 65,  canonical: 13, h: 0 },   // =O
      { el: "O", x: 320,  y: 195, canonical: 14, h: 0 },   // =O
    ],
    bonds: [
      { a: 0, b: 9,  order: 1 },  // 1-10
      { a: 9, b: 3,  order: 1 },  // 10-4
      { a: 3, b: 8,  order: 2 },  // 4=9
      { a: 8, b: 5,  order: 1 },  // 9-6
      { a: 5, b: 4,  order: 2 },  // 6=5 fusion
      { a: 4, b: 9,  order: 1 },  // 5-10 closes 5-ring
      { a: 4, b: 6,  order: 1 },  // 5-7
      { a: 6, b: 12, order: 2 },  // 7=13
      { a: 6, b: 11, order: 1 },  // 7-12
      { a: 11, b: 2, order: 1 },  // 12-3
      { a: 11, b: 7, order: 1 },  // 12-8
      { a: 7, b: 13, order: 2 },  // 8=14
      { a: 7, b: 10, order: 1 },  // 8-11
      { a: 10, b: 5, order: 1 },  // 11-6 closes 6-ring
      { a: 10, b: 1, order: 1 },  // 11-2
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: "nicotine",
    name: "(S)-Nicotine",
    formula: "C\u2081\u2080H\u2081\u2084N\u2082",
    inchi: "InChI=1S/C10H14N2/c1-12-7-3-5-10(12)9-4-2-6-11-8-9/h2,4,6,8,10H,3,5,7H2,1H3/t10-/m0/s1",
    note: "Pyrrolidine joined to pyridine via a single stereocenter \u2014 atom 10 fixes the (S) configuration.",
    atoms: [
      { el: "C", x: 110,  y: 75,  canonical: 1,  h: 3 },   // N-CH3
      { el: "C", x: 285,  y: 130, canonical: 2,  h: 1 },   // pyridine CH
      { el: "C", x:  90,  y: 215, canonical: 3,  h: 2 },   // pyrrolidine CH2
      { el: "C", x: 250,  y: 115, canonical: 4,  h: 1 },   // pyridine CH
      { el: "C", x: 145,  y: 220, canonical: 5,  h: 2 },   // pyrrolidine CH2
      { el: "C", x: 315,  y: 165, canonical: 6,  h: 1 },   // pyridine CH
      { el: "C", x:  85,  y: 155, canonical: 7,  h: 2 },   // pyrrolidine CH2
      { el: "C", x: 250,  y: 215, canonical: 8,  h: 1 },   // pyridine CH
      { el: "C", x: 215,  y: 165, canonical: 9,  h: 0 },   // pyridine C (bears nicotine)
      { el: "C", x: 165,  y: 150, canonical: 10, h: 1, stereo: true }, // stereocenter
      { el: "N", x: 285,  y: 200, canonical: 11, h: 0 },   // pyridine N
      { el: "N", x: 125,  y: 120, canonical: 12, h: 0 },   // pyrrolidine N
    ],
    bonds: [
      { a: 0, b: 11, order: 1 },  // 1-12
      { a: 11, b: 6, order: 1 },  // 12-7
      { a: 6, b: 2,  order: 1 },  // 7-3
      { a: 2, b: 4,  order: 1 },  // 3-5
      { a: 4, b: 9,  order: 1 },  // 5-10
      { a: 9, b: 11, order: 1 },  // 10-12 closes pyrrolidine
      { a: 9, b: 8,  order: 1, wedge: "up" },  // 10-9 (stereo wedge)
      { a: 8, b: 3,  order: 2 },  // 9=4
      { a: 3, b: 1,  order: 1 },  // 4-2
      { a: 1, b: 5,  order: 2 },  // 2=6
      { a: 5, b: 10, order: 1 },  // 6-11
      { a: 10, b: 7, order: 2 },  // 11=8
      { a: 7, b: 8,  order: 1 },  // 8-9 closes pyridine
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: "melatonin",
    name: "Melatonin",
    formula: "C\u2081\u2083H\u2081\u2086N\u2082O\u2082",
    inchi: "InChI=1S/C13H16N2O2/c1-9(16)14-7-6-10-8-15-13-5-3-4-12(17-2)11(13)10/h3-5,8,15H,6-7H2,1-2H3,(H,14,16)",
    note: "Indole core (5- and 6-ring fused) plus an N-acetyl ethyl tail and a methoxy. Mobile H on the amide.",
    atoms: [
      { el: "C", x:  40, y: 115, canonical: 1,  h: 3 },   // acetyl CH3
      { el: "C", x: 305, y:  70, canonical: 2,  h: 3 },   // methoxy CH3
      { el: "C", x: 285, y: 200, canonical: 3,  h: 1 },   // benzene CH
      { el: "C", x: 290, y: 150, canonical: 4,  h: 1 },   // benzene CH
      { el: "C", x: 250, y: 220, canonical: 5,  h: 1 },   // benzene CH
      { el: "C", x: 150, y: 110, canonical: 6,  h: 2 },   // CH2
      { el: "C", x: 120, y:  90, canonical: 7,  h: 2 },   // CH2
      { el: "C", x: 165, y: 200, canonical: 8,  h: 1 },   // indole C2
      { el: "C", x:  75, y:  95, canonical: 9,  h: 0 },   // acetyl C
      { el: "C", x: 185, y: 140, canonical: 10, h: 0 },   // indole C3 (bears CH2)
      { el: "C", x: 220, y: 155, canonical: 11, h: 0 },   // indole C3a (fusion)
      { el: "C", x: 255, y: 145, canonical: 12, h: 0 },   // benzene C-OMe
      { el: "C", x: 215, y: 200, canonical: 13, h: 0 },   // indole C7a (fusion)
      { el: "N", x: 100, y: 110, canonical: 14, h: 1 },   // amide N (mobile H)
      { el: "N", x: 190, y: 225, canonical: 15, h: 1 },   // indole NH
      { el: "O", x:  75, y:  55, canonical: 16, h: 0 },   // =O (mobile partner)
      { el: "O", x: 275, y: 105, canonical: 17, h: 0 },   // methoxy O
    ],
    bonds: [
      { a: 0, b: 8,  order: 1 },           // 1-9
      { a: 8, b: 15, order: 2 },           // 9=16
      { a: 8, b: 13, order: 1 },           // 9-14
      { a: 13, b: 6, order: 1 },           // 14-7
      { a: 6, b: 5,  order: 1 },           // 7-6
      { a: 5, b: 9,  order: 1 },           // 6-10
      { a: 9, b: 7,  order: 2 },           // 10=8 (pyrrole C2=C3)
      { a: 7, b: 14, order: 1 },           // 8-15
      { a: 14, b: 12, order: 1 },          // 15-13
      { a: 12, b: 4,  order: 2 },          // 13=5 (benzene)
      { a: 4, b: 2,  order: 1 },           // 5-3
      { a: 2, b: 3,  order: 2 },           // 3=4
      { a: 3, b: 11, order: 1 },           // 4-12
      { a: 11, b: 16, order: 1 },          // 12-17
      { a: 16, b: 1, order: 1 },           // 17-2
      { a: 11, b: 10, order: 2 },          // 12=11 (benzene)
      { a: 10, b: 12, order: 1 },          // 11-13 (fusion)
      { a: 10, b: 9,  order: 1 },          // 11-10 closes pyrrole
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: "naloxone",
    name: "Naloxone",
    formula: "C\u2081\u2089H\u2082\u2081NO\u2084",
    inchi: "InChI=1S/C19H21NO4/c1-2-9-20-8-7-18-15-11-3-4-12(21)16(15)24-17(18)13(22)5-6-19(18,23)14(20)10-11/h2-4,11,14,17,21,23H,1,5-10H2/t14-,17+,18+,19-/m1/s1",
    note: "Morphinan opioid antagonist. Five fused rings and four stereocenters \u2014 the t/m/s layers are large.",
    atoms: [
      { el: "C", x:  30, y: 290, canonical: 1,  h: 2 },   // =CH2
      { el: "C", x:  65, y: 305, canonical: 2,  h: 1 },   // =CH
      { el: "C", x:  90, y: 100, canonical: 3,  h: 1 },   // aromatic CH
      { el: "C", x:  65, y:  70, canonical: 4,  h: 1 },   // aromatic CH
      { el: "C", x: 290, y: 245, canonical: 5,  h: 2 },   // CH2
      { el: "C", x: 260, y: 275, canonical: 6,  h: 2 },   // CH2
      { el: "C", x: 205, y: 290, canonical: 7,  h: 2 },   // CH2
      { el: "C", x: 165, y: 290, canonical: 8,  h: 2 },   // CH2
      { el: "C", x: 100, y: 285, canonical: 9,  h: 2 },   // CH2 (allyl-N)
      { el: "C", x: 135, y: 200, canonical: 10, h: 2 },   // CH2
      { el: "C", x: 115, y: 170, canonical: 11, h: 1 },   // CH
      { el: "C", x: 100, y:  85, canonical: 12, h: 0 },   // aromatic C-OH
      { el: "C", x: 285, y: 195, canonical: 13, h: 0 },   // ketone C
      { el: "C", x: 175, y: 245, canonical: 14, h: 1, stereo: true }, // stereo CH
      { el: "C", x: 150, y: 140, canonical: 15, h: 0 },   // fusion
      { el: "C", x: 150, y:  95, canonical: 16, h: 0 },   // aromatic
      { el: "C", x: 220, y: 145, canonical: 17, h: 1, stereo: true }, // stereo CH-O
      { el: "C", x: 215, y: 200, canonical: 18, h: 0, stereo: true }, // quaternary stereo
      { el: "C", x: 230, y: 250, canonical: 19, h: 0, stereo: true }, // stereo C-OH
      { el: "N", x: 125, y: 240, canonical: 20, h: 0 },   // N
      { el: "O", x:  70, y:  45, canonical: 21, h: 1 },   // phenol OH
      { el: "O", x: 315, y: 180, canonical: 22, h: 0 },   // =O
      { el: "O", x: 265, y: 285, canonical: 23, h: 1 },   // tertiary OH
      { el: "O", x: 195, y: 120, canonical: 24, h: 0 },   // ether O
    ],
    bonds: [
      { a: 0,  b: 1,  order: 2 }, // 1=2 (allyl)
      { a: 1,  b: 8,  order: 1 }, // 2-9
      { a: 8,  b: 19, order: 1 }, // 9-20
      { a: 19, b: 7,  order: 1 }, // 20-8
      { a: 7,  b: 6,  order: 1 }, // 8-7
      { a: 6,  b: 17, order: 1 }, // 7-18
      { a: 17, b: 14, order: 1 }, // 18-15
      { a: 14, b: 10, order: 1 }, // 15-11
      { a: 10, b: 2,  order: 1 }, // 11-3
      { a: 2,  b: 3,  order: 2 }, // 3=4
      { a: 3,  b: 11, order: 1 }, // 4-12
      { a: 11, b: 20, order: 1 }, // 12-21 (OH)
      { a: 11, b: 15, order: 2 }, // 12=16
      { a: 15, b: 14, order: 1 }, // 16-15
      { a: 15, b: 23, order: 1 }, // 16-24 (ether)
      { a: 23, b: 16, order: 1 }, // 24-17
      { a: 16, b: 17, order: 1 }, // 17-18
      { a: 16, b: 12, order: 1 }, // 17-13
      { a: 12, b: 21, order: 2 }, // 13=22 (C=O)
      { a: 12, b: 4,  order: 1 }, // 13-5
      { a: 4,  b: 5,  order: 1 }, // 5-6
      { a: 5,  b: 18, order: 1 }, // 6-19
      { a: 18, b: 17, order: 1 }, // 19-18
      { a: 18, b: 22, order: 1 }, // 19-23 (OH)
      { a: 18, b: 13, order: 1 }, // 19-14
      { a: 13, b: 19, order: 1 }, // 14-20
      { a: 13, b: 9,  order: 1 }, // 14-10
      { a: 9,  b: 10, order: 1 }, // 10-11
    ],
  },
];

// --- InChI string parser ---------------------------------------------------
// Splits "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H" into typed layer chunks.
function parseInchi(s) {
  const body = s.slice("InChI=".length);
  const parts = body.split("/");
  const layers = [];
  layers.push({ type: "version", prefix: "", text: parts[0] });
  if (parts[1]) layers.push({ type: "formula", prefix: "", text: parts[1] });
  for (let i = 2; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const prefix = p[0];
    layers.push({ type: prefix, prefix, text: p.slice(1) });
  }
  return layers;
}

// --- Helpers for the connection-layer parser ------------------------------
// "1-2(4)3(5)6"  ->  [[1,2],[2,4],[2,3],[3,5],[3,6]]
function parseConnectionBonds(text) {
  const bonds = [];
  const stack = [];
  let i = 0;
  let last = null;
  while (i < text.length) {
    const c = text[i];
    if (c === "(") { stack.push(last); i++; }
    else if (c === ")") { last = stack.pop(); i++; }
    else if (c === "-") { i++; }
    else if (c === ",") {
      // Comma inside a branch: next atom bonds to the branch root, not the
      // previous atom. e.g. "19(18,23)" => 19-18 AND 19-23, not 18-23.
      if (stack.length) last = stack[stack.length - 1];
      i++;
    }
    else if (/\d/.test(c)) {
      let j = i;
      while (j < text.length && /\d/.test(text[j])) j++;
      const n = parseInt(text.slice(i, j), 10);
      if (last != null) bonds.push([last, n]);
      last = n;
      i = j;
    } else { i++; }
  }
  return bonds;
}

// "1H3,2H2" or "1-6H" or "2-4,11,14,17,21,23H,1,5-10H2" -> {canonicalNum: hCount}
// Groups of atoms share one terminal "Hn" qualifier; commas may chain them
// across what looks like multiple tokens.
function parseHydrogenAtoms(text) {
  const out = {};
  // Strip parenthesised mobile-H groups: (H,3,4)
  const cleaned = text.replace(/\([^)]*\)/g, "");
  // Match runs of digits/commas/dashes followed by "Hn?", up to the next
  // comma or end of string.
  const re = /([\d,\-]+)H(\d*)(?=,|$)/g;
  let m;
  while ((m = re.exec(cleaned))) {
    const count = m[2] ? parseInt(m[2], 10) : 1;
    for (const range of m[1].split(",")) {
      if (!range) continue;
      if (range.includes("-")) {
        const [a, b] = range.split("-").map(n => parseInt(n, 10));
        for (let k = a; k <= b; k++) out[k] = count;
      } else {
        out[parseInt(range, 10)] = count;
      }
    }
  }
  return out;
}

// "(H,3,4)" -> [3,4]  (atoms involved in mobile-H group)
function parseMobileHydrogens(text) {
  const groups = [];
  const re = /\(H\d*,([^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    groups.push(m[1].split(",").map(n => parseInt(n, 10)));
  }
  return groups.flat();
}

// "2-" or "2-,5+" -> [2, 5]   stereocenter atom numbers
function parseStereoAtoms(text) {
  const nums = [];
  for (const m of text.matchAll(/(\d+)[\-+]/g)) nums.push(parseInt(m[1], 10));
  return nums;
}

Object.assign(window, {
  MOLECULES,
  parseInchi,
  parseConnectionBonds,
  parseHydrogenAtoms,
  parseMobileHydrogens,
  parseStereoAtoms,
});
