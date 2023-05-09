/*
 Configure `test`, this should run a critical sub-set of tests for this package which run quickly
*/

import { defineConfig } from 'vitest/config';

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
