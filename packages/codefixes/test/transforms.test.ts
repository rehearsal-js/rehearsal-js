import { describe, expect, test } from 'vitest';

// for now all transforms are tested in the upgrade package
describe('Transforms test suite in upgrade package', function () {
  test('true', async () => {
    expect(true).toEqual(true);
  });
});
