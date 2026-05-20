import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Layer, AuxMap, SubHover } from './lib/parseInchi';

// All v1 fields defined here per D-02.
// hoverIdx and subHover are null until Phase 3 writes them.
// No store changes needed in later phases — just new calls to setHover/setSubHover.
interface InchiState {
  // Data fields
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  hoverIdx: number | null;
  subHover: SubHover | null;
  // Actions
  setInchiData: (inchi: string, layers: Layer[], auxMap: AuxMap) => void;
  setHover: (idx: number | null) => void;
  setSubHover: (sub: SubHover | null) => void;
}

// Zustand 5 TypeScript pattern: create<State>()() — double-call required.
// The outer () binds the generic; the inner () receives the initialiser.
// devtools middleware provides Redux DevTools integration in development.
// Note: TypeScript may warn about @redux-devtools/extension types — this is
// a dev-only DX issue; no @redux-devtools/extension install is needed.
export const useInchiStore = create<InchiState>()(
  devtools(
    (set) => ({
      inchi: '',
      layers: [],
      auxMap: {},
      hoverIdx: null,
      subHover: null,
      setInchiData: (inchi, layers, auxMap) => set({ inchi, layers, auxMap }),
      setHover: (idx) => set({ hoverIdx: idx }),
      setSubHover: (sub) => set({ subHover: sub }),
    }),
    { name: 'inchi-store' },
  ),
);

// Usage patterns for Phase 3+ components:
//
// Selector-based read — component re-renders only when this slice changes:
//   const layers = useInchiStore(state => state.layers);
//
// Dispatching without subscribing (App.tsx) — avoids adding caller as subscriber:
//   useInchiStore.getState().setInchiData(inchi, layers, auxMap);
