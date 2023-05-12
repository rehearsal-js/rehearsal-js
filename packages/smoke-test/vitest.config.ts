import { defineConfig } from 'vitest/config';

/*
  THIS PACKAGE SHOULD ONLY RUN IN TEST:SLOW
*/


//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 100_000_000,
    hookTimeout: 50_000,
    sequence: {
      shuffle: true,
    },
    watchExclude: ['package.json', '**/fixtures/**'],
    include: ['./test/commands/**/*.test.ts'],
  },
});
