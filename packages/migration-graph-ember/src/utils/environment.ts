import { dirname, join, sep } from 'path';

type TestFixturePath = string;
type TestFixturesPaths = TestFixturePath[];

let INTERNAL_ADDON_TEST_FIXTURES: TestFixturesPaths = [];

/**
 * Registers internal addons; specifically used for custom fixtures
 * to test "fake" addons
 *
 * @param {Array} testFixtures
 * @returns {Array}
 */
export function registerInternalAddonTestFixtures(testFixtures: string[] = []): void {
  const internalAddonFixtureSet = new Set(INTERNAL_ADDON_TEST_FIXTURES);

  INTERNAL_ADDON_TEST_FIXTURES.push(
    ...testFixtures
      .map((pathToFixture: string) => {
        if (pathToFixture.endsWith(join(sep, 'package.json'))) {
          return dirname(pathToFixture);
        }

        return pathToFixture;
      })
      .filter((testFixture) => !internalAddonFixtureSet.has(testFixture))
  );
}

/**
 * Resets all internal addon test fixtures
 */
export function resetInternalAddonTestFixtures(): void {
  INTERNAL_ADDON_TEST_FIXTURES = [];
}

/**
 * Gets all internal addon test fixtures
 *
 * @returns {TestFixturesPaths} All absolute paths representing addon test fixtures on disk
 */
export function getInternalAddonTestFixtures(): TestFixturesPaths {
  return INTERNAL_ADDON_TEST_FIXTURES;
}
