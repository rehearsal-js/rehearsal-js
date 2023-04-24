/*
 Configure `test`, this should run a critical sub-set of tests for this package which run quickly
*/

import { defineConfig } from 'vitest/config';

// we dont want to run these slow tests in this config
// these will all run by default in `test:slow` instead which is run in CI
const exclude = [
  './test/commands/migrate/e2e.test.ts',
  './test/commands/migrate/config-lint.ember-addon.test.ts',
  './test/commands/migrate/config-lint.ember-app.test.ts',
  './test/commands/migrate/init-command.ember-addon.test.ts',
  './test/commands/migrate/init-command.ember-app.test.ts',
  './test/commands/migrate/validate.ember-app.test.ts',
];

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 100_000_000,
    hookTimeout: 50_000,
    sequence: {
      shuffle: true,
    },
    watchExclude: ['package.json', '**/fixtures/**'],
    include: ['./test/**/*.test.ts'],
    exclude,
  },
});
