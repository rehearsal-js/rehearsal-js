/*
 Configure `test:slow`, this will run the explict includes otherwise `test` will run the delta
*/

import { defineConfig } from 'vitest/config';

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 500_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**'],
    include: [
      './test/entities/ember-app-project-graph.test.ts',
      './test/entities/ember-app-package-graph.test.ts',
    ]
  },
});
