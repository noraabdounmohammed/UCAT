import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Inject fake Supabase env vars so any test that transitively imports
    // `@/lib/supabase` doesn't throw at module load (the lib throws if
    // VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing). Real network
    // calls are mocked per-test; these are placeholders only.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/atom/**', 'src/fsrs/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
