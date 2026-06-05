// LayerText — per-layer sub-token renderers.
// Port of design_handoff_explain_that_inchi/app.jsx lines 112-278.
// Key adaptation: no onSubHover prop — calls useInchiStore.getState().setSubHover directly.
// Per D-07 and RESEARCH.md Pitfall 1.

import React from 'react';
import { useInchiStore } from '../store';
import type { Layer, SubHover } from '../lib/parseInchi';
import styles from './InchiSection.module.css';

// Static lookup — avoids dynamic class name construction which breaks CSS Modules.
// Per Pitfall 1 in RESEARCH.md.
const EL_CLASS: Record<string, string> = {
  C: styles.elC, H: styles.elH, N: styles.elN, O: styles.elO,
  S: styles.elS, P: styles.elP, F: styles.elF, Cl: styles.elCl,
  Br: styles.elBr, I: styles.elI,
};

// Hover handler factory — sets subHover in store on enter, clears on leave.
// Per D-07: wired here so Phase 4 can act on store.subHover without adding event handlers.
function subHoverProps(hit: SubHover) {
  return {
    onMouseEnter: () => useInchiStore.getState().setSubHover(hit),
    onMouseLeave: () => useInchiStore.getState().setSubHover(null),
  };
}

// Dispatches to the correct sub-renderer by layer type.
// rawText must be the verbatim slice from the Ketcher InChI string (layer.prefix stripped).
// Callers must source rawText from the raw inchi string — never reconstruct it.
// fragCounts: heavy-atom counts per fragment (from formulaFragmentCounts on the formula layer).
// Required for correct multi-fragment canonical ID offsetting.
export function LayerText({ layer, rawText, fragCounts = [] }: { layer: Layer; rawText: string; fragCounts?: number[] }) {
  switch (layer.type) {
    case 'formula': return <FormulaText text={rawText} />;
    case 'c':       return <ConnectionText text={rawText} fragCounts={fragCounts} />;
    case 't':
    case 'b':       return <ParityText text={rawText} fragCounts={fragCounts} />;
    case 'h':       return <HLayerText text={rawText} fragCounts={fragCounts} />;
    default:        return <>{rawText}</>;
  }
}

