import { readFileSync, realpathSync } from 'fs';
import { join, resolve } from 'path';
import { setupTestEnvironment } from '@rehearsal/migration-graph-shared';
import { writeSync } from 'fixturify';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import walkSync from 'walk-sync';

import { getExternalModuleMappings, getInternalModuleMappings } from '../src/mappings-container';
import {
  registerInternalAddonTestFixtures,
  resetInternalAddonTestFixtures,
} from '../src/utils/environment';

import { FIXTURE_NAMES, FIXTURES } from './fixtures/package-fixtures';

setGracefulCleanup();

describe('mappings-container', () => {
  describe('getInternalModuleMappings', () => {
    let pathToRoot: string;

    function setupInternalAddonFixtures(someTmpDir: string): void {
      writeSync(someTmpDir, FIXTURES);
    }

    beforeEach(() => {
      setupTestEnvironment();
      const { name: someTmpDir } = dirSync();
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

      const simpleAddon = mappingsByAddonName[FIXTURE_NAMES.SIMPLE_ADDON];
      const simpleEngine = mappingsByAddonName[FIXTURE_NAMES.SIMPLE_ENGINE];

      expect(simpleAddon, `module mappings '${FIXTURE_NAMES.SIMPLE_ENGINE}'`).toBeTruthy();

      expect(simpleEngine, `module mappings '${FIXTURE_NAMES.SIMPLE_ENGINE}'`).toBeTruthy();

      expect(simpleAddon, 'to have an associated mapping by path for `foo`').toBe(
        mappingsByLocation[simpleAddon.path]
      );

      expect(simpleEngine, 'to have an associated mapping by path for `bar`').toBe(
        mappingsByLocation[simpleEngine.path]
      );

      expect(simpleAddon.path, `${simpleAddon.packageName}'s path is correct`).toBe(
        resolve(pathToRoot, FIXTURE_NAMES.SIMPLE_ADDON)
      );

      expect(simpleEngine.path, `${simpleEngine.packageName}'s path is correct`).toBe(
        resolve(pathToRoot, FIXTURE_NAMES.SIMPLE_ENGINE)
      );
    });

    test('it works correctly for addons that specify a custom `moduleName`', () => {
      const { mappingsByAddonName } = getInternalModuleMappings(pathToRoot);

      const customAddonName = mappingsByAddonName[FIXTURE_NAMES.ADDON_WITH_MODULE_NAME];

      expect(customAddonName, 'module mappings exists for `addon-with-module-name`').toBeTruthy();

      // !TODO moduleName is not being set/get correctly
      // expect(customAddonName.moduleName).toEqual(
      //   `${FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME`
      // );
      expect(customAddonName.packageName).toEqual('addon-with-module-name');
    });

    test('it works correctly workspace packages', () => {
      const { mappingsByAddonName } = getInternalModuleMappings(
        resolve(pathToRoot, FIXTURE_NAMES.WORKSPACE_CONTAINER)
      );

      const simpleWorkspace =
        mappingsByAddonName[FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER];

      expect(simpleWorkspace, 'module mappings exists for `foo-workspace`').toBeTruthy();
      expect(simpleWorkspace.isWorkspace).toBe(true);
    });

    test('it works correctly for addons with a custom addon main file', () => {
      const { mappingsByAddonName } = getInternalModuleMappings(pathToRoot);

      expect(
        mappingsByAddonName[FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN],
        'an internal module mapping exists for `addon-with-custom-main`'
      ).toBeTruthy();
    });
  });

  describe('`getExternalModuleMappings`', () => {
    function json(jsonObj = {}): string {
      return JSON.stringify(jsonObj, null, 2);
    }

    function setupExternalAddonFixtures(someDirPath: string): void {
      writeSync(someDirPath, {
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
            'index.js': readFileSync(
              join(__dirname, 'fixtures', 'simple-addon', 'index.js'),
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
      const { name: pathToTmpDir } = dirSync();
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
        'an associated mapping by path exists for `foo-external-addon`'
      ).toEqual(mappingsByLocation[fooExternalAddon.path]);

      expect(
        realpathSync(fooExternalAddon.path),
        "`foo-external-addon`'s location is correct"
      ).toEqual(realpathSync(resolve(pathToRoot, 'node_modules', 'foo-external-addon')));
    });
  });
});
