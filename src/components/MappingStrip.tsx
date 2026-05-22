import { useInchiStore } from '../store';
import { deriveMappingPairs } from '../lib/deriveMappingPairs';

/**
 * MappingStrip — read-only display of Ketcher draw order → InChI canonical numbering.
 *
 * Reads auxMap and atomElements from Zustand store.
 * Returns null when auxMap is empty (D-08).
 * Uses GLOBAL CSS classes from src/styles.css (.mapping, .pairs, .pair, .identity,
 * .diverges, .k, .arrow, .c, .el) — do NOT create MappingStrip.module.css.
 */
export function MappingStrip() {
  const auxMap = useInchiStore(s => s.auxMap);
  const atomElements = useInchiStore(s => s.atomElements);

  if (Object.keys(auxMap).length === 0) return null;

  const pairs = deriveMappingPairs(auxMap, atomElements);
  const anyDiverges = pairs.some(p => p.k !== p.c);

  // Identity mapping (all k === c) is already conveyed by the connection layer — hide strip
  if (!anyDiverges) return null;

  return (
    <div className="mapping" aria-label="Ketcher to InChI atom mapping">
      <span className="mapping-label">
        Ketcher&nbsp;
        <span style={{ color: 'var(--ink-faint)' }}>{'→'}</span>
        &nbsp;InChI
      </span>
      <span className="pairs">
        {pairs.map((p, i) => (
          <span
            key={i}
            className={'pair' + (p.k === p.c ? ' identity' : ' diverges')}
            title={`Atom drawn ${p.k}th in Ketcher is canonical #${p.c} in InChI`}
          >
            <span className="k">{p.k}</span>
            <span className="arrow">{'→'}</span>
            <span className="c">{p.c}</span>
            <span className="el">{p.el}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
