import { resolve } from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra/esm';

import {
  REQUIRED_DEPENDENCIES,
  depInstallTask,
  shouldRunDepInstallTask,
} from '../../../src/commands/migrate/tasks/index.js';
import { prepareProject, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';
import type { PackageJson } from 'type-fest';
import type { Project } from 'fixturify-project';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('Task: dependency-install', () => {
  let output = '';
  let project: Project;
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  vi.spyOn(console, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  beforeEach(async () => {
    output = '';
    project = prepareProject('initialization');
    await project.write();
  });

  afterEach(() => {
    vi.clearAllMocks();
    project.dispose();
  });

  test('install required dependencies', async () => {
    const options = createMigrateOptions(project.baseDir);
    const tasks = [depInstallTask(options)];
    await listrTaskRunner(tasks);

    const packageJson = JSON.parse(
      await fs.readFile(resolve(project.baseDir, 'package.json'), 'utf-8')
    ) as PackageJson;

    const devDeps = packageJson.devDependencies;

    expect(Object.keys(devDeps || {}).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());
    expect(output).matchSnapshot();
  });

  test('shouldRunDepInstallTask should skip', async () => {
    const options = createMigrateOptions(project.baseDir);

    // convert array of deps to object-ish
    const requiredDevDepsMap = REQUIRED_DEPENDENCIES.reduce(
      (map, d) => ({ ...map, [d]: '1.0.0' }),
      {}
    );
    // update package.json with required deps
    const packageJsonPath = resolve(project.baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      devDependencies: requiredDevDepsMap,
    });

    const { isInstallRequired } = await shouldRunDepInstallTask(options);

    expect(isInstallRequired).toBeFalsy();
  });

  test('shouldRunDepInstallTask should return empty deps to install', async () => {
    const options = createMigrateOptions(project.baseDir);

    // convert array of deps to object-ish
    const requiredDevDepsMap = REQUIRED_DEPENDENCIES.reduce(
      (map, d) => ({ ...map, [d]: '1.0.0' }),
      {}
    );
    // update package.json with required deps
    const packageJsonPath = resolve(project.baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      devDependencies: requiredDevDepsMap,
    });

    const { isInstallRequired, devDependencies, dependencies } = await shouldRunDepInstallTask(
      options
    );

    // all deps should be installed already coming from package.json collision avoided
    expect(devDependencies).toEqual([]);
    expect(dependencies).toEqual([]);
    expect(isInstallRequired).toBeFalsy();
  });

  test('shouldRunDepInstallTask should return all required deps to install without collisions', async () => {
    const options = createMigrateOptions(project.baseDir);
    const { isInstallRequired, devDependencies, dependencies } = await shouldRunDepInstallTask(
      options
    );

    // all deps should be installed as package.json doesnt have any of them
    expect(devDependencies).toEqual(REQUIRED_DEPENDENCIES);
    expect(dependencies).toEqual([]);
    expect(isInstallRequired).toBeTruthy();
  });

  test('shouldRunDepInstallTask should return partial required deps to install without collisions', async () => {
    const options = createMigrateOptions(project.baseDir);

    // we need to grab the types from the REQUIRED_DEPENDENCIES array so the compiler doesnt complain
    type RequiredDeps = { [key in (typeof REQUIRED_DEPENDENCIES)[number]]: string };

    // convert array of deps to object-ish
    const packageJSONDevDeps: RequiredDeps = REQUIRED_DEPENDENCIES.reduce(
      (map, d) => ({ ...map, [d]: '1.0.0' }),
      {}
    );

    // remove prettier, eslint-config-prettier and typescript from dev deps of project package.json
    // in this scenario typescript is installed as a dependency already and should NOT be installed by rehearsal as a devDep
    // all REQUIRED_DEPENDENCIES should already be installed in package.json expect prettier
    delete packageJSONDevDeps['prettier'];
    delete packageJSONDevDeps['eslint-config-prettier'];
    delete packageJSONDevDeps['typescript'];

    // update package.json with required deps
    const packageJsonPath = resolve(project.baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    const packageJSONDeps = {
      typescript: '1.0.0',
    };

    writeJSONSync(
      packageJsonPath,
      {
        ...packageJson,
        devDependencies: packageJSONDevDeps,
        dependencies: packageJSONDeps,
      },
      { spaces: 2 }
    );

    const { isInstallRequired, devDependencies, dependencies } = await shouldRunDepInstallTask(
      options
    );

    // only 2 devDeps needs to be installed as package.json has all the others
    expect(devDependencies).toEqual(['eslint-config-prettier', 'prettier']);
    expect(dependencies).toEqual([]);
    expect(isInstallRequired).toBeTruthy();
  });

  test('skip install required dependencies', async () => {
    const options = createMigrateOptions(project.baseDir);
    const tasks = [depInstallTask(options)];

    // convert array of deps to object-ish
    const requiredDevDepsMap = REQUIRED_DEPENDENCIES.reduce(
      (map, d) => ({ ...map, [d]: '1.0.0' }),
      {}
    );
    // update package.json with required deps
    const packageJsonPath = resolve(project.baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      devDependencies: requiredDevDepsMap,
    });

    await listrTaskRunner(tasks); // should be skipped
    expect(output).toMatchSnapshot();
  });

  test('install custom dependencies', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        install: {
          dependencies: ['fs-extra'],
          devDependencies: ['tmp'],
        },
      },
    });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const tasks = [depInstallTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    const packageJson = JSON.parse(
      await fs.readFile(resolve(project.baseDir, 'package.json'), 'utf-8')
    ) as PackageJson;
    const devDeps = packageJson.devDependencies;
    const deps = packageJson.dependencies;

    expect(Object.keys(devDeps || {}).sort()).toEqual(['tmp', ...REQUIRED_DEPENDENCIES].sort());

    expect(devDeps).toHaveProperty('tmp');
    expect(deps).toHaveProperty('fs-extra');
    expect(output).matchSnapshot();
  });

  test('shouldRunDepInstallTask should skip with custom deps', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        install: {
          dependencies: ['fs-extra@2.0.0'], // also handle this format: {name}@{version}
          devDependencies: ['tmp'],
        },
      },
    });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    // convert array of deps to object-ish
    const requiredDevDepsMap = {
      ...REQUIRED_DEPENDENCIES.reduce((map, d) => ({ ...map, [d]: '1.0.0' }), {}),
      tmp: '1.0.0',
    };
    const requiredDepsMap = { 'fs-extra': '2.0.0' };
    // update package.json with required deps
    const packageJsonPath = resolve(project.baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      dependencies: requiredDepsMap,
      devDependencies: requiredDevDepsMap,
    });

    const { isInstallRequired } = await shouldRunDepInstallTask(options, { userConfig });

    expect(isInstallRequired).toBeFalsy();
  });

  test('skip install custom deps', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        install: {
          dependencies: ['fs-extra@2.0.0'], // also handle this format: {name}@{version}
          devDependencies: ['tmp'],
        },
      },
    });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const tasks = [depInstallTask(options, { userConfig })];
    // convert array of deps to object-ish
    const requiredDevDepsMap = {
      ...REQUIRED_DEPENDENCIES.reduce((map, d) => ({ ...map, [d]: '1.0.0' }), {}),
      tmp: '1.0.0',
    };
    const requiredDepsMap = { 'fs-extra': '2.0.0' };
    // update package.json with required deps
    const packageJsonPath = resolve(project.baseDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    writeJSONSync(packageJsonPath, {
      ...packageJson,
      dependencies: requiredDepsMap,
      devDependencies: requiredDevDepsMap,
    });

    await listrTaskRunner(tasks); // should be skipped
    expect(output).toMatchSnapshot();
  });

  test('show failed deps', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        install: {
          dependencies: ['this-is-not-existed'],
          devDependencies: ['this-would-fail'],
        },
      },
    });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const tasks = [depInstallTask(options, { userConfig })];

    try {
      await listrTaskRunner(tasks);
    } catch (error) {
      const e = error as Error;
      expect(e.message).toContain(
        'We ran into an error when installing dependencies, please install the following as dependencies and try again'
      );
      expect(e.message).toContain('this-is-not-existed');
    }
  });

  test('single postInstall command from user config', async () => {
    createUserConfig(project.baseDir, {
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
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const tasks = [depInstallTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    const packageJson = JSON.parse(
      await fs.readFile(resolve(project.baseDir, 'package.json'), 'utf-8')
    ) as PackageJson;
    const devDeps = packageJson.devDependencies;
    expect(devDeps).toHaveProperty('fs-extra');

    expect(existsSync(resolve(project.baseDir, 'foo')));
    expect(output).matchSnapshot();
  });

  test('multiple postInstall commands from user config', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        install: {
          dependencies: [],
          devDependencies: [],
        },
        postInstall: [
          {
            command: 'touch',
            args: ['foo'],
          },
          {
            command: 'touch',
            args: ['bar'],
          },
        ],
      },
    });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const tasks = [depInstallTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    expect(existsSync(resolve(project.baseDir, 'foo')));
    expect(existsSync(resolve(project.baseDir, 'bar')));
    expect(output).matchSnapshot();
  });

  test('do not run postInstall command if empty', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        install: {
          dependencies: [],
          devDependencies: [],
        },
        postInstall: [],
      },
    });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const tasks = [depInstallTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    expect(output).matchSnapshot();
  });
});
