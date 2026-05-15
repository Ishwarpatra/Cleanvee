import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', 'src/test/'],
    },
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'functions/**'],
  },
});
