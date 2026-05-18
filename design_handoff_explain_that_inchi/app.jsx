// Main app — header, Ketcher-style panel, color-coded InChI, explanation.

const { useState, useMemo } = React;

function App() {
  const [molId, setMolId] = useState("benzene");
  const [hoverIdx, setHoverIdx] = useState(null); // index into layers array
  const [subHover, setSubHover] = useState(null); // fine-grained sub-token hover

  const mol = MOLECULES.find(m => m.id === molId) || MOLECULES[0];
  const layers = useMemo(() => parseInchi(mol.inchi), [mol]);
  const hoveredLayer = hoverIdx != null ? layers[hoverIdx] : null;

  return (
    <div className="app">
      <Header />
      <KetcherPanel
        mol={mol}
        onSelect={setMolId}
        molId={molId}
        highlightedLayer={hoveredLayer}
        subHover={subHover}
      />
      <InchiSection
        mol={mol}
        layers={layers}
        hoverIdx={hoverIdx}
        setHoverIdx={setHoverIdx}
        setSubHover={setSubHover}
      />
      <MappingStrip mol={mol} />
      <Explanation mol={mol} layer={hoveredLayer} />
      <Footnote />
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <h1>
        Explain that <em>InChI</em>
      </h1>
      <div className="meta">
        <div>InChI v<b>1.07.3</b> · standard</div>
        <div>Hover any coloured chunk · the structure responds</div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
function KetcherPanel({ mol, onSelect, molId, highlightedLayer, subHover }) {
  return (
    <section>
      <div className="section-label">
        <span>Ketcher · sketch panel</span>
        <span className="hint">Switch molecule on the right · drawing tools shown for context</span>
      </div>
      <div className="ketcher">
        <div className="toolbar">
          <Tool char="✎" active title="Draw bond" />
          <Tool char="C" title="Carbon" />
          <Tool char="O" title="Oxygen" />
          <Tool char="N" title="Nitrogen" />
          <div className="divider" />
          <Tool char="△" title="Ring" />
          <Tool char="=" title="Double bond" />
          <Tool char="⟡" title="Stereo wedge" />
          <div className="divider" />
          <Tool char="⌫" title="Eraser" />
          <Tool char="✕" title="Clear" />
        </div>

        <div className="canvas-wrap">
          <div className="canvas-meta">
            <span className="dot"></span>
            <span><b>{mol.name}</b></span>
            <span>{mol.formula}</span>
            <span>· {mol.atoms.length} heavy atom{mol.atoms.length === 1 ? "" : "s"}</span>
          </div>
          <MoleculeCanvas mol={mol} highlightedLayer={highlightedLayer} subHover={subHover} />
        </div>

        <div className="mol-list">
          <div className="mol-list-header">Examples</div>
          {MOLECULES.map(m => (
            <button
              key={m.id}
              className={"mol-item" + (m.id === molId ? " active" : "")}
              onClick={() => onSelect(m.id)}
            >
              <span className="mol-name">{m.name}</span>
              <span className="mol-formula">{m.formula}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tool({ char, active, title }) {
  return (
    <div className={"tool" + (active ? " active" : "")} title={title}>
      {char}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LayerText dispatches to a colored renderer for the layers that carry
// sub-structure. Each sub-renderer wraps individual tokens in hoverable
// spans, so users can drill into a single atom/bond/parity-marker rather
// than the whole layer at once.
function LayerText({ layer, onSubHover }) {
  switch (layer.type) {
    case "formula": return <FormulaText text={layer.text} onSubHover={onSubHover} />;
    case "c":       return <ConnectionText text={layer.text} onSubHover={onSubHover} />;
    case "t":
    case "b":
      return <ParityText text={layer.text} onSubHover={onSubHover} />;
    case "h":
      return <HLayerText text={layer.text} onSubHover={onSubHover} />;
    default:
      return layer.text;
  }
}

// Hover handler factory — reduces noise at every call-site.
function subHoverProps(onSubHover, hit) {
  return {
    onMouseEnter: () => onSubHover?.(hit),
    onMouseLeave: () => onSubHover?.(null),
  };
}

function FormulaText({ text, onSubHover }) {
  const out = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (!m[1]) break;
    const el = m[1];
    out.push(
      <span
        key={key++}
        className={"el-" + el + " inchi-subtoken"}
        {...subHoverProps(onSubHover, { kind: "element", el })}
      >
        {el}{m[2]}
      </span>
    );
  }
  return out;
}

function ConnectionText({ text, onSubHover }) {
  // Wrap each numeric atom reference. Hyphens, parens and commas stay plain.
  const parts = [];
  let i = 0, key = 0, buf = "";
  const flush = () => {
    if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ""; }
  };
  while (i < text.length) {
    const c = text[i];
    if (/\d/.test(c)) {
      flush();
      let j = i;
      while (j < text.length && /\d/.test(text[j])) j++;
      const n = parseInt(text.slice(i, j), 10);
      parts.push(
        <span
          key={key++}
          className="inchi-subtoken"
          {...subHoverProps(onSubHover, { kind: "atom", canonical: n })}
        >
          {text.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return parts;
}

function ParityText({ text, onSubHover }) {
  const parts = [];
  const re = /(\d+)([\-+])/g;
  let m, key = 0, last = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const atom = parseInt(m[1], 10);
    const sign = m[2];
    parts.push(
      <span
        key={key++}
        className={(sign === "+" ? "parity-plus" : "parity-minus") + " inchi-subtoken"}
        {...subHoverProps(onSubHover, { kind: "stereo", atom, sign })}
      >
        {m[1]}{sign}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts;
}

function HLayerText({ text, onSubHover }) {
  const parts = [];
  let buf = "", i = 0, key = 0;
  const flush = () => {
    if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ""; }
  };
  // "2-4,11" -> [2,3,4,11]
  const expandAtoms = (s) => {
    const out = [];
    for (const range of s.split(",")) {
      if (!range.trim()) continue;
      if (range.includes("-")) {
        const [a, b] = range.split("-").map(n => parseInt(n, 10));
        for (let k = a; k <= b; k++) out.push(k);
      } else {
        out.push(parseInt(range, 10));
      }
    }
    return out;
  };
  while (i < text.length) {
    const c = text[i];
    if (c === "(") {
      flush();
      const end = text.indexOf(")", i);
      if (end < 0) { buf += c; i++; continue; }
      const inside = text.slice(i, end + 1);
      const match = inside.match(/\(H\d*,([^)]+)\)/);
      const atoms = match ? expandAtoms(match[1]) : [];
      parts.push(
        <span
          key={key++}
          className="hydro-mobile inchi-subtoken"
          {...subHoverProps(onSubHover, { kind: "mobileH", atoms })}
        >
          {inside}
        </span>
      );
      i = end + 1;
      continue;
    }
    if (c === "H") {
      let j = i + 1;
      while (j < text.length && /\d/.test(text[j])) j++;
      const count = j > i + 1 ? parseInt(text.slice(i + 1, j), 10) : 1;
      const atoms = expandAtoms(buf.replace(/^,/, ""));
      parts.push(
        <span
          key={key++}
          className={"hydro-" + Math.min(count, 4) + " inchi-subtoken"}
          {...subHoverProps(onSubHover, { kind: "hAtoms", atoms, count })}
        >
          {buf + text.slice(i, j)}
        </span>
      );
      buf = "";
      i = j;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return parts;
}

// ---------------------------------------------------------------------------
function InchiSection({ mol, layers, hoverIdx, setHoverIdx, setSubHover }) {
  return (
    <section className="inchi-section">
      <div className="section-label">
        <span>InChI · colour-coded layers</span>
        <span className="hint">{mol.note}</span>
      </div>
      <div
        className="inchi-display"
        onMouseLeave={() => { setHoverIdx(null); setSubHover(null); }}
      >
        <span className="inchi-prefix">InChI=</span>
        {layers.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="inchi-slash">/</span>}
            <span
              className={
                "inchi-layer" +
                (hoverIdx === i ? " active" : "") +
                (hoverIdx != null && hoverIdx !== i ? " dim" : "")
              }
              data-layer={l.type}
              onMouseEnter={() => { setHoverIdx(i); setSubHover(null); }}
            >
              {l.prefix && <span className="prefix">{l.prefix}</span>}
              <LayerText layer={l} onSubHover={setSubHover} />
            </span>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Background mapping: every atom in the editor has a draw-order index
// ("Ketcher #"), and InChI assigns a canonical # via Morgan-style symmetry
// analysis. The two often differ — that's the point of this strip.
function MappingStrip({ mol }) {
  const pairs = mol.atoms.map((a, i) => ({
    k: a.ketcher ?? i + 1,
    c: a.canonical,
    el: a.el,
  }));
  // Sort by ketcher index for natural reading order
  pairs.sort((a, b) => a.k - b.k);
  const anyDiverges = pairs.some(p => p.k !== p.c);

  return (
    <div className="mapping" aria-label="Ketcher to InChI atom mapping">
      <span className="mapping-label">
        Ketcher&nbsp;<span style={{ color: "var(--ink-faint)" }}>→</span>&nbsp;InChI
      </span>
      <span className="pairs">
        {pairs.map((p, i) => (
          <span
            key={i}
            className={
              "pair" + (p.k === p.c ? " identity" : " diverges")
            }
            title={`Atom drawn 4th in Ketcher would be canonical #${p.c} in InChI`}
          >
            <span className="k">{p.k}</span>
            <span className="arrow">→</span>
            <span className="c">{p.c}</span>
            <span className="el">{p.el}</span>
          </span>
        ))}
        {!anyDiverges && (
          <span style={{ color: "var(--ink-faint)", fontStyle: "italic", marginLeft: 4 }}>
            (identity — drawing order already matches the canonical numbering)
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Explanation({ mol, layer }) {
  const info = layer ? LAYER_INFO[layer.type] : null;
  const accent = info?.accent || "var(--ink-faint)";

  const reading = layer ? readingFor(layer, mol) : "";

  return (
    <div className="explain">
      <div
        className={"card" + (layer ? " active" : "")}
        style={{ "--accent": accent }}
      >
        {!layer && (
          <>
            <div className="layer-tag">
              <span className="swatch" />
              Idle
            </div>
            <h3 className="layer-title">{DEFAULT_INFO.title}</h3>
            <p className="layer-body">{DEFAULT_INFO.blurb}</p>
          </>
        )}
        {layer && (
          <>
            <div className="layer-tag">
              <span className="swatch" />
              {layer.prefix ? `${layer.prefix}-layer` : layer.type + "-layer"}
            </div>
            <h3 className="layer-title">{info.title}</h3>
            <p className="layer-body">{info.blurb}</p>
            <div className="layer-eg">
              <span className="lbl">{info.egLabel}</span>
              <span
                dangerouslySetInnerHTML={{
                  __html: reading || info.eg || layer.text,
                }}
              />
            </div>
          </>
        )}
      </div>

      <Legend mol={mol} activeType={layer?.type} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function Legend({ mol, activeType }) {
  const layerTypes = useMemo(() => {
    const set = new Set();
    for (const l of parseInchi(mol.inchi)) set.add(l.type);
    return set;
  }, [mol]);

  const allLayers = [
    { type: "version", key: "1S",  name: "Version",        desc: "Which InChI specification",   eg: "1S" },
    { type: "formula", key: "Hill",name: "Formula",        desc: "Atoms by element & count",    eg: "C8H10N4O2" },
    { type: "c",       key: "c…",  name: "Connection",     desc: "Heavy-atom skeleton",         eg: "c1-2(4)3-5" },
    { type: "h",       key: "h…",  name: "Hydrogen",       desc: "H count per atom + mobile H", eg: "h2H,1H3,(H,3,4)" },
    { type: "q",       key: "q…",  name: "Charge",         desc: "Net formal charge",           eg: "q+1" },
    { type: "p",       key: "p…",  name: "Proton",         desc: "Proton balance",              eg: "p+1" },
    { type: "b",       key: "b…",  name: "Double-bond stereo", desc: "E/Z geometry",            eg: "b6-9+" },
    { type: "t",       key: "t…",  name: "Tetrahedral",    desc: "sp³ stereocenters",           eg: "t2-,4+" },
    { type: "m",       key: "m…",  name: "Enantiomer",     desc: "Mirror-image flag",           eg: "m0 or m1" },
    { type: "s",       key: "s…",  name: "Stereo flag",    desc: "Absolute / relative / racemic", eg: "s1" },
    { type: "i",       key: "i…",  name: "Isotope",        desc: "Non-natural isotopes",        eg: "i2D,5+1" },
  ];

  return (
    <div className="card legend-card">
      <div className="layer-tag" style={{ padding: "0 22px", marginBottom: 6 }}>
        <span className="swatch" style={{ background: "var(--ink-faint)" }} />
        Layer legend <span style={{ color: "var(--ink-faint)", fontWeight: 400, marginLeft: 4, textTransform: "none", letterSpacing: 0 }}>· hover any row</span>
      </div>
      {allLayers.map(l => {
        const present = layerTypes.has(l.type);
        const isActive = l.type === activeType;
        const color = `var(--c-${swatchVar(l.type)})`;
        const info = LAYER_INFO[l.type];
        return (
          <div
            key={l.type}
            className={"legend-row" + (present ? "" : " muted")}
            style={isActive ? { background: `var(--c-${swatchVar(l.type)}-bg)` } : null}
          >
            <span className="sw" style={{ background: color }} />
            <span className="key" style={{ color: present ? color : undefined }}>
              {l.key}
            </span>
            <span className="name">{l.name}</span>
            <span className="desc">{l.desc}</span>
            <div className="legend-tip" role="tooltip">
              <span className="tip-label">{l.name} layer{!present && " · not present in this molecule"}</span>
              {info?.blurb || l.desc}
              {l.eg && <span className="tip-eg">e.g. &nbsp;{l.eg}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function swatchVar(type) {
  if (type === "c") return "conn";
  if (type === "h") return "hydro";
  if (type === "q") return "charge";
  if (type === "p") return "proton";
  if (type === "i") return "isotope";
  if ("btms".includes(type)) return "stereo";
  return type;
}

// ---------------------------------------------------------------------------
function Footnote() {
  return (
    <div className="footnote">
      <span>
        InChI · IUPAC International Chemical Identifier ·
        an open-standard line notation for chemical structure
      </span>
      <span className="key-hint">
        <kbd>Hover</kbd> a coloured chunk to highlight ·
        <kbd>Click</kbd> a molecule on the right to switch
      </span>
    </div>
  );
}

window.App = App;
