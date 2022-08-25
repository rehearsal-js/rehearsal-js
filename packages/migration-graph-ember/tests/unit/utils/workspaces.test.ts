import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { setGracefulCleanup, dirSync } from 'tmp';
import { writeSync } from 'fixturify';
import { resolve } from 'path';
import walkSync from 'walk-sync';

import {
  registerInternalAddonTestFixtures,
  setupTestEnvironment,
  resetInternalAddonTestFixtures,
} from '../../../src/-private/utils/test-environment';

import { getWorkspaceGlobs, isWorkspace } from '../../../src/-private/utils/workspace';
import { PACKAGE_FIXTURE_NAMES, PACKAGE_FIXTURES } from '../../fixtures/package-fixtures';

setGracefulCleanup();

describe('Unit | workspaces', function () {
  function setupAddonFixtures(tmpLocation): void {
    writeSync(tmpLocation, PACKAGE_FIXTURES);
  }

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

  test('getWorkspaceGlobs', function () {
    expect(
      getWorkspaceGlobs(resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER)).filter(
        (glob) => glob.includes('packages/*')
      )
    ).toBeTruthy();
  });

  test('isWorkspace', function () {
    expect(
      isWorkspace(
        resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER),
        resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER)
      ),
      `${PACKAGE_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER} is NOT a workspace`
    ).toBe(false);

    expect(
      isWorkspace(
        resolve(pathToPackage, PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER),
        resolve(
          pathToPackage,
          PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER,
          'packages',
          PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER
        )
      ),
      `${PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER} is NOT a workspace`
    ).toBe(true);
  });
});
