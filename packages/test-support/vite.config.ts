import { defineConfig } from 'vitest/config';

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 1_000_000,
    hookTimeout: 1_000_000,
    watchExclude: ['package.json', '**/fixtures/**'],
    threads: false,
  },
});
