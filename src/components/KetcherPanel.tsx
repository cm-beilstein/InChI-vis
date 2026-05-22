import { Editor } from 'ketcher-react';
import type { Ketcher, StructServiceProvider } from 'ketcher-core';
import { MOLECULES } from '../data/molecules';
import styles from './KetcherPanel.module.css';

interface KetcherPanelProps {
  // Existing
  isReady: boolean;
  onInit: (ketcher: Ketcher) => void;
  structServiceProvider: StructServiceProvider;
  // New Phase 5 props
  selectedMolId: string | null;
  onMolSelect: (id: string) => void;
  molName: string | null;        // preset name for overlay; null = user-drawn (no name shown)
  formula: string | null;        // from store layers[0].text; null = empty canvas (overlay hidden)
  heavyAtomCount: number;        // from Object.keys(atomElements).length
  isLoading: boolean;            // true while PubChem fetch in-flight (disables buttons)
}

export function KetcherPanel({
  isReady,
  onInit,
  structServiceProvider,
  selectedMolId,
  onMolSelect,
  molName,
  formula,
  heavyAtomCount,
  isLoading,
}: KetcherPanelProps) {
  return (
    <section>
      <div className="section-label">
        <span>Draw a molecule to see its InChI</span>
      </div>
      <div className={styles.ketcher}>
        {/* Canvas column: Editor + loading overlay + canvas-meta overlay */}
        <div className={styles.canvasWrap}>
          {/* Editor is ALWAYS rendered — never conditional. Removing and remounting
              causes WASM to re-initialize from scratch. */}
          <Editor
            structServiceProvider={structServiceProvider}
            staticResourcesUrl={import.meta.env.BASE_URL}
            onInit={onInit}
            errorHandler={(msg) => console.error('Ketcher error:', msg)}
          />
          {/* Loading overlay sits position:absolute on top of the mounted Editor.
              Removed from DOM (not hidden) when isReady becomes true. */}
          {!isReady && (
            <div className={styles.loadingOverlay}>
              Loading editor…
            </div>
          )}
          {/* Canvas meta overlay — only when canvas is non-empty (D-06) */}
          {formula !== null && (
            <div className="canvas-meta">
              <span className="dot" />
              {molName && <span><b>{molName}</b></span>}
              <span>{formula}</span>
              <span>· {heavyAtomCount} heavy atom{heavyAtomCount === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
        {/* Mol-list sidebar — hidden on narrow viewports via global CSS media query */}
        <div className="mol-list">
          <div className="mol-list-header">Examples</div>
          {MOLECULES.map(m => (
            <button
              key={m.id}
              className={'mol-item' + (selectedMolId === m.id ? ' active' : '')}
              onClick={() => !isLoading && onMolSelect(m.id)}
              disabled={isLoading}
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
