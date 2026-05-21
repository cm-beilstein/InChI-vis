// Explanation — left card in the explanation panel, plus right Legend card.
// Port of design_handoff_explain_that_inchi/app.jsx lines 359-404.
// Reads layers, hoverIdx, atomElements from Zustand store.
// D-09: dangerouslySetInnerHTML for reading-code block (readingFor output).
// D-10: Idle state shows DEFAULT_INFO.title when no layer hovered.
// Pitfall 3: --accent always set — idle uses ink-faint, active uses layer accent.

import { useInchiStore } from '../store';
import { LAYER_INFO, DEFAULT_INFO, readingFor, swatchVar } from '../lib/layerInfo';
import { Legend } from './Legend';
import styles from './Explanation.module.css';

export function Explanation() {
  const layers = useInchiStore(state => state.layers);
  const hoverIdx = useInchiStore(state => state.hoverIdx);
  const atomElements = useInchiStore(state => state.atomElements);

  const layer = hoverIdx !== null ? layers[hoverIdx] : null;
  const info = layer ? LAYER_INFO[layer.type] : null;

  // Pitfall 3: always set --accent so card::before always has a value.
  // Idle: var(--ink-faint); active: layer accent color.
  const accentVar = layer ? `var(--c-${swatchVar(layer.type)})` : 'var(--ink-faint)';

  // D-09: readingFor output — HTML string used in dangerouslySetInnerHTML.
  // readingFor() only emits <b> and <span style="color:var(--...)"> tags.
  // Inputs are parsed InChI data from WASM — no user-controlled free text.
  const reading = layer ? readingFor(layer, atomElements) : '';

  return (
    <div className={styles.explain}>
      {/* Left explanation card */}
      <div
        className={[styles.card, layer ? styles.active : ''].filter(Boolean).join(' ')}
        style={{ '--accent': accentVar } as React.CSSProperties}
      >
        {!layer ? (
          /* D-10: Idle state — DEFAULT_INFO with ink-faint left border */
          <>
            <div className={styles.layerTag}>
              <span className={styles.swatch} />
              Idle
            </div>
            <h3 className={styles.layerTitle}>{DEFAULT_INFO.title}</h3>
            <p className={styles.layerBody}>{DEFAULT_INFO.blurb}</p>
          </>
        ) : (
          /* Active state: show layer info + readingFor output */
          <>
            <div className={styles.layerTag}>
              <span className={styles.swatch} />
              {layer.prefix ? `${layer.prefix}-layer` : `${layer.type}-layer`}
            </div>
            <h3 className={styles.layerTitle}>{info!.title}</h3>
            <p className={styles.layerBody}>{info!.blurb}</p>
            <div className={styles.layerEg}>
              <span className={styles.lbl}>{info!.egLabel}</span>
              {/* D-09: dangerouslySetInnerHTML for reading-code block */}
              <span dangerouslySetInnerHTML={{ __html: reading || info!.eg || layer.text }} />
            </div>
          </>
        )}
      </div>

      {/* Right legend card */}
      <Legend activeType={layer?.type} />
    </div>
  );
}
