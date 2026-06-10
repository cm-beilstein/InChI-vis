import { useState, useRef, useEffect } from 'react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { Ketcher } from 'ketcher-core';
import { Header } from './components/Header';
import { KetcherPanel } from './components/KetcherPanel';
import { InchiSection } from './components/InchiSection';
import { Explanation } from './components/Explanation';
import { parseInchiWithAux } from './lib/parseAuxMapping';
import { useInchiStore } from './store';
import { useKetcherHighlights } from './hooks/useKetcherHighlights';
import { MOLECULES } from './data/molecules';
import { handleMolSelectLogic } from './lib/handleMolSelectLogic';

// Module-level — created once for the page lifetime. NEVER move inside a component.
// (D-13: provider inside component re-creates WASM worker on every render)
const structServiceProvider = new StandaloneStructServiceProvider();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [selectedMolId, setSelectedMolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // useRef, not useState — storing in state triggers unnecessary re-renders (D-15)
  const ketcherRef = useRef<Ketcher | null>(null);
  // Prevents highlight-triggered editor.update() from re-firing handleChange.
  // highlights.create/clear call editor.update() synchronously, which dispatches
  // the editor change event — without this guard that re-triggers getInchi() in a loop.
  const isHighlightingRef = useRef(false);
  // Prevents selectedMolId from resetting to null when the 'change' event fires
  // after setMolecule() — separate from isHighlightingRef (RESEARCH.md Pitfall 4)
  const isSettingMoleculeRef = useRef(false);

  // Bridge hover state → Ketcher canvas highlights (Phase 4)
  useKetcherHighlights(ketcherRef, isReady, isHighlightingRef);

  const handleInit = (ketcher: Ketcher) => {
    ketcherRef.current = ketcher;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ketcher = ketcher;
    // Reset render settings to canonical defaults, overriding any stale localStorage
    // values. The micro-mode editor exposes setOptions() on its legacy Raphaël editor
    // object; bondLength (px) === microModeScale, default is 40px per Å.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ketcher.editor as any).setOptions(
      JSON.stringify({ bondLength: 40, bondLengthUnit: 'px', zoom: 1 }),
    );
    setIsReady(true);
  };

  const handleMolSelect = async (id: string) => {
    await handleMolSelectLogic({
      id,
      molecules: MOLECULES,
      ketcherRef,
      setSelectedMolId,
      setIsLoading,
      isSettingMoleculeRef,
    });
  };

  // Generation counter: synchronous useRef (not useState) so it updates before the
  // async WASM call resolves. Prevents a slow prior result from overwriting newer state (D-05).
  const generationRef = useRef(0);

  useEffect(() => {
    const ketcher = ketcherRef.current;
    if (!isReady || !ketcher) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleChange = () => {
      if (isHighlightingRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        // Reset selectedMolId when user draws freely (not during setMolecule()).
        // Read the guard, then release it so a subsequent genuine free-draw resets the
        // selection. The guard is held true across the debounce window for preset loads
        // (handleMolSelectLogic no longer clears it in finally), so this read is the one
        // place it gets cleared on the success path.
        const wasSettingMolecule = isSettingMoleculeRef.current;
        isSettingMoleculeRef.current = false;
        if (!wasSettingMolecule) setSelectedMolId(null);
        // Increment before the async call; capture for stale-result comparison after
        const thisGen = ++generationRef.current;
        try {
          const raw = await ketcher.getInchi(true);
          // Discard if a newer draw event fired while this WASM call was in flight
          if (thisGen !== generationRef.current) return;
          const result = parseInchiWithAux(raw);
          // D-12/D-13: empty canvas guard — no formula layer means empty or disconnected
          if (result.layers.length < 2) {
            useInchiStore.getState().setInchiData('', [], {}, {}, []);
            return;
          }
          // parseInchiWithAux returns canonical → 0-based mol-file rank (from AuxInfo N: field).
          // Ketcher atom Pool IDs are NOT sequential from 0 — they are cumulative across draws.
          // We must read actual Pool IDs and remap rank → poolId so highlights.create() works.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const poolIds: number[] = [];
          (ketcher.editor as any).render.ctab.molecule.atoms.forEach((_: unknown, id: number) => poolIds.push(id));
          // Collect explicit H atom pool IDs from Ketcher render struct (INCHI-05)
          const hAtomPoolIds: number[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ketcher.editor as any).render.ctab.molecule.atoms.forEach(
            (atom: { label: string }, id: number) => {
              if (atom.label === 'H') hAtomPoolIds.push(id);
            }
          );
          const actualAuxMap: Record<number, number> = {};
          for (const [canonStr, rank] of Object.entries(result.auxMap)) {
            const poolId = poolIds[rank as number];
            if (poolId !== undefined) actualAuxMap[Number(canonStr)] = poolId;
          }
          useInchiStore.getState().setInchiData(result.inchi, result.layers, actualAuxMap, result.atomElements, hAtomPoolIds);
        } catch {
          // Discard if a newer draw event fired while this WASM call was in flight —
          // a stale rejection must not blank the store under a newer generation.
          if (thisGen !== generationRef.current) return;
          // getInchi() can throw on empty or disconnected canvas — reset to empty (D-12)
          useInchiStore.getState().setInchiData('', [], {}, {}, []);
        }
      }, 150);
    };

    // CRITICAL: subscribe returns a subscriber OBJECT — store it.
    // unsubscribe must receive this object, not the handler function.
    // Passing the handler to unsubscribe silently fails (verified: ketcher-react/dist/index.js lines 27315–27355).
    const subscription = ketcher.editor.subscribe('change', handleChange);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      ketcher.editor.unsubscribe('change', subscription);
    };
  }, [isReady]); // ketcherRef is a ref — not a React dependency

  return (
    <div className="app">
      <Header />
      <KetcherPanel
        isReady={isReady}
        onInit={handleInit}
        structServiceProvider={structServiceProvider}
        selectedMolId={selectedMolId}
        onMolSelect={handleMolSelect}
        isLoading={isLoading}
      />
      <InchiSection />
      <Explanation />
    </div>
  );
}
