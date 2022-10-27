import { relative, resolve } from 'path';
import { setupTestEnvironment } from '@rehearsal/migration-graph-shared';
import { writeSync } from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import walkSync from 'walk-sync';

import { EmberAppPackage } from '../../src/entities/ember-package';
// import the container so it can be called with the correct root
import { getInternalAddonPackages } from '../../src/index';
import { type EmberPackageContainer } from '../../src/types/package-container';
import {
  registerInternalAddonTestFixtures,
  resetInternalAddonTestFixtures,
} from '../../src/utils/environment';
import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures';

setGracefulCleanup();

describe('Unit | EmberPackage', () => {
  let tmpDir: string;

  function setupAddonFixtures(tmpLocation: string): void {
    writeSync(tmpLocation, FIXTURES);
  }

  function getPathToPackage(...paths: Array<string>): string {
    return resolve(tmpDir, ...paths);
  }

  beforeEach(() => {
    setupTestEnvironment();
    const { name: tmpLocation } = dirSync();
    tmpDir = tmpLocation;
    setupAddonFixtures(tmpDir);

    registerInternalAddonTestFixtures(
      walkSync(tmpDir, {
        globs: ['**/*/package.json'],
        ignore: ['node_modules'],
        includeBasePath: true,
      })
    );
  });

  afterEach(() => {
    resetInternalAddonTestFixtures();
  });

  describe('addonPaths updates', () => {
    test('add an addonPath to a local dependency', function () {
      const pathToRoot = tmpDir;

      const addonPackages = getInternalAddonPackages(pathToRoot);

      const packageContainer: EmberPackageContainer = {
        getInternalAddonPackages: () => addonPackages,
      };

      const emberPackage = new EmberAppPackage(getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON), {
        packageContainer,
      });

      expect(emberPackage.addonPaths.length).toBe(0);

      emberPackage.addAddonPath(addonPackages.mappingsByAddonName[FIXTURE_NAMES.SIMPLE_ENGINE]);

      expect(emberPackage.addonPaths.length).toBe(1);

      expect(emberPackage.addonPaths[0]).toBe(
        relative(
          getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON),
          getPathToPackage(FIXTURE_NAMES.SIMPLE_ENGINE)
        )
      );
    });

    test('remove an addonPath to a local dependency', function () {
      const pathToRoot = tmpDir;

      const addonPackages = getInternalAddonPackages(pathToRoot);

      const packageContainer: EmberPackageContainer = {
        getInternalAddonPackages: () => addonPackages,
      };
      const emberPackage = new EmberAppPackage(getPathToPackage(FIXTURE_NAMES.SIMPLE_ENGINE), {
        packageContainer,
      });

      expect(emberPackage.addonPaths.length).toBe(1);

      emberPackage.removeAddonPath(addonPackages.mappingsByAddonName[FIXTURE_NAMES.SIMPLE_ADDON]);

      expect(emberPackage.addonPaths.length).toBe(0);
    });

    test('does nothing if the desired addon is not part of `ember-addon.paths`', function () {
      const pathToRoot = tmpDir;

      const addonPackages = getInternalAddonPackages(pathToRoot);

      const packageContainer: EmberPackageContainer = {
        getInternalAddonPackages: () => addonPackages,
      };
      const emberPackage = new EmberAppPackage(getPathToPackage(FIXTURE_NAMES.SIMPLE_ENGINE), {
        packageContainer,
      });

      expect(emberPackage.addonPaths.length).toBe(1);

      emberPackage.removeAddonPath(addonPackages.mappingsByAddonName['addon-with-module-name']);

      expect(emberPackage.addonPaths.length).toBe(1);
    });
  });
});
