import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The publishable library. Outputs ESM only (no CJS) into dist/, alongside the
// .d.ts files emitted by `tsc -p tsconfig.build.json` in the build script.
const root = import.meta.dirname;
const flagsFrom = resolve(root, 'src/assets/flags');
const flagsTo = resolve(root, 'dist/flags');
const flagsTypesFrom = resolve(root, 'types/flags.d.ts');
const flagsTypesTo = resolve(root, 'dist/flags.d.ts');

// Ship the artwork as verbatim files at a stable, predictable path — no
// hashing, no processing, no inlining. The package's "./flags/*.svg" exports
// subpath points straight at these, so the names must not change between
// builds. The matching .d.ts backs that subpath's "types" condition, so it has
// to land in dist/ too or consumer typecheck breaks.
// Runs in closeBundle, after Vite has emptied and written dist/.
function copyFlags(): Plugin {
  return {
    name: 'doyouhaveaflag:copy-flags',
    async closeBundle() {
      const names = (await readdir(flagsFrom)).filter((n) =>
        n.endsWith('.svg'),
      );

      if (names.length === 0) {
        throw new Error(`copy-flags: no .svg files found in ${flagsFrom}`);
      }

      await mkdir(flagsTo, { recursive: true });
      await Promise.all([
        ...names.map((name) =>
          cp(resolve(flagsFrom, name), resolve(flagsTo, name)),
        ),
        cp(flagsTypesFrom, flagsTypesTo),
      ]);

      console.log(
        `copy-flags: ${names.length} flag(s) → dist/flags/ + dist/flags.d.ts`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), copyFlags()],
  build: {
    lib: {
      entry: resolve(root, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // React must never be bundled into the package — consumers supply their
      // own copy via peerDependencies, or they get two Reacts and broken hooks.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    sourcemap: true,
    emptyOutDir: true,
    // Flags must ship as real files, never as base64 data URLs in the JS.
    // Our source must not import assets at all — see copyFlags() above.
    assetsInlineLimit: 0,
  },
});
