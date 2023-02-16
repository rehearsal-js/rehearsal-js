import { resolve } from 'path';
import { writeSync } from 'fixturify';
import { DirResult, dirSync, setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { getWorkspaceGlobs, isWorkspace } from '../src/utils/workspace';
import { FIXTURE_NAMES, FIXTURES } from './fixtures/workspace-fixtures';

setGracefulCleanup();

describe('Unit | workspaces', function () {
  let pathToRoot: string;
  let tmpDir: DirResult;

  function setupFixtures(somePath: string): void {
    writeSync(somePath, FIXTURES);
  }

  function getPathToPackage(...paths: Array<string>): string {
    return resolve(tmpDir.name, ...paths);
  }

  beforeEach(function () {
    tmpDir = dirSync({ unsafeCleanup: true });
    setupFixtures(tmpDir.name);
    // Setup re-used test variables
    pathToRoot = getPathToPackage(FIXTURE_NAMES.WORKSPACE_CONTAINER);
  });

  afterEach(() => {
    tmpDir.removeCallback();
  });

  test('getWorkspaceGlobs', function () {
    expect(
      getWorkspaceGlobs(pathToRoot).filter((glob) => glob.includes('packages/*'))
    ).toBeTruthy();
  });

  test('isWorkspace', function () {
    expect(
      isWorkspace(pathToRoot, getPathToPackage(FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER)),
      `${FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER} is NOT a workspace`
    ).toBe(false);

    expect(
      isWorkspace(
        pathToRoot,
        getPathToPackage(
          FIXTURE_NAMES.WORKSPACE_CONTAINER,
          'packages',
          FIXTURE_NAMES.PACKAGE_IN_WORKSPACE_CONTAINER
        )
      ),
      `${FIXTURE_NAMES.PACKAGE_IN_WORKSPACE_CONTAINER} is NOT a workspace`
    ).toBe(true);
  });
});
