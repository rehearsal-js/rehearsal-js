import { resolve } from 'path';
import { setupTestEnvironment } from '@rehearsal/migration-graph-shared';
import { writeSync } from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import walkSync from 'walk-sync';

import { EmberAddonPackage } from '../../entities/ember-addon-package';
import {
  registerInternalAddonTestFixtures,
  resetInternalAddonTestFixtures,
} from '../../utils/environment';
import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures';

setGracefulCleanup();

function setupAddonFixtures(tmpLocation: string): void {
  writeSync(tmpLocation, FIXTURES);
}

describe('Unit | EmberAddonPackage', () => {
  let pathToPackage: string;

  beforeEach(() => {
    setupTestEnvironment();
    const { name: tmpLocation } = dirSync();
    pathToPackage = tmpLocation;
    setupAddonFixtures(pathToPackage);

    registerInternalAddonTestFixtures(
      walkSync(pathToPackage, {
        globs: ['**/*/package.json'],
        ignore: ['node_modules'],
        includeBasePath: true,
      })
    );
  });

  afterEach(() => {
    resetInternalAddonTestFixtures();
  });

  describe('simple properties', () => {
    test('isEngine', () => {
      expect(
        new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ENGINE)).isEngine
      ).toBe(true);
      expect(
        new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON)).isEngine,
        'foo is NOT engine'
      ).toBe(false);
    });

    test('name', () => {
      expect(new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON)).name).toBe(
        FIXTURE_NAMES.SIMPLE_ADDON
      );
      expect(
        new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))
          .packageName,
        'fetch the name property even if module name is defined'
      ).toBe(FIXTURE_NAMES.ADDON_WITH_MODULE_NAME);
    });

    test('moduleName', () => {
      expect(
        new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))
          .moduleName
      ).toBe(`${FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`);
    });
  });
});
