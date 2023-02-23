import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync, existsSync } from 'fs-extra';

import { depInstallTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';
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

  test('install custom dependencies', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: [],
          devDependencies: ['fs-extra'],
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
    expect(output).matchSnapshot();
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
