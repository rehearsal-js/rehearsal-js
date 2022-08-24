import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import tmp from 'tmp';
import fixturify from 'fixturify';
import path from 'path';
import walkSync from 'walk-sync';

import {
  registerInternalAddonTestFixtures,
  setupTestEnvironment,
  resetInternalAddonTestFixtures,
} from '../../../src/-private/utils/test-environment';

import { PACKAGE_FIXTURE_NAMES, PACKAGE_FIXTURES } from '../../fixtures/package-fixtures';

import { EmberAddonPackage } from '../../../src/-private/entities/ember-addon-package';

tmp.setGracefulCleanup();

function setupAddonFixtures(tmpLocation: string) {
  fixturify.writeSync(tmpLocation, PACKAGE_FIXTURES);
}

describe('Unit | EmberAddonPackage', () => {
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

  describe('simple properties', () => {
    test('isEngine', () => {
      expect(
        new EmberAddonPackage(path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE))
          .isEngine
      ).toBe(true);
      expect(
        new EmberAddonPackage(path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON))
          .isEngine,
        'foo is NOT engine'
      ).toBe(false);
    });

    test('name', () => {
      expect(
        new EmberAddonPackage(path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)).name
      ).toBe(PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      expect(
        new EmberAddonPackage(
          path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME)
        ).packageName,
        'fetch the name property even if module name is defined'
      ).toBe(PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME);
    });

    test('moduleName', () => {
      expect(
        new EmberAddonPackage(
          path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME)
        ).moduleName
      ).toBe(`${PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`);
    });

    test('packageMain', () => {
      expect(
        new EmberAddonPackage(path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON))
          .packageMain,
        'fetch the name of the main file'
      ).toBe('index.js');

      expect(
        new EmberAddonPackage(
          path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
        ).packageMain,
        'fetch the name of the main file'
      ).toBe('ember-addon-main.js');
    });
  });

  describe('package main updates', function () {
    test('setAddonName', async () => {
      const simpleAddon = new EmberAddonPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)
      );
      expect(simpleAddon.name, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      simpleAddon.setAddonName('taco');
      expect(simpleAddon.name, 'name is unchanged until write happens').toBe(
        PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON
      );
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.name, 'name is changed after the main is written').toBe('taco');
    });

    test('setAddonName - more complex packageMain', async () => {
      const simpleAddon = new EmberAddonPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN)
      );
      expect(simpleAddon.name).toBe(PACKAGE_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN);
      simpleAddon.setAddonName('taco');
      expect(simpleAddon.name, 'name is unchanged until write happens').toBe(
        PACKAGE_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN
      );
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.name, 'name is changed after the main is written').toBe('taco');
    });

    test('setModuleName - simple', async () => {
      const simpleAddon = new EmberAddonPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)
      );
      expect(simpleAddon.moduleName, undefined);
      simpleAddon.setModuleName('taco');
      expect(simpleAddon.moduleName, undefined, 'name is unchanged until write happens');
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.moduleName, 'taco', 'name is changed after the main is written');
    });

    test('setModuleName - complex', async () => {
      const complexAddon = new EmberAddonPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );
      expect(complexAddon.moduleName).toBe(
        PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN
      );
      complexAddon.setModuleName('taco');
      expect(complexAddon.moduleName, 'name is unchanged until write happens').toBe(
        PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN
      );
      complexAddon.writePackageMainToDisk();
      expect(complexAddon.moduleName, 'name is changed after the main is written').toBe('taco');
    });

    test('removeModuleName - simple', async () => {
      const complexAddon = new EmberAddonPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
      );
      expect(complexAddon.moduleName, PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN);
      complexAddon.removeModuleName();
      expect(complexAddon.moduleName, 'name is unchanged until write happens').toBe(
        PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN
      );
      complexAddon.writePackageMainToDisk();
      expect(complexAddon.moduleName, 'name is changed after the main is written').toBe(undefined);
    });

    test('removeModuleName - complex', async () => {
      const simpleAddon = new EmberAddonPackage(
        path.resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );
      expect(simpleAddon.moduleName, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN);
      simpleAddon.removeModuleName();
      expect(simpleAddon.moduleName, 'name is unchanged until write happens').toBe(
        PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN
      );
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.moduleName, 'name is changed after the main is written').toBe(undefined);
    });
  });
});
