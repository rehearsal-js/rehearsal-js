import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fixturify from 'fixturify';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs';
import walkSync from 'walk-sync';

import { PACKAGE_FIXTURE_NAMES, PACKAGE_FIXTURES } from './fixtures/package-fixtures';

import { getInternalModuleMappings, getExternalModuleMappings } from '../src/index';

import {
  registerInternalAddonTestFixtures,
  resetInternalAddonTestFixtures,
  setupTestEnvironment,
} from '../src/utils/test-environment';

tmp.setGracefulCleanup();

describe('Smoke Test', () => {
  describe('getInternalModuleMappings', () => {
    let pathToRoot: string;

    function setupInternalAddonFixtures(someTmpDir: string) {
      fixturify.writeSync(someTmpDir, PACKAGE_FIXTURES);
    }

    beforeEach(() => {
      setupTestEnvironment();
      const { name: someTmpDir } = tmp.dirSync();
      pathToRoot = someTmpDir;
      setupInternalAddonFixtures(pathToRoot);

      registerInternalAddonTestFixtures(
        walkSync(pathToRoot, {
          globs: ['**/*/package.json'],
          ignore: ['node_modules'],
          includeBasePath: true,
        })
      );
    });

    afterEach(() => {
      resetInternalAddonTestFixtures();
    });

    test('the correct internal module-mappings exist for simple mappings', function () {
      const { mappingsByAddonName, mappingsByLocation } = getInternalModuleMappings(pathToRoot);

      const simpleAddon = mappingsByAddonName[PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON];
      const simpleEngine = mappingsByAddonName[PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE];

      expect(simpleAddon, `module mappings '${PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE}'`).toBeTruthy();

      expect(simpleEngine, `module mappings '${PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE}'`).toBeTruthy();

      expect(simpleAddon, 'to have an associated mapping by location for `foo`').toBe(
        mappingsByLocation[simpleAddon.location]
      );

      expect(simpleEngine, 'to have an associated mapping by location for `bar`').toBe(
        mappingsByLocation[simpleEngine.location]
      );

      expect(simpleAddon.location, `${simpleAddon.name}'s location is correct`).toBe(
        path.resolve(pathToRoot, PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON)
      );

      expect(simpleEngine.location, `${simpleEngine.name}'s location is correct`).toBe(
        path.resolve(pathToRoot, PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE)
      );
    });

    test('it works correctly for addons that specify a custom `moduleName`', () => {
      const { mappingsByAddonName } = getInternalModuleMappings(pathToRoot);

      const customAddonName = mappingsByAddonName[PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME];

      expect(customAddonName, 'module mappings exists for `addon-with-module-name`').toBeTruthy();

      expect(customAddonName.moduleName).toEqual(
        `${PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`
      );
      expect(customAddonName.packageName).toEqual('addon-with-module-name');
    });

    test('it works correctly workspace packages', () => {
      const { mappingsByAddonName } = getInternalModuleMappings(
        path.resolve(pathToRoot, PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER)
      );

      const simpleWorkspace =
        mappingsByAddonName[PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER];

      expect(simpleWorkspace, 'module mappings exists for `foo-workspace`').toBeTruthy();
      expect(simpleWorkspace.isWorkspace).toBe(true);
    });

    test('it works correctly for addons with a custom addon main file', () => {
      const { mappingsByAddonName } = getInternalModuleMappings(pathToRoot);

      expect(
        mappingsByAddonName[PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN],
        'an internal module mapping exists for `addon-with-custom-main`'
      ).toBeTruthy();
    });
  });

  describe('`getExternalModuleMappings`', () => {
    function json(jsonObj = {}) {
      return JSON.stringify(jsonObj, null, 2);
    }

    function setupExternalAddonFixtures(someDirPath: string) {
      fixturify.writeSync(someDirPath, {
        'package.json': json({
          name: 'root-package',
          private: true,
          workspaces: ['packages/*'],
          dependencies: {
            'foo-external-addon': '*',
          },
        }),
        node_modules: {
          'foo-external-addon': {
            'index.js': fs.readFileSync(
              path.join(__dirname, 'fixtures', 'simple-addon', 'index.js'),
              'utf-8'
            ),
            'package.json': json({
              name: 'foo-external-addon',
              version: '1.0.0',
              keywords: ['ember-addon'],
              'ember-addon': {
                paths: [],
              },
            }),
          },
        },
      });
    }

    let pathToRoot: string;

    beforeEach(function () {
      setupTestEnvironment();
      const { name: pathToTmpDir } = tmp.dirSync();
      pathToRoot = pathToTmpDir;
      setupExternalAddonFixtures(pathToRoot);

      registerInternalAddonTestFixtures(
        walkSync(pathToRoot, {
          globs: ['**/*/package.json'],
          ignore: ['node_modules'],
          includeBasePath: true,
        })
      );
    });

    afterEach(() => {
      resetInternalAddonTestFixtures();
    });

    test('the correct external module mappings exist', function () {
      const { mappingsByAddonName, mappingsByLocation } = getExternalModuleMappings(pathToRoot);

      const { 'foo-external-addon': fooExternalAddon } = mappingsByAddonName;

      expect(fooExternalAddon, 'module mappings exists for `foo-external-addon`').toBeTruthy();

      expect(
        fooExternalAddon,
        'an associated mapping by location exists for `foo-external-addon`'
      ).toEqual(mappingsByLocation[fooExternalAddon.location]);

      expect(
        fs.realpathSync(fooExternalAddon.location),
        "`foo-external-addon`'s location is correct"
      ).toEqual(fs.realpathSync(path.resolve(pathToRoot, 'node_modules', 'foo-external-addon')));
    });
  });
});
