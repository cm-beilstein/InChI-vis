// InchiSection — the primary InChI display strip with color-coded interactive layers.
// Port of design_handoff_explain_that_inchi/app.jsx lines 281-313.
// Reads layers and hoverIdx from Zustand store via selectors.
// D-06: inline style for accent colors (CSS var token per layer type).
// D-07: setSubHover wired on all sub-token spans (via LayerText).
// D-08: hint text from formula layer.

import React from 'react';
import { useInchiStore } from '../store';
import { swatchVar } from '../lib/layerInfo';
import { LayerText } from './LayerText';
import styles from './InchiSection.module.css';

export function InchiSection() {
  const layers = useInchiStore(state => state.layers);
  const hoverIdx = useInchiStore(state => state.hoverIdx);

  const isEmpty = layers.length === 0;

  return (
    <section className={styles.inchiSection}>
      <div
        className={styles.inchiDisplay}
        data-empty={isEmpty ? 'true' : undefined}
        onMouseLeave={isEmpty ? undefined : () => {
          useInchiStore.getState().setHover(null);
          useInchiStore.getState().setSubHover(null);
        }}
      >
        {isEmpty ? (
          <span className={styles.emptyHint}>Draw a molecule above to see its InChI.</span>
        ) : (
          <>
            <span className={styles.inchiPrefix}>InChI=</span>
            {layers.map((l, i) => {
              const isActive = hoverIdx === i;
              const isDim = hoverIdx !== null && hoverIdx !== i;
              const tokenColor = `var(--c-${swatchVar(l.type)})`;
              const bgColor = `var(--c-${swatchVar(l.type)}-bg)`;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span className={styles.inchiSlash}>/</span>}
                  <span
                    className={[
                      styles.inchiLayer,
                      isActive ? styles.active : '',
                      isDim ? styles.dim : '',
                    ].filter(Boolean).join(' ')}
                    data-layer={l.type}
                    style={{
                      color: tokenColor,
                      ...(isActive ? { background: bgColor } : {}),
                    }}
                    onMouseEnter={() => {
                      useInchiStore.getState().setHover(i);
                      useInchiStore.getState().setSubHover(null);
                    }}
                  >
                    {l.prefix && <span className={styles.prefix}>{l.prefix}</span>}
                    <LayerText layer={l} />
                  </span>
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
