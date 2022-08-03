import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'fixtures/migrate/some-util.d.ts'],
  },
});
