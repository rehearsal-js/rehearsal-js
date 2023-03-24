import { configDefaults, defineConfig } from 'vitest/config';

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 120000,
    exclude: [...configDefaults.exclude, 'fixtures/migrate/some-util.d.ts'],
    sequence: {
      shuffle: true,
    },
  },
});
