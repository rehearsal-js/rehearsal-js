import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync, readdirSync } from 'fs-extra';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';

import { tsConfigTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, ListrTaskRunner, createMigrateOptions } from '../../test-helpers';
import { CustomConfig } from '../../../src/types';
import { UserConfig } from '../../../src/user-config';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('Task: config-ts', async () => {
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

  test('create tsconfig if not existed', async () => {
    const options = createMigrateOptions(basePath);
    const context = { sourceFilesWithRelativePath: [] };
    const tasks = [await tsConfigTask(options, context)];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));

    expect(tsConfig).matchSnapshot();
    expect(output).matchSnapshot();
  });

  test('update tsconfig if exists', async () => {
    // Prepare old tsconfig
    const oldTsConfig = { compilerOptions: { strict: false } };
    writeJSONSync(resolve(basePath, 'tsconfig.json'), oldTsConfig);

    const options = createMigrateOptions(basePath);
    const context = { sourceFilesWithRelativePath: [] };
    const tasks = [await tsConfigTask(options, context)];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));

    expect(tsConfig.compilerOptions.strict).toBeTruthy();
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('ensuring strict mode is enabled');
  });

  test('run custom config command with user config provided', async () => {
    createUserConfig(basePath, {
      migrate: {
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const tasks = [await tsConfigTask(options, { userConfig })];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    // This proves the custom command works
    expect(readdirSync(basePath)).toContain('custom-ts-config-script');
    expect(output).toMatchSnapshot();
  });

  test('stage tsconfig if in git repo', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    // Init git, add and commit existed files, to make it a clean state
    await git.init();
    await git.add(resolve(basePath, 'package.json'));
    // GH CI would require git name and email
    await git.addConfig('user.name', 'tester');
    await git.addConfig('user.email', 'tester@tester.com');
    await git.commit('foo');

    const options = createMigrateOptions(basePath);
    const context = { sourceFilesWithRelativePath: [] };
    const tasks = [await tsConfigTask(options, context)];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    const gitStatus = await git.status();
    expect(gitStatus.staged).toContain('tsconfig.json');

    expect(output).matchSnapshot();
  });
});
