import { resolve } from 'path';
import { writeSync } from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures';

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
});
