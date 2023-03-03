import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';
import { tsConfigTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';

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
    await listrTaskRunner(tasks);

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
    await listrTaskRunner(tasks);

    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));

    expect(tsConfig.compilerOptions.strict).toBeTruthy();
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('ensuring strict mode is enabled');
  });

  test('skip if tsconfig.json exists with strict on', async () => {
    // Prepare old tsconfig
    const oldTsConfig = { compilerOptions: { strict: true } };
    writeJSONSync(resolve(basePath, 'tsconfig.json'), oldTsConfig);

    const options = createMigrateOptions(basePath);
    const context = { sourceFilesWithRelativePath: [] };
    const tasks = [await tsConfigTask(options, context)];
    await listrTaskRunner(tasks);

    await listrTaskRunner(tasks); // should be skipped
    expect(output).toMatchSnapshot();
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
    await listrTaskRunner(tasks);

    // This proves the custom command works
    expect(readdirSync(basePath)).toContain('custom-ts-config-script');
    expect(output).toMatchSnapshot();
  });

  // test('skip custom config command', async () => {
  //   // Prepare old tsconfig
  //   writeJSONSync(resolve(basePath, 'tsconfig.json'), {});

  //   createUserConfig(basePath, {
  //     migrate: {
  //       setup: {
  //         ts: { command: 'touch', args: ['custom-ts-config-script'] },
  //       },
  //     },
  //   });

  //   const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
  //   const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
  //   const tasks = [await tsConfigTask(options, { userConfig })];

  //   await listrTaskRunner(tasks); // should be skipped

  //   // This proves the custom command works not triggered
  //   expect(readdirSync(basePath)).not.toContain('custom-ts-config-script');
  //   expect(output).toBe(''); // should output nothing
  // });

  test('postTsSetup hook from user config', async () => {
    createUserConfig(basePath, {
      migrate: {
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
          postTsSetup: { command: 'mv', args: ['custom-ts-config-script', 'foo'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const tasks = [await tsConfigTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    // This proves the custom command and hook works
    expect(readdirSync(basePath)).toContain('foo');
    expect(readdirSync(basePath)).not.toContain('custom-ts-config-script');
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
    await listrTaskRunner(tasks);

    expect(output).matchSnapshot();
  });
});
