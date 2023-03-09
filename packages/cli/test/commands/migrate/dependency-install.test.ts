import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';

import {
  REQUIRED_DEPENDENCIES,
  depInstallTask,
  shouldRunDepInstallTask,
} from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('Task: dependency-install', async () => {
  let basePath = '';
  let output = '';
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  vi.spyOn(console, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  beforeEach(() => {
    output = '';
    basePath = prepareTmpDir('initialization');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('install required dependencies', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await depInstallTask(options)];
    await listrTaskRunner(tasks);

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;

    expect(Object.keys(devDeps).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());
    expect(output).matchSnapshot();
  });

  test('shouldRunDepInstallTask should skip', async () => {
    const options = createMigrateOptions(basePath);

    // convert array of deps to object-ish
    const requiredDevDepsMap = REQUIRED_DEPENDENCIES.reduce(
      (map, d) => ({ ...map, [d]: '1.0.0' }),
      {}
    );
    // update package.json with required deps
    const packageJsonPath = resolve(basePath, 'package.json');
    const packageJson = readJSONSync(packageJsonPath);
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      devDependencies: requiredDevDepsMap,
    });

    expect(shouldRunDepInstallTask(options)).toBeFalsy();
  });

  test('skip install required dependencies', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await depInstallTask(options)];

    // convert array of deps to object-ish
    const requiredDevDepsMap = REQUIRED_DEPENDENCIES.reduce(
      (map, d) => ({ ...map, [d]: '1.0.0' }),
      {}
    );
    // update package.json with required deps
    const packageJsonPath = resolve(basePath, 'package.json');
    const packageJson = readJSONSync(packageJsonPath);
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      devDependencies: requiredDevDepsMap,
    });

    await listrTaskRunner(tasks); // should be skipped
    expect(output).toMatchSnapshot();
  });

  test('install custom dependencies', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['fs-extra'],
          devDependencies: ['tmp'],
        },
      },
    });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const tasks = [await depInstallTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    const deps = packageJson.dependencies;

    expect(Object.keys(devDeps).sort()).toEqual(['tmp', ...REQUIRED_DEPENDENCIES].sort());

    expect(devDeps).toHaveProperty('tmp');
    expect(deps).toHaveProperty('fs-extra');
    expect(output).matchSnapshot();
  });

  test('shouldRunDepInstallTask should skip with custom deps', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['fs-extra@2.0.0'], // also handle this format: {name}@{version}
          devDependencies: ['tmp'],
        },
      },
    });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    // convert array of deps to object-ish
    const requiredDevDepsMap = {
      ...REQUIRED_DEPENDENCIES.reduce((map, d) => ({ ...map, [d]: '1.0.0' }), {}),
      tmp: '1.0.0',
    };
    const requiredDepsMap = { 'fs-extra': '2.0.0' };
    // update package.json with required deps
    const packageJsonPath = resolve(basePath, 'package.json');
    const packageJson = readJSONSync(packageJsonPath);
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      dependencies: requiredDepsMap,
      devDependencies: requiredDevDepsMap,
    });
    expect(shouldRunDepInstallTask(options, { userConfig })).toBeFalsy();
  });

  test('skip install custom deps', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['fs-extra@2.0.0'], // also handle this format: {name}@{version}
          devDependencies: ['tmp'],
        },
      },
    });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const tasks = [await depInstallTask(options, { userConfig })];
    // convert array of deps to object-ish
    const requiredDevDepsMap = {
      ...REQUIRED_DEPENDENCIES.reduce((map, d) => ({ ...map, [d]: '1.0.0' }), {}),
      tmp: '1.0.0',
    };
    const requiredDepsMap = { 'fs-extra': '2.0.0' };
    // update package.json with required deps
    const packageJsonPath = resolve(basePath, 'package.json');
    const packageJson = readJSONSync(packageJsonPath);
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      dependencies: requiredDepsMap,
      devDependencies: requiredDevDepsMap,
    });

    await listrTaskRunner(tasks); // should be skipped
    expect(output).toMatchSnapshot();
  });

  test('show failed deps', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['this-is-not-existed'],
          devDependencies: ['this-would-fail'],
        },
      },
    });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const tasks = [await depInstallTask(options, { userConfig })];
    // await listrTaskRunner(tasks);

    await expect(() => listrTaskRunner(tasks)).rejects.toThrowErrorMatchingSnapshot();
  });

  test('postInstall hook from user config', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: [],
          devDependencies: ['fs-extra'],
        },
        postInstall: {
          command: 'touch',
          args: ['foo'],
        },
      },
    });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const tasks = [await depInstallTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    expect(devDeps).toHaveProperty('fs-extra');

    expect(existsSync(resolve(basePath, 'foo')));
    expect(output).matchSnapshot();
  });
});
