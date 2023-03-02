import { resolve } from 'node:path';
import { writeSync } from 'fixturify';
import { readJsonSync } from 'fs-extra/esm';
import { DirResult, dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { Package } from '../../src/entities/package.js';
import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures.js';

setGracefulCleanup();

describe('Unit | Entities | Package', function () {
  let pathToPackage: string;
  let tmpDir: DirResult;

  function setupFixtures(somePath: string): void {
    writeSync(somePath, FIXTURES);
  }

  function getPathToPackage(packageName: string): string {
    return resolve(tmpDir.name, packageName);
  }

  beforeEach(function () {
    tmpDir = dirSync({ unsafeCleanup: true });
    setupFixtures(tmpDir.name);
    // Setup re-used test variables
    pathToPackage = getPathToPackage(FIXTURE_NAMES.PLAIN_PACKAGE);
  });

  describe('getters', () => {
    test('packageName', () => {
      const p = new Package(pathToPackage);
      expect(p.packageName).toBe(FIXTURE_NAMES.PLAIN_PACKAGE);
    });

    test('packageJson', () => {
      const somePackageJson = new Package(pathToPackage).packageJson;

      // returns an object
      expect(somePackageJson).toBeTypeOf('object');
      // has expected fields
      expect(somePackageJson['name']).toBeTruthy();
      expect(somePackageJson['version']).toBeTruthy();
      expect(somePackageJson['keywords']).toBeTruthy();
    });
  });

  describe('include/exclude patterns', () => {
    test('defaults', () => {
      const p = new Package(pathToPackage);
      expect(p.excludePatterns).toStrictEqual(
        new Set([
          '.yarn',
          'dist',
          '.eslintrc.*',
          '.babelrc.*',
          'babel.config.*',
          'Brocfile.js',
          '.prettierrc.*',
          'prettier.config.*',
          'karma.config.*',
          'webpack.config.js',
          'vite.config.ts',
        ])
      );
      expect(p.includePatterns).toStrictEqual(new Set(['.']));
    });

    test('set excludePatterns ', () => {
      const p = new Package(pathToPackage);
      p.excludePatterns = new Set(['dist', 'test-packages']);
      expect(p.excludePatterns).toStrictEqual(new Set(['dist', 'test-packages']));
    });

    test('set includePatterns ', () => {
      const p = new Package(pathToPackage);
      p.includePatterns = new Set(['src/**/*.js']);
      expect(p.includePatterns).toStrictEqual(new Set(['src/**/*.js']));
    });

    test('addExcludePattern', () => {
      const p = new Package(pathToPackage);
      p.addExcludePattern('test-packages');
      expect(p.excludePatterns).toStrictEqual(
        new Set([
          '.yarn',
          'dist',
          '.eslintrc.*',
          '.babelrc.*',
          'babel.config.*',
          'Brocfile.js',
          '.prettierrc.*',
          'prettier.config.*',
          'karma.config.*',
          'webpack.config.js',
          'vite.config.ts',
          'test-packages',
        ])
      );

      p.addIncludePattern('index.js');
      expect(p.includePatterns).toStrictEqual(new Set(['.', 'index.js']));
      p.addExcludePattern('index.js');
      expect(
        p.includePatterns,
        'should remove index.js from excludes if addExcludePattern called with that value'
      ).toStrictEqual(new Set(['.']));
    });

    test('addIncludePattern', () => {
      const p = new Package(pathToPackage);
      p.addIncludePattern('foo.js');
      expect(p.includePatterns.has('foo.js')).toBeTruthy();
      expect(p.includePatterns).toStrictEqual(new Set(['.', 'foo.js']));

      p.addIncludePattern('file1', 'file2');
      expect(p.includePatterns).toStrictEqual(new Set(['.', 'foo.js', 'file1', 'file2']));

      p.excludePatterns = new Set(['tests']);
      expect(p.excludePatterns.has('tests')).toBe(true);
      p.addIncludePattern('tests');
      expect(
        p.excludePatterns.has('tests'),
        'should remove tests from excludes if addIncludePattern'
      ).toBe(false);
    });
  });

  describe('mutation', function () {
    test('set packageName', () => {
      const p = new Package(pathToPackage);
      expect(p.packageName).toBe(FIXTURE_NAMES.PLAIN_PACKAGE);
      p.setPackageName('taco');
      expect(p.packageName).toBe('taco');
    });

    test('add entry from PackageJson - simple', () => {
      const p = new Package(pathToPackage);
      expect(p.packageJson['taco']).toBe(undefined);
      p.addPackageJsonKey('taco', 5);
      expect(p.packageJson['taco']).toBe(5);
    });

    test('add entry from PackageJson - complex', () => {
      const p = new Package(pathToPackage);
      expect(p.packageJson['taco']).toBeUndefined();

      p.addPackageJsonKey('taco', { total: 5 });
      expect(p.packageJson['taco'].total, 'passing an object works').toBe(5);

      p.addPackageJsonKey('foo.bar.baz', 'bold of you to assume good naming');

      expect(p.packageJson['foo'], 'top level field was added').toBeTruthy;
      expect(p.packageJson['foo'].bar, 'penultimate field was added').toBeTruthy;
      expect(p.packageJson['foo'].bar.baz, 'leaf field was added').toBeTruthy;
      expect(p.packageJson['foo'].bar.baz, 'bold of you to assume good naming').toBeTruthy();
    });

    test('remove entry from PackageJson - simple', () => {
      const p = new Package(pathToPackage);
      expect(p.packageJson['name']).toBe(FIXTURE_NAMES.PLAIN_PACKAGE);
      p.removePackageJsonKey('name');
      expect(p.packageJson['name']).toBeUndefined();
    });

    test('remove entry from PackageJson - complex', () => {
      const p = new Package(pathToPackage);
      expect(
        p.packageJson['some-package-key'].paths.length,
        'some-package-key.paths has 1 entry'
      ).toBe(1);
      p.removePackageJsonKey('some-package-key.paths');
      expect(
        p.packageJson['some-package-key'].paths,
        'some-package-key.paths is gone'
      ).toBeUndefined();
    });

    test('add dependency', () => {
      const p = new Package(pathToPackage);
      expect(p.packageJson['dependencies']).toBeUndefined();
      p.addDependency('foo', '1.0.0');
      expect(Object.keys(p.packageJson['dependencies']).length).toBe(1);
      expect(p.packageJson['dependencies'].foo).toBe('1.0.0');
    });

    test('remove dependency', () => {
      const pathToPackage = getPathToPackage(FIXTURE_NAMES.PLAIN_PACKAGE_WITH_DEPENDENCIES);
      const p = new Package(pathToPackage);
      expect(Object.keys(p.packageJson['dependencies']).length).toBe(1);
      p.removeDependency('bar');
      expect(Object.keys(p.packageJson['dependencies']).length).toBe(0);
    });

    test('add devDependency', () => {
      const p = new Package(pathToPackage);
      expect(p.packageJson['devDependencies']).toBeUndefined();
      p.addDevDependency('foo', '1.0.0');
      expect(Object.keys(p.packageJson['devDependencies']).length).toBe(1);
      expect(p.packageJson['devDependencies'].foo).toBe('1.0.0');
    });

    test('remove devDependency', () => {
      const pathToPackage = getPathToPackage(FIXTURE_NAMES.PLAIN_PACKAGE_WITH_DEPENDENCIES);
      const p = new Package(pathToPackage);
      expect(Object.keys(p.packageJson['devDependencies']).length).toBe(1);
      p.removeDevDependency('bar');
      expect(Object.keys(p.packageJson['devDependencies']).length).toBe(0);
    });

    test('write package.json to disk', () => {
      const p = new Package(pathToPackage);
      const originalPackageJson = p.packageJson;
      expect(originalPackageJson['taco']).toBeUndefined();
      p.addPackageJsonKey('taco', 'al pastor');
      p.writePackageJsonToDisk();
      expect(readJsonSync(resolve(p.path, 'package.json')).taco).toBe('al pastor');
    });
  });

  describe('isConvertedToTypescript', () => {
    test('should be false for plain package', () => {
      const p = new Package(pathToPackage);
      expect(p.isConvertedToTypescript()).toBe(false);
    });
    test('should be true if tsconfig.json and atleast one .ts file exists', () => {
      pathToPackage = getPathToPackage(FIXTURE_NAMES.PACKAGE_CONTAINS_TYPESCRIPT);
      const p = new Package(pathToPackage);
      expect(p.isConvertedToTypescript()).toBe(true);
    });
    test('should be true if tsconfig.json and atleast one .ts file exists', () => {
      pathToPackage = getPathToPackage(FIXTURE_NAMES.PACKAGE_CONTAINS_TYPESCRIPT);
      const p = new Package(pathToPackage);
      expect(p.isConvertedToTypescript()).toBe(true);
    });
  });
});
