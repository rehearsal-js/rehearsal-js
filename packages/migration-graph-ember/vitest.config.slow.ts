/*
 Configure `test:slow`, this should run the entire test suite for this package, no exceptions
*/

import { defineConfig } from 'vitest/config';

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 500_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**'],
  },
});