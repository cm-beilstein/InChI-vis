# Explain that InChI

An interactive web tool for understanding [InChI](https://iupac.org/what-we-do/databases-and-nomenclature/inchi/) (IUPAC International Chemical Identifier) strings.

Draw a molecule in the embedded editor — the InChI is computed live and each layer is colour-coded and interactive. Hover a layer chunk to highlight the corresponding atoms in the drawing and read a plain-English explanation.

**Live:** `https://cm-beilstein.github.io/explain-that-inchi/`

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Requires Node.js 20+ and a modern browser with WebAssembly support.

---

## Build

```bash
npm run build
```

Output is written to `dist/`. The build includes the InChI WASM library and a `coi-serviceworker.js` that sets the required `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers on GitHub Pages.

---

## Tech Stack

- [Vite 8](https://vite.dev) + [React 18](https://react.dev) + TypeScript
- [Ketcher](https://github.com/epam/ketcher) 3.12.0 (standalone WASM, no backend required)
- [Zustand 5](https://zustand-demo.pmnd.rs) for state management
- CSS Modules with CSS custom properties (oklch color space)
