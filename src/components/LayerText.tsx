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
// Verbatim port of app.jsx lines 116-128.
export function LayerText({ layer }: { layer: Layer }) {
  switch (layer.type) {
    case 'formula': return <FormulaText text={layer.text} />;
    case 'c':       return <ConnectionText text={layer.text} />;
    case 't':
    case 'b':       return <ParityText text={layer.text} />;
    case 'h':       return <HLayerText text={layer.text} />;
    default:        return <>{layer.text}</>;
  }
}

// Port of app.jsx FormulaText lines 138-156.
// Uses EL_CLASS lookup (not "el-"+el).
function FormulaText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (!m[1]) break;
    const el = m[1];
    out.push(
      <span
        key={key++}
        className={[EL_CLASS[el] ?? '', styles.inchiSubtoken].filter(Boolean).join(' ')}
        {...subHoverProps({ kind: 'element', el })}
      >
        {el}{m[2]}
      </span>
    );
  }
  return <>{out}</>;
}

// Port of app.jsx ConnectionText lines 158-189.
function ConnectionText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let i = 0, key = 0, buf = '';
  const flush = () => {
    if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; }
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
          className={styles.inchiSubtoken}
          {...subHoverProps({ kind: 'atom', canonical: n })}
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
  return <>{parts}</>;
}

// Port of app.jsx ParityText lines 191-212.
function ParityText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(\d+)([\-+])/g;
  let m: RegExpExecArray | null;
  let key = 0, last = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const atom = parseInt(m[1], 10);
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
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

// Port of app.jsx HLayerText lines 214-278.
function HLayerText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let buf = '', i = 0, key = 0;
  const flush = () => {
    if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; }
  };
  const expandAtoms = (s: string): number[] => {
    const out: number[] = [];
    for (const range of s.split(',')) {
      if (!range.trim()) continue;
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(n => parseInt(n, 10));
        for (let k = a; k <= b; k++) out.push(k);
      } else {
        out.push(parseInt(range, 10));
      }
    }
    return out;
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '(') {
      flush();
      const end = text.indexOf(')', i);
      if (end < 0) { buf += c; i++; continue; }
      const inside = text.slice(i, end + 1);
      const match = inside.match(/\(H\d*,([^)]+)\)/);
      const atoms = match ? expandAtoms(match[1]) : [];
      parts.push(
        <span
          key={key++}
          className={[styles.hydroMobile, styles.inchiSubtoken].join(' ')}
          {...subHoverProps({ kind: 'mobileH', atoms })}
        >
          {inside}
        </span>
      );
      i = end + 1;
      continue;
    }
    if (c === 'H') {
      let j = i + 1;
      while (j < text.length && /\d/.test(text[j])) j++;
      const count = j > i + 1 ? parseInt(text.slice(i + 1, j), 10) : 1;
      const atoms = expandAtoms(buf.replace(/^,/, ''));
      const hydroClass = [
        (styles as Record<string, string>)[`hydro${Math.min(count, 4)}`],
        styles.inchiSubtoken
      ].join(' ');
      parts.push(
        <span
          key={key++}
          className={hydroClass}
          {...subHoverProps({ kind: 'hAtoms', atoms, count })}
        >
          {buf + text.slice(i, j)}
        </span>
      );
      buf = '';
      i = j;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return <>{parts}</>;
}
