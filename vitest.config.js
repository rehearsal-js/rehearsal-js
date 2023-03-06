import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 100_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**'],
    threads: false,
  },
});
