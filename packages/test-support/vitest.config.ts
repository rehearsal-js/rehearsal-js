import { defineConfig } from 'vitest/config';

// we dont want to run these slow tests in this config
// these will all run by default in `test:slow` instead which is run in CI
const exclude = ['./test/scenarios-app.test.ts'];

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 500_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**'],
    sequence: {
      shuffle: true,
    },
    include: ['./test/**/*.test.ts'],
    exclude,
  },
});
