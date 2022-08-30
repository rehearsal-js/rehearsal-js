import * as parser from '@babel/parser';
import * as t from '@babel/types';
import {
  PackageJson,
  readPackageJson,
  setupTestEnvironment,
} from '@rehearsal/migration-graph-shared';
import { writeSync } from 'fixturify';
import { readFileSync } from 'fs-extra';
import { resolve } from 'path';
import { DirResult, dirSync, setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import walkSync from 'walk-sync';

import { EmberAddonPackage } from '../../src/entities/ember-addon-package';
import { EmberPackage } from '../../src/entities/ember-package';
import {
  getEmberAddonName,
  getPackageMainAST,
  getPackageMainFileName,
  isAddon,
  isEngine,
  requirePackageMain,
  writePackageMain,
} from '../../src/utils/ember';
import {
  registerInternalAddonTestFixtures,
  resetInternalAddonTestFixtures,
} from '../../src/utils/environment';
import { FIXTURE_NAMES, FIXTURES } from '../fixtures/package-fixtures';

setGracefulCleanup();

describe('Unit | ember', () => {
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
    setupTestEnvironment();
    tmpDir = dirSync({ unsafeCleanup: true });

    setupAddonFixtures(tmpDir.name);

    registerInternalAddonTestFixtures(
      walkSync(tmpDir.name, {
        globs: ['**/*/package.json'],
        ignore: ['node_modules'],
        includeBasePath: true,
      })
    );
  });

  afterEach(() => {
    resetInternalAddonTestFixtures();
    // tmpDir.removeCallback();
  });

  describe('simple properties', () => {
    test('packageName', () => {
      expect(new EmberPackage(getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON)).packageName).toBe(
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
    test('isAddon', function () {
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

    // TODO: Fix this test or the type for getPackageMainAST()
    test('getPackageMainAST', () => {
      const simpleAST: parser.ParseResult<t.File> = getPackageMainAST(
        getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON)
      );
      expect(simpleAST).toBeTruthy();

      // We are attempting to validate index.js file was parsed.
      // simpleAST.loc.filename was in the original test
      //
      // simpleAst.program.sourceFile is the typed API that should have a value,
      // but during the execution it works.
      //
      // Casting this as an any because `SourceLocation` eg. `loc` doesn't have a filename property.
      let loc = simpleAST?.loc as t.SourceLocation & { filename: string };
      expect(loc?.filename).toEqual('index.js');

      // assert the ast of the correct file was read in
      const complexAST: parser.ParseResult<t.File> = getPackageMainAST(
        getPathToPackage(FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN)
      );

      expect(complexAST).toBeTruthy();
      loc = complexAST?.loc as t.SourceLocation & { filename: string };
      expect(loc?.filename).toEqual('ember-addon-main.js');
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

  describe('update and write package data', function () {
    test('writePackageAST', async () => {
      const pathToPackage = getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON);
      const packageMainPath = getPathToPackage(FIXTURE_NAMES.SIMPLE_ADDON, 'index.js');
      const original = readFileSync(packageMainPath, 'utf-8');

      const ast = getPackageMainAST(pathToPackage);
      writePackageMain(pathToPackage, ast); // expect

      // Should read the file and validate it exists.
      const modified = readFileSync(packageMainPath, 'utf-8');
      expect(modified).not.toEqual(original);
      expect(modified).toMatchSnapshot('should replace double quotes with single-quotes');
    });
  });
});
