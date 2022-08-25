/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs-extra';
import { setGracefulCleanup, dirSync } from 'tmp';
import { writeSync } from 'fixturify';
import { resolve } from 'path';
import walkSync from 'walk-sync';

import {
  registerInternalAddonTestFixtures,
  setupTestEnvironment,
  resetInternalAddonTestFixtures,
} from '../../../src/-private/utils/test-environment';

import {
  isAddon,
  isEngine,
  getEmberAddonName,
  getPackageMainFileName,
  requirePackageMain,
  getPackageMainAST,
  writePackageMain,
} from '../../../src/-private/utils/ember';

import { PACKAGE_FIXTURE_NAMES, PACKAGE_FIXTURES } from '../../fixtures/package-fixtures';

setGracefulCleanup();

function setupAddonFixtures(tmpLocation: string): void {
  writeSync(tmpLocation, PACKAGE_FIXTURES);
}

describe('Unit | ember', () => {
  let tmpDir: string;

  beforeEach(function () {
    setupTestEnvironment();
    const { name: tmpDirPath } = dirSync();
    tmpDir = tmpDirPath;
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

  describe('simple properties', () => {
    test('isAddon', function () {
      expect(isAddon(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON))).toBe(true);
      expect(isAddon(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE))).toBe(true);
      expect(isAddon(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE))).toBe(false);
    });

    test('isEngine', () => {
      expect(
        isEngine(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)),
        'foo is NOT an engine'
      ).toBe(false);
      expect(
        isEngine(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE)),
        'bar is an engine'
      ).toBe(true);
      expect(
        isEngine(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE)),
        'baz is NOT an engine'
      ).toBe(false);
    });

    test('getPackageMainFileName', () => {
      // return the file name for the packageMain
      expect(
        getPackageMainFileName(
          resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
        )
      ).toEqual('ember-addon-main.js');
    });

    test('requirePackageMain', () => {
      expect(
        requirePackageMain(
          resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
        ).fileName.includes('ember-addon-main.js'),
        'the custom main js file was loaded instead of index'
      ).toBeTruthy();
    });

    // TODO: Fix this test or the type for getPackageMainAST()
    test('getPackageMainAST', () => {
      const simpleAST: any = getPackageMainAST(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON));
      expect(simpleAST).toBeTruthy();

      // We are attempting to validate index.js file was parsed.
      // simpleAST.loc.filename was in the original test
      //
      // simpleAst.program.sourceFile is the typed API that should have a value,
      // but during the execution it works.
      //
      // Casting this as an any because `SourceLocation` eg. `loc` doesn't have a filename property.

      expect(simpleAST.loc.filename).toEqual('index.js');

      // assert the ast of the correct file was read in
      const complexAST: any = getPackageMainAST(
        resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );

      expect(complexAST).toBeTruthy();

      expect(complexAST.loc.filename).toEqual('ember-addon-main.js');
    });
  });

  describe('getEmberAddonName', function () {
    test('getEmberAddonName - simple', () => {
      expect(getEmberAddonName(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE))).toEqual(
        PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE
      );
      expect(
        getEmberAddonName(resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))
      ).toEqual(`${PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`);
    });

    test('getEmberAddonName - complex', () => {
      expect(
        getEmberAddonName(
          resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
        )
      ).toEqual(PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN);
    });
  });

  describe('update and write package data', function () {
    test('writePackageAST', async () => {
      const pathToPackage = resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      const packageMainPath = resolve(pathToPackage, 'index.js');
      const original = readFileSync(packageMainPath, 'utf-8');

      const ast = getPackageMainAST(pathToPackage);
      writePackageMain(pathToPackage, ast); // expect

      // Should read the file and validate it exists.
      const modified = readFileSync(packageMainPath, 'utf-8');
      expect(modified).not.toEqual(original);
      expect(modified).toMatchSnapshot('should replace quotes with single-quotes');
    });
  });
});
