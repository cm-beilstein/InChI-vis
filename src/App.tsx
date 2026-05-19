import { useState, useRef } from 'react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { Ketcher } from 'ketcher-core';
import { Header } from './components/Header';
import { KetcherPanel } from './components/KetcherPanel';

// Module-level — created once for the page lifetime. NEVER move inside a component.
// (D-13: provider inside component re-creates WASM worker on every render)
const structServiceProvider = new StandaloneStructServiceProvider();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  // useRef, not useState — storing in state triggers unnecessary re-renders (D-15)
  const ketcherRef = useRef<Ketcher | null>(null);

  const handleInit = (ketcher: Ketcher) => {
    ketcherRef.current = ketcher;
    setIsReady(true);
  };

  return (
    <div className="app">
      <Header />
      <KetcherPanel
        isReady={isReady}
        onInit={handleInit}
        structServiceProvider={structServiceProvider}
      />
      {/* Phase 1 stubs — class names match styles.css exactly. Later phases replace with real components. */}
      <div className="inchi-section" />
      <div className="mapping" />
      <div className="explain" />
      <div className="footnote" />
    </div>
  );
}
