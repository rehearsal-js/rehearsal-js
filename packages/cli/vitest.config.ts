import { defineConfig } from 'vitest/config';

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 100_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**'],
    threads: false,
  },
});
