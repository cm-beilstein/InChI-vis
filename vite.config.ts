import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Ketcher bundles Node.js code without browser guards — shim process.* at
// dep-optimization time (esbuildOptions) so pre-bundled chunks compile correctly,
// and at transform time (define) for any source-level references.
const processShim: Record<string, string> = {
  global: 'globalThis',
  'process.env': JSON.stringify({ NODE_ENV: 'development', NODE_DEBUG: '' }),
  'process.pid': '0',
  'process.throwDeprecation': 'false',
  'process.traceDeprecation': 'false',
  'process.noDeprecation': 'false',
  'process.stderr': 'null',
  'process.emitWarning': 'console.warn',
  'process.nextTick': '(fn, ...args) => setTimeout(() => fn(...args), 0)',
};

export default defineConfig({
  base: '/explain-that-inchi/',
  define: processShim,
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: processShim,
    },
  },
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
