import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { sites } from './build/sites-vite-plugin';

export default defineConfig(async () => {
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    base: process.env.GITHUB_ACTIONS ? '/private-progress-counter/' : '/',
    build: {
      target: 'esnext',
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
        extensions: ['.js', '.cjs'],
        ignoreDynamicRequires: true,
      },
    },
    plugins: [
      react(),
      wasm(),
      topLevelAwait({
        promiseExportName: '__tla',
        promiseImportName: (id) => `__tla_${id}`,
      }),
      {
        name: 'wasm-module-resolver',
        resolveId(source: string, importer?: string) {
          if (
            source === '@midnight-ntwrk/onchain-runtime-v3' &&
            importer?.includes('@midnight-ntwrk/compact-runtime')
          ) {
            return { id: source, external: false, moduleSideEffects: true };
          }
          return null;
        },
      },
      sites(),
      cloudflare({
        config: {
          main: './worker/index.ts',
          compatibility_date: '2026-07-15',
          compatibility_flags: ['nodejs_compat'],
          assets: {
            binding: 'ASSETS',
            not_found_handling: 'single-page-application',
          },
        },
      }),
    ],
    optimizeDeps: {
      include: ['@midnight-ntwrk/compact-runtime'],
      exclude: [
        '@midnight-ntwrk/onchain-runtime-v3',
        '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_bg.wasm',
        '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm.js',
      ],
    },
    resolve: {
      // The generated contract lives one directory above this package. Without
      // deduplication, Vite can bundle both the root and frontend copies of the
      // Compact runtime, making class-backed ledger values fail instanceof
      // checks at the contract boundary (for example, ChargedState).
      dedupe: [
        '@midnight-ntwrk/compact-js',
        '@midnight-ntwrk/compact-runtime',
        '@midnight-ntwrk/ledger-v8',
        '@midnight-ntwrk/onchain-runtime-v3',
        '@midnight-ntwrk/platform-js',
      ],
      alias: {
        assert: 'assert/',
        'isomorphic-ws': fileURLToPath(new URL('./src/shims/isomorphic-ws.ts', import.meta.url)),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
      mainFields: ['browser', 'module', 'main'],
    },
    server: { port: 4173 },
  };
});
