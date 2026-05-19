import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/explain-that-inchi/',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/ketcher-standalone/dist/binaryWasm/*.{wasm,js}',
          dest: '',
          rename: { stripBase: true },
        },
      ],
    }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
});
