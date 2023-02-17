import { resolve } from 'path';

import { PackageJson, readPackageJson } from '@rehearsal/migration-graph-shared';
import { writeSync } from 'fixturify';
import { DirResult, dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import { EmberAppPackage } from '../../src/entities/ember-app-package';

import {
  getEmberAddonName,
  getPackageMainFileName,
  isApp,
  isAddon,
  isEngine,
  requirePackageMain,
} from '../../src/utils/ember';

import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures';

setGracefulCleanup();

describe('Unit | utils | ember', () => {
  let tmpDir: DirResult;

  function getPackageJson(...paths: Array<string>): PackageJson {
    return readPackageJson(getPathToPackage(...paths));
  }

  function getPathToPackage(...paths: Array<string>): string {
    return resolve(tmpDir.name, ...paths);
  }

  function setupAddonFixtures(tmpLocation: string): void {
    writeSync(tmpLocation, FIXTURES);
  }

  beforeEach(function () {
    tmpDir = dirSync({ unsafeCleanup: true });
    setupAddonFixtures(tmpDir.name);
  });

  describe('simple properties', () => {
    test('packageName', () => {
      expect(new EmberAppPackage(getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON)).packageName).toBe(
        FIXTURE_NAMES.SIMPLE_ADDON
      );
      expect(
        new EmberAddonPackage(getPathToPackage(FIXTURE_NAMES.ADDON_WITH_MODULE_NAME)).packageName,
        'fetch the name property even if module name is defined'
      ).toBe(FIXTURE_NAMES.ADDON_WITH_MODULE_NAME);
    });

    test('packageJson', () => {
      const somePackage = new EmberAddonPackage(getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON))
        .packageJson;

      // returns an object
      expect(somePackage).toBeTypeOf('object');
      // has expected fields
      expect(somePackage.name).toBeTruthy();
      expect(somePackage.version).toBeTruthy();
      expect(somePackage.keywords).toBeTruthy();
    });

    test('isApp', () => {
      expect(isApp(getPackageJson(FIXTURE_NAMES.SIMPLE_APP))).toBe(true);
      expect(isApp(getPackageJson(FIXTURE_NAMES.SIMPLE_ADDON))).toBe(false);
      expect(isApp(getPackageJson(FIXTURE_NAMES.SIMPLE_ENGINE))).toBe(false);
      expect(isApp(getPackageJson(FIXTURE_NAMES.PLAIN_PACKAGE))).toBe(false);
    });

    test('isAddon', () => {
      expect(isAddon(getPackageJson(FIXTURE_NAMES.SIMPLE_ADDON))).toBe(true);
      expect(isAddon(getPackageJson(FIXTURE_NAMES.SIMPLE_ENGINE))).toBe(true);
      expect(isAddon(getPackageJson(FIXTURE_NAMES.PLAIN_PACKAGE))).toBe(false);
    });

    test('isEngine', () => {
      expect(isEngine(getPackageJson(FIXTURE_NAMES.SIMPLE_ADDON)), 'foo is NOT an engine').toBe(
        false
      );
      expect(isEngine(getPackageJson(FIXTURE_NAMES.SIMPLE_ENGINE)), 'bar is an engine').toBe(true);
      expect(isEngine(getPackageJson(FIXTURE_NAMES.PLAIN_PACKAGE)), 'baz is NOT an engine').toBe(
        false
      );
    });

    test('getPackageMainFileName', () => {
      // return the file name for the packageMain
      expect(
        getPackageMainFileName(
          getPathToPackage(FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
        )
      ).toEqual('ember-addon-main.js');
    });

    test('requirePackageMain', () => {
      expect(
        requirePackageMain(
          getPathToPackage(FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
        ).fileName.includes('ember-addon-main.js'),
        'the custom main js file was loaded instead of index'
      ).toBeTruthy();
    });
  });

  describe('getEmberAddonName', function () {
    test('getEmberAddonName - simple', () => {
      expect(getEmberAddonName(getPathToPackage(FIXTURE_NAMES.SIMPLE_ENGINE))).toEqual(
        FIXTURE_NAMES.SIMPLE_ENGINE
      );
      expect(getEmberAddonName(getPathToPackage(FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))).toEqual(
        `${FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`
      );
    });

    test('getEmberAddonName - complex', () => {
      expect(
        getEmberAddonName(getPathToPackage(FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN))
      ).toEqual(FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN);
    });
  });
});
