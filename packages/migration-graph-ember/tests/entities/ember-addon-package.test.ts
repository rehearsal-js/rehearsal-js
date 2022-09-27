import { setupTestEnvironment } from '@rehearsal/migration-graph-shared';
import { writeSync } from 'fixturify';
import { resolve } from 'path';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import walkSync from 'walk-sync';

import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import {
  registerInternalAddonTestFixtures,
  resetInternalAddonTestFixtures,
} from '../../src/utils/environment';
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

    test('packageMain', () => {
      expect(
        new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON)).packageMain,
        'fetch the name of the main file'
      ).toBe('index.js');

      expect(
        new EmberAddonPackage(
          resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
        ).packageMain,
        'fetch the name of the main file'
      ).toBe('ember-addon-main.js');
    });
  });

  describe('package main updates', function () {
    test('setAddonName', () => {
      const simpleAddon = new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON));
      expect(simpleAddon.name, FIXTURE_NAMES.SIMPLE_ADDON);
      simpleAddon.setAddonName('taco');
      expect(simpleAddon.name, 'name is unchanged until write happens').toBe(
        FIXTURE_NAMES.SIMPLE_ADDON
      );
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.name, 'name is changed after the main is written').toBe('taco');
    });

    test('setAddonName - more complex packageMain', () => {
      const simpleAddon = new EmberAddonPackage(
        resolve(pathToPackage, FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN)
      );
      expect(simpleAddon.name).toBe(FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN);
      simpleAddon.setAddonName('taco');
      expect(simpleAddon.name, 'name is unchanged until write happens').toBe(
        FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN
      );
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.name, 'name is changed after the main is written').toBe('taco');
    });

    test('setModuleName - simple', () => {
      const simpleAddon = new EmberAddonPackage(resolve(pathToPackage, FIXTURE_NAMES.SIMPLE_ADDON));
      expect(simpleAddon.moduleName, undefined);
      simpleAddon.setModuleName('taco');
      expect(simpleAddon.moduleName, undefined);

      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.moduleName, 'taco');
    });

    test('setModuleName - complex', () => {
      const complexAddon = new EmberAddonPackage(
        resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );
      expect(complexAddon.moduleName).toBe(FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN);
      complexAddon.setModuleName('taco');
      expect(complexAddon.moduleName, 'name is unchanged until write happens').toBe(
        FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN
      );
      complexAddon.writePackageMainToDisk();
      expect(complexAddon.moduleName, 'name is changed after the main is written').toBe('taco');
    });

    test('removeModuleName - simple', () => {
      const complexAddon = new EmberAddonPackage(
        resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
      );
      expect(complexAddon.moduleName, FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN);
      complexAddon.removeModuleName();
      expect(complexAddon.moduleName, 'name is unchanged until write happens').toBe(
        FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN
      );
      complexAddon.writePackageMainToDisk();
      expect(complexAddon.moduleName, 'name is changed after the main is written').toBe(undefined);
    });

    test('removeModuleName - complex', () => {
      const simpleAddon = new EmberAddonPackage(
        resolve(pathToPackage, FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );
      expect(simpleAddon.moduleName, FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN);
      simpleAddon.removeModuleName();
      expect(simpleAddon.moduleName, 'name is unchanged until write happens').toBe(
        FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN
      );
      simpleAddon.writePackageMainToDisk();
      expect(simpleAddon.moduleName, 'name is changed after the main is written').toBe(undefined);
    });
  });
});
