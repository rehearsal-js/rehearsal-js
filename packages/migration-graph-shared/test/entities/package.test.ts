import { resolve } from 'node:path';
import { writeSync } from 'fixturify';
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
          '.eslintrc.*',
          '.babelrc.*',
          'babel.config.*',
          'Brocfile.js',
          '.prettierrc.*',
          'prettier.config.*',
          'karma.config.*',
          '.rehearsal-eslintrc.js',
          'webpack.config.js',
          'vite.config.ts',
          '.yarn',
          'dist',
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
      expect(p.excludePatterns.has('test-packages')).toBeTruthy();

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

  describe('isConvertedToTypescript', () => {
    test('should be false for plain package', () => {
      const p = new Package(pathToPackage);
      expect(p.isConvertedToTypescript()).toBe(false);
    });
    test('should be true if tsconfig.json and at least one .ts file exists', () => {
      pathToPackage = getPathToPackage(FIXTURE_NAMES.PACKAGE_CONTAINS_TYPESCRIPT);
      const p = new Package(pathToPackage);
      expect(p.isConvertedToTypescript()).toBe(true);
    });
    test('should be true if tsconfig.json and at least one .ts file exists', () => {
      pathToPackage = getPathToPackage(FIXTURE_NAMES.PACKAGE_CONTAINS_TYPESCRIPT);
      const p = new Package(pathToPackage);
      expect(p.isConvertedToTypescript()).toBe(true);
    });
  });
});
