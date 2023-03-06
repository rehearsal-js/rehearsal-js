import { resolve } from 'node:path';
import { describe, test, expect, beforeEach } from 'vitest';
import { writeSync } from 'fixturify';
import { DirResult, dirSync, setGracefulCleanup } from 'tmp';
import { FIXTURES, FIXTURE_NAMES } from '../fixtures/package-fixtures.js';
import { EmberAppPackage } from '../../src/entities/ember-app-package.js';
import { getEmberExcludePatterns } from '../../src/utils/excludes.js';

setGracefulCleanup();

describe('Unit | Entities | EmberAppPackage', () => {
  let rootDir: string;
  let tmpDir: DirResult;

  function setupFixtures(somePath: string): void {
    writeSync(somePath, FIXTURES);
  }

  function getPathToPackage(...paths: Array<string>): string {
    return resolve(tmpDir.name, ...paths);
  }

  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true });
    setupFixtures(tmpDir.name);
    rootDir = getPathToPackage(FIXTURE_NAMES.SIMPLE_APP);
  });

  test('should get packageName', () => {
    const emberAppPackage = new EmberAppPackage(rootDir);
    expect(emberAppPackage.packageName).toBe('simple-app');
  });

  test('should return addonPaths from package.json', () => {
    const emberAppPackage = new EmberAppPackage(rootDir);
    expect(emberAppPackage.addonPaths).toStrictEqual([]);
  });

  test('should have common ember excludes', () => {
    const pkg = new EmberAppPackage(rootDir);

    const excludes = getEmberExcludePatterns();

    expect.assertions(excludes.length);

    excludes.forEach((pattern) => {
      expect(
        pkg.excludePatterns.has(pattern),
        `expect EmberrAddonPackage to exclude ${pattern}`
      ).toBeTruthy();
    });
  });

  test('should exclude addonPaths', () => {
    rootDir = getPathToPackage(FIXTURE_NAMES.APP_WITH_IN_REPO_ADDONS);
    const emberAppPackage = new EmberAppPackage(rootDir);
    expect(emberAppPackage.excludePatterns.has('lib/some-addon')).toBe(true);
    expect(emberAppPackage.excludePatterns.has('lib/some-engine')).toBe(true);
  });

  test.todo('should return a graph of files for the package', () => {
    expect(false).toBe(true);
  });
});
