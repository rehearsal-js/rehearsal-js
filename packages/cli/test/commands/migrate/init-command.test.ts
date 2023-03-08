import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { runBin, prepareTmpDir, cleanOutput } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';

setGracefulCleanup();

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('migrate init', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('default run', async () => {
    const { stdout } = await runBin('migrate', ['init'], {
      cwd: basePath,
    });

    // summary message
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    // file structures
    const fileList = readdirSync(basePath);

    // Dependencies
    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // tsconfig.json
    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(tsConfig).matchSnapshot();

    // lint config
    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');
    const lintConfig = readFileSync(resolve(basePath, '.eslintrc.js'), { encoding: 'utf-8' });
    const lintConfigDefualt = readFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), {
      encoding: 'utf-8',
    });
    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefualt).toMatchSnapshot();

    // new scripts
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');
  });

  test('pass user config', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['fs-extra'],
          devDependencies: ['tmp'],
        },
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    });
    const { stdout } = await runBin('migrate', ['init'], {
      cwd: basePath,
    });

    // summary message
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    // Dependencies
    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    const deps = packageJson.dependencies;
    expect(Object.keys(devDeps).sort()).toEqual(['tmp', ...REQUIRED_DEPENDENCIES].sort());
    expect(deps).toHaveProperty('fs-extra');

    // ts config
    expect(readdirSync(basePath)).toContain('custom-ts-config-script');

    // lint config
    expect(readdirSync(basePath)).toContain('custom-lint-config-script');

    // new scripts
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');
  });

  test('skip dep install, ts config, and lint config if exists', async () => {
    // first run
    await runBin('migrate', ['init'], {
      cwd: basePath,
    });
    // second run
    const { stdout } = await runBin('migrate', ['init'], {
      cwd: basePath,
    });

    // summary message
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });
});
