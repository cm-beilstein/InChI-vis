import { Editor } from 'ketcher-react';
import type { Ketcher, StructServiceProvider } from 'ketcher-core';
import styles from './KetcherPanel.module.css';

interface KetcherPanelProps {
  isReady: boolean;
  onInit: (ketcher: Ketcher) => void;
  structServiceProvider: StructServiceProvider;
}

export function KetcherPanel({ isReady, onInit, structServiceProvider }: KetcherPanelProps) {
  return (
    <section>
      <div className="section-label">
        <span>Ketcher · sketch panel</span>
        <span className="hint">Draw a molecule to see its InChI</span>
      </div>
      <div className={styles.ketcher}>
        {/* Editor is ALWAYS rendered — never conditional. Removing and remounting
            causes WASM to re-initialize from scratch. (D-09) */}
        <Editor
          structServiceProvider={structServiceProvider}
          staticResourcesUrl={import.meta.env.BASE_URL}
          onInit={onInit}
          errorHandler={(msg) => console.error('Ketcher error:', msg)}
        />
        {/* Loading overlay sits position:absolute on top of the mounted Editor.
            Removed from DOM (not hidden) when isReady becomes true. (D-08) */}
        {!isReady && (
          <div className={styles.loadingOverlay}>
            Loading editor…
          </div>
        )}
      </div>
    </section>
  );
}
