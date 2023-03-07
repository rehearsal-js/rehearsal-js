import { resolve } from 'node:path';
import { writeSync } from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { EmberAddonPackage } from '../../src/entities/ember-addon-package.js';
import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures.js';
import { getEmberExcludePatterns } from '../../src/utils/excludes.js';

setGracefulCleanup();

function setupAddonFixtures(tmpLocation: string): void {
  writeSync(tmpLocation, FIXTURES);
}

describe('Unit | Entities | EmberAddonPackage', () => {
  let pathToPackage: string;

  beforeEach(() => {
    const { name: tmpLocation } = dirSync();
    pathToPackage = tmpLocation;
    setupAddonFixtures(pathToPackage);
  });

  test('get isEngine', () => {
    expect(
      new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ENGINE)).isEngine
    ).toBe(true);
    expect(
      new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON)).isEngine,
      'foo is NOT engine'
    ).toBe(false);
  });

  test('get name', () => {
    expect(new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON)).name).toBe(
      FIXTURE_NAMES.SIMPLE_ADDON
    );
    expect(
      new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))
        .packageName,
      'fetch the name property even if module name is defined'
    ).toBe(FIXTURE_NAMES.ADDON_WITH_MODULE_NAME);
  });

  test('get moduleName', () => {
    expect(
      new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_MODULE_NAME)).moduleName
    ).toBe(`${FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`);
  });

  test('should have common ember excludes', () => {
    const pkg = new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_MODULE_NAME));

    const excludes = getEmberExcludePatterns();

    expect.assertions(excludes.length);

    excludes.forEach((pattern) => {
      expect(
        pkg.excludePatterns.has(pattern),
        `expect EmberrAddonPackage to exclude ${pattern}`
      ).toBeTruthy();
    });
  });

  test('should explicitly exclude root app dir in addon', () => {
    const pkg = new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_MODULE_NAME));

    expect(
      pkg.excludePatterns.has(`^app`),
      'to exclude app directory in root of addon'
    ).toBeTruthy();
  });
});
