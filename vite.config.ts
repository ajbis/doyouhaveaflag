import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The test pages / flag wall. This is the default config so `yarn dev` and
// `yarn build:docs` both target it; the publishable library lives in
// vite.lib.config.ts.
const root = import.meta.dirname;

// GitHub Pages runs Jekyll over `docs/` unless `.nojekyll` says not to. The
// build empties that directory, so the marker is regenerated here rather than
// being a file someone has to remember to recreate.
const noJekyll: Plugin = {
  name: 'write-nojekyll',
  apply: 'build',
  closeBundle() {
    writeFileSync(resolve(root, 'docs/.nojekyll'), '');
  },
};

export default defineConfig({
  root: resolve(root, 'demo'),
  base: './',
  plugins: [react(), noJekyll],
  resolve: {
    alias: [
      // Let the test pages import exactly what a consumer would:
      //   import gb from 'doyouhaveaflag/flags/gb.svg'
      // resolving back to source so dev has HMR and no build step.
      {
        find: /^doyouhaveaflag\/flags\/(.*)\.svg$/,
        replacement: resolve(root, 'src/assets/flags/$1.svg'),
      },
      {
        find: /^doyouhaveaflag$/,
        replacement: resolve(root, 'src/index.ts'),
      },
    ],
  },
  build: {
    outDir: resolve(root, 'docs'),
    emptyOutDir: true,
    // Deliberately NOT set: Vite's default assetsInlineLimit (4096) gives the
    // hybrid the README documents — light flags inline, heavy flags emitted as
    // files. Overriding it here would stop the test pages modelling what a
    // consumer gets out of the box.
  },
});
