import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setGracefulCleanup } from 'tmp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { prepareProject, cleanOutput } from '../../test-helpers/index.js';
import {
  runDefault,
  runWithUserConfig,
  runTwoTimes,
  CUSTOM_CONFIG,
  createUserConfig,
} from '../../test-helpers/init-command-test-utils.js';
import type { Project } from 'fixturify-project';

setGracefulCleanup();

describe('migrate init', () => {
  let project: Project;

  beforeEach(() => {
    project = prepareProject('basic');
  });

  afterEach(() => {
    project.dispose();
  });

  test('default run', async () => {
    await project.write();
    const { stdout, devDeps, fileList, lintConfig, lintConfigDefault, tsConfig, tscLintScript } =
      await runDefault(project.baseDir);

    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();

    for (const devDep of REQUIRED_DEPENDENCIES) {
      expect(Object.keys(devDeps!).includes(devDep));
    }

    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');

    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefault).toMatchSnapshot();
    expect(tsConfig).matchSnapshot();
    expect(tscLintScript).toBe('tsc --noEmit');
  });

  test('pass user config', async () => {
    delete project.files['tsconfig.json'];
    await project.write();
    createUserConfig(project.baseDir, CUSTOM_CONFIG);

    const { stdout, devDeps, deps, tscLintScript } = await runWithUserConfig(project.baseDir);

    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();

    expect(Object.keys(devDeps!)).includes('tmp');
    expect(deps).toHaveProperty('fs-extra');

    expect(existsSync(join(project.baseDir, 'custom-ts-config-script'))).toBe(true);
    expect(existsSync(join(project.baseDir, 'custom-lint-config-script'))).toBe(true);
    expect(tscLintScript).toBe('tsc --noEmit');
  });

  test('skip dep install, ts config, and lint config if exists', async () => {
    await project.write();
    const { stdout } = await runTwoTimes(project.baseDir);

    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();
  });
});
