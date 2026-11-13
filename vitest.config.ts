import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Standalone rather than merged from vite.config.ts: that file sets `root` to
// demo/, which would hide src/ from the test runner.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
    },
  },
});
