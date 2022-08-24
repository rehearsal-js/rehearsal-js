import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import tmp from 'tmp';
import fixturify from 'fixturify';
import path from 'path';
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

tmp.setGracefulCleanup();

function setupAddonFixtures(tmpLocation: string) {
  fixturify.writeSync(tmpLocation, PACKAGE_FIXTURES);
}

describe('Unit | ember', () => {
  let tmpDir: string;

  beforeEach(function () {
    setupTestEnvironment();
    const { name: tmpDirPath } = tmp.dirSync();
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
      expect(isAddon(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON))).toBe(true);
      expect(isAddon(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE))).toBe(true);
      expect(isAddon(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE))).toBe(false);
    });

    test('isEngine', () => {
      expect(
        isEngine(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)),
        'foo is NOT an engine'
      ).toBe(false);
      expect(
        isEngine(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE)),
        'bar is an engine'
      ).toBe(true);
      expect(
        isEngine(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE)),
        'baz is NOT an engine'
      ).toBe(false);
    });

    test('getPackageMainFileName', () => {
      // return the file name for the packageMain
      expect(
        getPackageMainFileName(
          path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
        )
      ).toEqual('ember-addon-main.js');
    });

    test('requirePackageMain', () => {
      expect(
        requirePackageMain(
          path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN)
        ).fileName.includes('ember-addon-main.js'),
        'the custom main js file was loaded instead of index'
      ).toBeTruthy();
    });

    // TODO: Fix this test or the type for getPackageMainAST()
    test('getPackageMainAST', () => {
      const simpleAST: any = getPackageMainAST(
        path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)
      );
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
        path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );

      expect(complexAST).toBeTruthy();

      expect(complexAST.loc.filename).toEqual('ember-addon-main.js');
    });
  });

  describe('getEmberAddonName', function () {
    test('getEmberAddonName - simple', () => {
      expect(getEmberAddonName(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE))).toEqual(
        PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE
      );
      expect(
        getEmberAddonName(path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME))
      ).toEqual(`${PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`);
    });

    test('getEmberAddonName - complex', () => {
      expect(
        getEmberAddonName(
          path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
        )
      ).toEqual(PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN);
    });
  });

  describe('update and write package data', function () {
    test('writePackageAST', async () => {
      const pathToPackage = path.resolve(tmpDir, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON);
      const packageMainPath = path.resolve(pathToPackage, 'index.js');
      const original = fs.readFileSync(packageMainPath, 'utf-8');

      const ast = getPackageMainAST(pathToPackage);
      writePackageMain(pathToPackage, ast); // expect

      // Should read the file and validate it exists.
      const modified = fs.readFileSync(packageMainPath, 'utf-8');
      expect(modified).not.toEqual(original);
      expect(modified).toMatchSnapshot('should replace quotes with single-quotes');
    });
  });
});