// Port of app.jsx FormulaText lines 138-156.
// Uses EL_CLASS lookup (not "el-"+el).
// For N* notation, emits element hovers without fragIndex (highlights all fragments).
// For dot-separated notation, emits fragIndex per fragment so hover is fragment-scoped.
function FormulaText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  let key = 0;

  // N* identical-fragment prefix: hover highlights all fragments — no fragIndex.
  const leadingMult = /^(\d+)(?=[A-Z])/.exec(text);
  if (leadingMult) {
    out.push(<span key={key++}>{leadingMult[1]}</span>);
    let last = leadingMult[1].length;
    while ((m = re.exec(text)) !== null) {
      if (!m[1]) break;
      if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>);
      const el = m[1];
      out.push(
        <span key={key++} className={[EL_CLASS[el] ?? '', styles.inchiSubtoken].filter(Boolean).join(' ')}
          {...subHoverProps({ kind: 'element', el })}>
          {el}{m[2]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
    return <>{out}</>;
  }

  // Dot-separated or single-fragment: emit fragIndex when multiple fragments present.
  const fragments = text.split('.');
  const isMultiFrag = fragments.length > 1;
  fragments.forEach((frag, fi) => {
    if (fi > 0) out.push(<span key={key++}>.</span>);
    re.lastIndex = 0;
    let last = 0;
    while ((m = re.exec(frag)) !== null) {
      if (!m[1]) break;
      if (m.index > last) out.push(<span key={key++}>{frag.slice(last, m.index)}</span>);
      const el = m[1];
      out.push(
        <span key={key++} className={[EL_CLASS[el] ?? '', styles.inchiSubtoken].filter(Boolean).join(' ')}
          {...subHoverProps({ kind: 'element', el, ...(isMultiFrag ? { fragIndex: fi } : {}) })}>
          {el}{m[2]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < frag.length) out.push(<span key={key++}>{frag.slice(last)}</span>);
  });
  return <>{out}</>;
}

// Port of app.jsx ConnectionText lines 158-189.
// Extended for multi-fragment: applies per-fragment canonical offsets for ; notation,
// and emits canonicals arrays for 2* identical-fragment notation.
function ConnectionText({ text, fragCounts }: { text: string; fragCounts: number[] }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const renderSegment = (seg: string, offset: number, canonicalFn?: (n: number) => { canonical: number; canonicals?: number[] }) => {
    let i = 0, buf = '';
    const flush = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
    while (i < seg.length) {
      const c = seg[i];
      if (/\d/.test(c)) {
        flush();
        let j = i;
        while (j < seg.length && /\d/.test(seg[j])) j++;
        const n = parseInt(seg.slice(i, j), 10);
        const hover = canonicalFn ? canonicalFn(n) : { canonical: n + offset };
        parts.push(
          <span key={key++} className={styles.inchiSubtoken} {...subHoverProps({ kind: 'atom', ...hover })}>
            {seg.slice(i, j)}
          </span>
        );
        i = j; continue;
      }
      buf += c; i++;
    }
    flush();
  };

  // 2* identical-fragment notation: hovering atom n highlights that atom in all fragments.
  const multMatch = text.match(/^(\d+)\*([\s\S]*)$/);
  if (multMatch) {
    const n = parseInt(multMatch[1], 10);
    const atomsPerFrag = fragCounts[0] ?? 0;
    parts.push(<span key={key++}>{multMatch[1]}*</span>);
    renderSegment(multMatch[2], 0, (localN) => ({
      canonical: localN,
      canonicals: Array.from({ length: n }, (_, fi) => localN + fi * atomsPerFrag),
    }));
    return <>{parts}</>;
  }

  // ; separated different-fragment notation: offset each fragment's canonical IDs.
  const segments = text.split(';');
  let cumOffset = 0;
  segments.forEach((seg, fi) => {
    if (fi > 0) parts.push(<span key={key++}>;</span>);
    renderSegment(seg, cumOffset);
    cumOffset += fragCounts[fi] ?? 0;
  });
  return <>{parts}</>;
}

// Port of app.jsx ParityText lines 191-212.
// Extended for multi-fragment: applies per-fragment canonical offset for ; notation.
function ParityText({ text, fragCounts }: { text: string; fragCounts: number[] }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const renderSegment = (seg: string, offset: number) => {
    const re = /(\d+)([\-+])/g;
    let m: RegExpExecArray | null;
    let last = 0;
    while ((m = re.exec(seg)) !== null) {
      if (m.index > last) parts.push(<span key={key++}>{seg.slice(last, m.index)}</span>);
      const atom = parseInt(m[1], 10) + offset;
      const sign = m[2];
      parts.push(
        <span
          key={key++}
          className={[(sign === '+' ? styles.parityPlus : styles.parityMinus), styles.inchiSubtoken].join(' ')}
          {...subHoverProps({ kind: 'stereo', atom, sign })}
        >
          {m[1]}{sign}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < seg.length) parts.push(<span key={key++}>{seg.slice(last)}</span>);
  };

  const segments = text.split(';');
  let cumOffset = 0;
  segments.forEach((seg, fi) => {
    if (fi > 0) parts.push(<span key={key++}>;</span>);
    renderSegment(seg, cumOffset);
    cumOffset += fragCounts[fi] ?? 0;
  });
  return <>{parts}</>;
}

// Port of app.jsx HLayerText lines 214-278.
// Extended for multi-fragment: applies per-fragment canonical offset.
function HLayerText({ text, fragCounts }: { text: string; fragCounts: number[] }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Parse atom ranges like "1-6" or "3,5" and apply offset to each result.
  const expandAtoms = (s: string, offset: number): number[] => {
    const out: number[] = [];
    for (const range of s.split(',')) {
      if (!range.trim()) continue;
      if (range.includes('-')) {
        const segs = range.split('-');
        const a = parseInt(segs[0], 10), b = parseInt(segs[1], 10);
        if (!isNaN(a) && !isNaN(b)) for (let k = a; k <= b; k++) out.push(k + offset);
      } else {
        const n = parseInt(range, 10);
        if (!isNaN(n)) out.push(n + offset);
      }
    }
    return out;
  };

  const renderSegment = (seg: string, offset: number) => {
    let buf = '', i = 0;
    const flush = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
    while (i < seg.length) {
      const c = seg[i];
      if (c === '(') {
        flush();
        const end = seg.indexOf(')', i);
        if (end < 0) { buf += c; i++; continue; }
        const inside = seg.slice(i, end + 1);
        const match = inside.match(/\(H\d*,([^)]+)\)/);
        const atoms = match ? expandAtoms(match[1], offset) : [];
        parts.push(
          <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken].join(' ')}
            {...subHoverProps({ kind: 'mobileH', atoms })}
          >{inside}</span>
        );
        i = end + 1; continue;
      }
      if (c === 'H') {
        let j = i + 1;
        while (j < seg.length && /\d/.test(seg[j])) j++;
        const count = j > i + 1 ? parseInt(seg.slice(i + 1, j), 10) : 1;
        const atoms = expandAtoms(buf.replace(/^,/, ''), offset);
        const hydroClass = [(styles as Record<string, string>)[`hydro${Math.min(count, 4)}`], styles.inchiSubtoken].join(' ');
        parts.push(
          <span key={key++} className={hydroClass} {...subHoverProps({ kind: 'hAtoms', atoms, count })}>
            {buf + seg.slice(i, j)}
          </span>
        );
        buf = ''; i = j; continue;
      }
      buf += c; i++;
    }
    flush();
  };

  // 2* identical-fragment notation: atoms from all fragments combined into each hover target.
  const multMatch = text.match(/^(\d+)\*([\s\S]*)$/);
  if (multMatch) {
    const n = parseInt(multMatch[1], 10);
    const pattern = multMatch[2];
    const atomsPerFrag = fragCounts[0] ?? 0;
    parts.push(<span key={key++}>{multMatch[1]}*</span>);
    // Render pattern once for display; expand each atom range across all n fragments.
    let buf = '', i = 0;
    const flush = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
    while (i < pattern.length) {
      const c = pattern[i];
      if (c === '(') {
        flush();
        const end = pattern.indexOf(')', i);
        if (end < 0) { buf += c; i++; continue; }
        const inside = pattern.slice(i, end + 1);
        const match = inside.match(/\(H\d*,([^)]+)\)/);
        // Expand mobile H atoms across all fragments
        const atoms = match
          ? Array.from({ length: n }, (_, fi) => expandAtoms(match[1], fi * atomsPerFrag)).flat()
          : [];
        parts.push(
          <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken].join(' ')}
            {...subHoverProps({ kind: 'mobileH', atoms })}
          >{inside}</span>
        );
        i = end + 1; continue;
      }
      if (c === 'H') {
        let j = i + 1;
        while (j < pattern.length && /\d/.test(pattern[j])) j++;
        const count = j > i + 1 ? parseInt(pattern.slice(i + 1, j), 10) : 1;
        const atoms = Array.from({ length: n }, (_, fi) => expandAtoms(buf.replace(/^,/, ''), fi * atomsPerFrag)).flat();
        const hydroClass = [(styles as Record<string, string>)[`hydro${Math.min(count, 4)}`], styles.inchiSubtoken].join(' ');
        parts.push(
          <span key={key++} className={hydroClass} {...subHoverProps({ kind: 'hAtoms', atoms, count })}>
            {buf + pattern.slice(i, j)}
          </span>
        );
        buf = ''; i = j; continue;
      }
      buf += c; i++;
    }
    flush();
    return <>{parts}</>;
  }

  // ; separated notation: apply per-fragment offsets.
  const segments = text.split(';');
  let cumOffset = 0;
  segments.forEach((seg, fi) => {
    if (fi > 0) parts.push(<span key={key++}>;</span>);
    renderSegment(seg, cumOffset);
    cumOffset += fragCounts[fi] ?? 0;
  });
  return <>{parts}</>;
}
