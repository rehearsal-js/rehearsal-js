import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import tmp from 'tmp';
import fixturify from 'fixturify';
import path from 'path';
import walkSync from 'walk-sync';

import {
  registerInternalAddonTestFixtures,
  setupTestEnvironment,
  resetInternalAddonTestFixtures,
} from '../../../dist/src/utils/test-environment';

import { PACKAGE_FIXTURE_NAMES, PACKAGE_FIXTURES } from '../../fixtures/package-fixtures';

import { EmberPackage } from '../../../src/-private/entities/ember-package';

// import the container so it can be called with the correct root
import { getInternalAddonPackages } from '../../../src/index';
import { type PackageContainer } from '../../../src/-private/types/package-container';

tmp.setGracefulCleanup();

function setupAddonFixtures(tmpLocation: string) {
  fixturify.writeSync(tmpLocation, PACKAGE_FIXTURES);
}

describe('Unit | EmberPackage', () => {
  let pathToPackage: string;

  beforeEach(() => {
    setupTestEnvironment();
    const { name: tmpLocation } = tmp.dirSync();
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

  describe('addonPaths updates', () => {
    test('add an addonPath to a local dependency', function (assert) {
      const pathToRoot = pathToPackage;

      const addonPackages = getInternalAddonPackages(pathToRoot);

      const packageContainer = {
        getInternalAddonPackages: () => addonPackages,
      };

      const addon = new EmberPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON),
        {
          packageContainer,
        }
      );

      expect(addon.addonPaths.length).toBe(0);

      addon.addAddonPath(addonPackages.mappingsByAddonName[PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE]);

      expect(addon.addonPaths.length).toBe(1);

      expect(addon.addonPaths[0]).toBe(
        path.relative(
          path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON),
          path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE)
        )
      );
    });

    test('remove an addonPath to a local dependency', function (assert) {
      const addonPackages = getInternalAddonPackages(pathToPackage);

      const packageContainer: PackageContainer = {
        getInternalAddonPackages: () => addonPackages,
      };
      const addon = new EmberPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE),
        {
          packageContainer,
        }
      );

      expect(addon.addonPaths.length).toBe(1);

      addon.removeAddonPath(addonPackages.mappingsByAddonName[PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON]);

      expect(addon.addonPaths.length).toBe(0);
    });

    test('does nothing if the desired addon is not part of `ember-addon.paths`', function (assert) {
      const addonPackages = getInternalAddonPackages(pathToPackage);

      const packageContainer = {
        getInternalAddonPackages: () => addonPackages,
      };
      const addon = new EmberPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE),
        {
          packageContainer,
        }
      );

      expect(addon.addonPaths.length).toBe(1);

      addon.removeAddonPath(addonPackages.mappingsByAddonName['addon-with-module-name']);

      expect(addon.addonPaths.length).toBe(1);
    });
  });
});
