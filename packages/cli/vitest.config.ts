import { defineConfig } from 'vitest/config';

//eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 20_000,
    hookTimeout: 20_000,
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,
  },
});
