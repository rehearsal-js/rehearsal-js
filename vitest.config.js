import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 1_000_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**']
  },
});
