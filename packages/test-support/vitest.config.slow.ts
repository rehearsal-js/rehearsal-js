import { defineConfig } from 'vitest/config';


// explicit includes for slow test otherwise it'll run in `test`

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 500_000,
    hookTimeout: 50_000,
    watchExclude: ['package.json', '**/fixtures/**'],
    include: ['./test/scenarios-app.test.ts']
  },
});
