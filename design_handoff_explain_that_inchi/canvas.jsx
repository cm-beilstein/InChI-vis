// Molecule SVG renderer.
// Props:
//   mol            - molecule object from MOLECULES
//   highlightedLayer - { type, text } | null
//   showNums       - bool: render canonical atom numbers
//
// Highlight rules per layer type:
//   formula  -> halo all atoms (composition)
//   c        -> tint bonds described by connection text + atom numbers
//   h        -> show implicit H labels next to atoms
//   t/m/s/b  -> halo stereo atoms, color wedge bonds
//   q/p/i    -> no canvas highlight (no spatial meaning here)

function MoleculeCanvas({ mol, highlightedLayer, subHover, hoveredAtom, setHoveredAtom }) {
  const layer = highlightedLayer;
  const layerType = layer?.type;

  // ----- Sub-hover handling -------------------------------------------------
  // When the user is pointing at a specific sub-token of a layer (e.g. one
  // atom number in the c-layer, or one parity marker in the t-layer), we
  // override the layer-wide highlight with a more targeted one.
  const subHaloFor = React.useCallback((atom) => {
    if (!subHover) return null;
    switch (subHover.kind) {
      case "element":
        return atom.el === subHover.el ? elementColor(atom.el) : null;
      case "atom":
        return atom.canonical === subHover.canonical ? "var(--c-conn)" : null;
      case "stereo":
        return atom.canonical === subHover.atom ? parityColor(subHover.sign) : null;
      case "hAtoms":
        return subHover.atoms.includes(atom.canonical) ? hydroColor(subHover.count) : null;
      case "mobileH":
        return subHover.atoms.includes(atom.canonical) ? "var(--c-hydro-mobile)" : null;
      default:
        return null;
    }
  }, [subHover]);
  const subHoverHCount = (atom) => {
    if (!subHover) return null;
    if (subHover.kind === "hAtoms" && subHover.atoms.includes(atom.canonical))
      return subHover.count;
    if (subHover.kind === "mobileH" && subHover.atoms.includes(atom.canonical))
      return "mobile";
    return null;
  };

  // ----- Layer-wide highlight maps ------------------------------------------
  // Which bonds are highlighted by the connection layer?
  const connBondSet = React.useMemo(() => {
    if (layerType !== "c") return null;
    const pairs = parseConnectionBonds(layer.text);
    const s = new Set();
    for (const [a, b] of pairs) s.add(canonPairKey(a, b));
    return s;
  }, [layer, layerType]);

  // Atom-level hydrogen counts (for h-layer display)
  const hMap = React.useMemo(() => {
    if (layerType !== "h") return null;
    return parseHydrogenAtoms(layer.text);
  }, [layer, layerType]);

  const mobileSet = React.useMemo(() => {
    if (layerType !== "h") return null;
    return new Set(parseMobileHydrogens(layer.text));
  }, [layer, layerType]);

  const stereoSet = React.useMemo(() => {
    if (!layerType || !"tms".includes(layerType)) return null;
    if (layerType === "t") return new Set(parseStereoAtoms(layer.text));
    const set = new Set();
    for (const a of mol.atoms) if (a.stereo) set.add(a.canonical);
    return set;
  }, [layer, layerType, mol]);

  const parityMap = React.useMemo(() => {
    if (layerType !== "t") return null;
    return parseStereoParities(layer.text);
  }, [layer, layerType]);

  const showFormulaHalo = layerType === "formula";
  const showCanonical = layerType === "c";
  const hideAllNums =
    layerType && layerType !== "c" && layerType !== "version";

  return (
    <svg
      className={"molecule" + (hideAllNums ? " hide-nums" : "")}
      viewBox="0 0 400 320"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Atom halos (under bonds) */}
      {mol.atoms.map((atom, i) => {
        let haloColor = null;
        let strong = false;

        if (subHover) {
          // Sub-hover mode: ONLY light up atoms matched by the sub-token.
          // Everything else stays unhaloed.
          const sub = subHaloFor(atom);
          if (sub) { haloColor = sub; strong = true; }
        } else if (showFormulaHalo) {
          haloColor = elementColor(atom.el);
        } else if (hMap && hMap[atom.canonical] != null) {
          haloColor = hydroColor(hMap[atom.canonical]);
        } else if (mobileSet && mobileSet.has(atom.canonical)) {
          haloColor = "var(--c-hydro-mobile)";
        } else if (parityMap && parityMap[atom.canonical]) {
          haloColor = parityColor(parityMap[atom.canonical]);
          strong = true;
        } else if (stereoSet && stereoSet.has(atom.canonical)) {
          haloColor = "var(--c-stereo)";
          strong = true;
        }

        if (!haloColor) return null;
        return (
          <circle
            key={"halo-" + i}
            className={"atom-halo " + (strong ? "on-strong" : "on")}
            style={{ "--halo-color": haloColor }}
            cx={atom.x}
            cy={atom.y}
            r="18"
          />
        );
      })}

      {/* Bonds */}
      {mol.bonds.map((b, i) => {
        const a1 = mol.atoms[b.a];
        const a2 = mol.atoms[b.b];
        const key = canonPairKey(a1.canonical, a2.canonical);
        // When sub-hovering a c-layer atom, ONLY light up its incident bonds.
        // Otherwise, fall back to the layer-wide connection set.
        let highlighted;
        if (subHover) {
          highlighted =
            subHover.kind === "atom" &&
            (a1.canonical === subHover.canonical ||
              a2.canonical === subHover.canonical);
        } else {
          highlighted = !!(connBondSet && connBondSet.has(key));
        }
        const stereoBond =
          !subHover &&
          layerType && "tms".includes(layerType) &&
          (stereoSet?.has(a1.canonical) || stereoSet?.has(a2.canonical)) &&
          b.wedge;
        return (
          <BondShape
            key={"bond-" + i}
            a1={a1}
            a2={a2}
            order={b.order}
            wedge={b.wedge}
            highlighted={highlighted}
            stereoBond={stereoBond}
          />
        );
      })}

      {/* Atoms (labels) */}
      {mol.atoms.map((atom, i) => {
        const showLabel = atom.el !== "C" || mol.atoms.length === 1;
        return (
          <g key={"atom-" + i}>
            {showLabel && (
              <>
                <circle
                  className="atom-bg"
                  cx={atom.x}
                  cy={atom.y}
                  r="11"
                />
                <text className="atom-label" x={atom.x} y={atom.y}>
                  {atom.el}
                </text>
              </>
            )}
            {/* Atom-number badge — Ketcher # by default, canonical # on c-hover */}
            <text
              className={
                "atom-num " +
                (showCanonical ? "canonical-num" : "ketcher-num")
              }
              x={atom.x + (showLabel ? 13 : 11)}
              y={atom.y - 13}
            >
              {showCanonical ? atom.canonical : (atom.ketcher ?? i + 1)}
            </text>
            {/* Implicit-H reveal */}
            {(() => {
              // Sub-hover overrides — only show labels on the targeted atoms.
              if (subHover?.kind === "hAtoms" && subHover.atoms.includes(atom.canonical)) {
                return (
                  <text
                    className="h-label show"
                    style={{ fill: hydroColor(subHover.count) }}
                    x={atom.x}
                    y={atom.y + 20}
                  >
                    H{subHover.count > 1 ? subscript(subHover.count) : ""}
                  </text>
                );
              }
              if (subHover?.kind === "mobileH" && subHover.atoms.includes(atom.canonical)) {
                return (
                  <text
                    className="h-label show"
                    x={atom.x}
                    y={atom.y + 20}
                    style={{ fontStyle: "italic", fill: "var(--c-hydro-mobile)" }}
                  >
                    H?
                  </text>
                );
              }
              // If user is pointing at a non-H sub-token, suppress all H labels
              if (subHover) return null;
              // Layer-wide fallbacks
              if (hMap && hMap[atom.canonical] != null) {
                return (
                  <text
                    className="h-label show"
                    style={{ fill: hydroColor(hMap[atom.canonical]) }}
                    x={atom.x}
                    y={atom.y + 20}
                  >
                    H{hMap[atom.canonical] > 1 ? subscript(hMap[atom.canonical]) : ""}
                  </text>
                );
              }
              if (mobileSet && mobileSet.has(atom.canonical)) {
                return (
                  <text
                    className="h-label show"
                    x={atom.x}
                    y={atom.y + 20}
                    style={{ fontStyle: "italic", fill: "var(--c-hydro-mobile)" }}
                  >
                    H?
                  </text>
                );
              }
              return null;
            })()}
          </g>
        );
      })}
    </svg>
  );
}

function canonPairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// Renders a single bond — single, double, or wedge.
function BondShape({ a1, a2, order, wedge, highlighted, stereoBond }) {
  const cls = "bond" + (highlighted ? " hl hl-conn" : "");

  // Trim endpoints so bonds don't pass through atom labels
  const trim1 = needsTrim(a1) ? 11 : 0;
  const trim2 = needsTrim(a2) ? 11 : 0;
  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const sx = a1.x + ux * trim1;
  const sy = a1.y + uy * trim1;
  const ex = a2.x - ux * trim2;
  const ey = a2.y - uy * trim2;

  if (wedge === "up") {
    // wedge triangle from a1 to a2 (narrow end at a1)
    const px = -uy, py = ux; // perpendicular
    const w = 5;
    const points = [
      `${sx},${sy}`,
      `${ex + px * w},${ey + py * w}`,
      `${ex - px * w},${ey - py * w}`,
    ].join(" ");
    return (
      <polygon
        className={"stereo-wedge" + (stereoBond ? " hl" : "")}
        points={points}
      />
    );
  }

  if (order === 2) {
    // Parallel line offset
    const px = -uy * 4, py = ux * 4;
    // shorten the second line a bit for aesthetic
    const shorten = 0.15;
    const s2x = sx + dx * shorten;
    const s2y = sy + dy * shorten;
    const e2x = ex - dx * shorten;
    const e2y = ey - dy * shorten;
    return (
      <g>
        <line className={cls} x1={sx} y1={sy} x2={ex} y2={ey} />
        <line
          className={cls}
          x1={s2x + px}
          y1={s2y + py}
          x2={e2x + px}
          y2={e2y + py}
        />
      </g>
    );
  }

  return <line className={cls} x1={sx} y1={sy} x2={ex} y2={ey} />;
}

function needsTrim(atom) {
  return atom.el !== "C";
}

window.MoleculeCanvas = MoleculeCanvas;
