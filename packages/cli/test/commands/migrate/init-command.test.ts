import { readdirSync } from 'node:fs';
import { setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { prepareTmpDir, cleanOutput } from '../../test-helpers/index.js';
import {
  runDefault,
  runWithUserConfig,
  runTwoTimes,
  CUSTOM_CONFIG,
  createUserConfig,
} from '../../test-helpers/init-command-test-utils.js';

setGracefulCleanup();

describe('migrate init', () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('default run', async () => {
    const { stdout, devDeps, fileList, lintConfig, lintConfigDefault, tsConfig, tscLintScript } =
      await runDefault(basePath);

    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

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
    createUserConfig(basePath, CUSTOM_CONFIG);

    const { stdout, devDeps, deps, tscLintScript } = await runWithUserConfig(basePath);

    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    expect(Object.keys(devDeps!)).includes('tmp');
    expect(deps).toHaveProperty('fs-extra');

    expect(readdirSync(basePath)).toContain('custom-ts-config-script');
    expect(readdirSync(basePath)).toContain('custom-lint-config-script');

    expect(tscLintScript).toBe('tsc --noEmit');
  });

  test('skip dep install, ts config, and lint config if exists', async () => {
    const { stdout } = await runTwoTimes(basePath);

    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });
});
