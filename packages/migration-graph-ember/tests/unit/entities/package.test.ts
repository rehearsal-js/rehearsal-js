import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { setGracefulCleanup, dirSync } from 'tmp';
import { writeSync } from 'fixturify';
import { resolve } from 'path';
import walkSync from 'walk-sync';
import { readJsonSync } from 'fs-extra';

import {
  registerInternalAddonTestFixtures,
  setupTestEnvironment,
  resetInternalAddonTestFixtures,
} from '../../../src/-private/utils/test-environment';
import { PACKAGE_FIXTURE_NAMES, PACKAGE_FIXTURES } from '../../fixtures/package-fixtures';
import { Package } from '../../../src/-private/entities/package';

setGracefulCleanup();

function setupAddonFixtures(tmpLocation): void {
  writeSync(tmpLocation, PACKAGE_FIXTURES);
}

describe('Unit | Package', function () {
  let pathToPackage: string;

  beforeEach(function () {
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
    test('packageName', () => {
      expect(
        new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)).packageName
      ).toBe(PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      expect(
        new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))
          .packageName,
        'fetch the name property even if module name is defined'
      ).toBe(PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME);
    });

    test('packageJson', () => {
      const somePackage = new Package(
        resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)
      ).getPackageJson();

      // returns an object
      expect(somePackage).toBeTypeOf('object');
      // has expected fields
      expect(somePackage.name).toBeTruthy();
      expect(somePackage.version).toBeTruthy();
      expect(somePackage.keywords).toBeTruthy();
    });
  });

  describe('package updates', function () {
    test('setPackageName', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(somePackage.packageName).toBe(PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      somePackage.setPackageName('taco');
      expect(somePackage.packageName).toBe('taco');
    });

    test('addPackageJsonKey - simple', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(somePackage.getPackageJson().taco).toBe(undefined);
      somePackage.addPackageJsonKey('taco', 5);
      expect(somePackage.getPackageJson().taco).toBe(5);
    });

    test('addPackageJsonKey - complex', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(somePackage.getPackageJson().taco).toBeUndefined();

      somePackage.addPackageJsonKey('taco', { total: 5 });
      expect(somePackage.getPackageJson().taco.total, 'passing an object works').toBe(5);

      somePackage.addPackageJsonKey('foo.bar.baz', 'bold of you to assume good naming');

      expect(somePackage.getPackageJson().foo, 'top level field was added').toBeTruthy;
      expect(somePackage.getPackageJson().foo.bar, 'penultimate field was added').toBeTruthy;
      expect(somePackage.getPackageJson().foo.bar.baz, 'leaf field was added').toBeTruthy;

      expect(
        somePackage.getPackageJson().foo.bar.baz,
        'bold of you to assume good naming'
      ).toBeTruthy();
    });

    test('removePackageJsonKey - simple', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(somePackage.getPackageJson().name).toBe(PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      somePackage.removePackageJsonKey('name');
      expect(somePackage.getPackageJson().name).toBeUndefined();
    });

    test('removePackageJsonKey - complex', () => {
      const _package = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE));
      expect(
        _package.getPackageJson()['ember-addon'].paths.length,
        'ember-addon.paths has 1 entry'
      ).toBe(1);
      _package.removePackageJsonKey('ember-addon.paths');
      expect(
        _package.getPackageJson()['ember-addon'].paths,
        'ember-addon.paths is gone'
      ).toBeUndefined();
    });

    test('addDependency', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(somePackage.getPackageJson().dependencies).toBeUndefined();
      somePackage.addDependency('foo', '1.0.0');
      expect(Object.keys(somePackage.getPackageJson().dependencies).length).toBe(1);
      expect(somePackage.getPackageJson().dependencies.foo).toBe('1.0.0');
    });

    test('removeDependency', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE));
      expect(Object.keys(somePackage.getPackageJson().dependencies).length).toBe(1);
      somePackage.removeDependency('foo');
      expect(Object.keys(somePackage.getPackageJson().dependencies).length).toBe(0);
    });

    test('addDevDependency', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(somePackage.getPackageJson().devDependencies).toBeUndefined();
      somePackage.addDevDependency('foo', '1.0.0');
      expect(Object.keys(somePackage.getPackageJson().devDependencies).length).toBe(1);
      expect(somePackage.getPackageJson().devDependencies.foo).toBe('1.0.0');
    });

    test('removeDevDependency', () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE));
      expect(Object.keys(somePackage.getPackageJson().devDependencies).length).toBe(1);
      somePackage.removeDevDependency('bar');
      expect(Object.keys(somePackage.getPackageJson().devDependencies).length).toBe(0);
    });

    test('writePackageJsonToDisk', async () => {
      const somePackage = new Package(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE));
      const originalJson = somePackage.getPackageJson();
      expect(originalJson.taco).toBeUndefined();
      somePackage.addPackageJsonKey('taco', 'al pastor');
      somePackage.writePackageJsonToDisk();
      expect(readJsonSync(resolve(somePackage.path, 'package.json')).taco).toBe('al pastor');
    });
  });
});
