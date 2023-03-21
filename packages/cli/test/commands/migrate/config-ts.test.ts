import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readTSConfig, writeTSConfig } from '@rehearsal/utils';
import { tsConfigTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareProject, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { runTsConfig, createUserConfig } from '../../test-helpers/config-ts-test-utils.js';
import { TSConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';
import type { Project } from 'fixturify-project';

describe('Task: config-ts', () => {
  let output = '';
  let project: Project;
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  beforeEach(() => {
    output = '';
    project = prepareProject('initialization');
  });

  afterEach(() => {
    vi.clearAllMocks();
    project.dispose();
  });

  test('create tsconfig if not existed', async () => {
    await runTsConfig(project.baseDir);

    expect(readTSConfig(resolve(project.baseDir, 'tsconfig.json'))).matchSnapshot();
    expect(output).matchSnapshot();
  });

  test('update tsconfig if exists', async () => {
    // Prepare old tsconfig
    const oldTsConfig = { compilerOptions: { strict: false } };
    writeTSConfig(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

    await runTsConfig(project.baseDir);

    const tsConfig = readTSConfig<TSConfig>(resolve(project.baseDir, 'tsconfig.json'));
    expect(tsConfig.compilerOptions.strict).toBeTruthy();
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('ensuring strict mode is enabled');
  });

  test('update tsconfig if invalid extends exist', async () => {
    // Prepare old tsconfig
    const oldTsConfig = { extends: 'invalid-tsconfig.json' };
    writeTSConfig(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

    await runTsConfig(project.baseDir);

    const tsConfig = readTSConfig<TSConfig>(resolve(project.baseDir, 'tsconfig.json'));

    expect(tsConfig.compilerOptions.strict).toBeTruthy();
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('ensuring strict mode is enabled');
  });

  test('skip if tsconfig.json exists with strict on', async () => {
    // Prepare old tsconfig
    const oldTsConfig = { compilerOptions: { strict: true } };
    writeTSConfig(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

    await runTsConfig(project.baseDir);
    await runTsConfig(project.baseDir); //should be skipped

    expect(output).toMatchSnapshot();
  });

  test('run custom config command with user config provided', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
        },
      },
    });

    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const tasks = [tsConfigTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    // This proves the custom command works
    expect(readdirSync(project.baseDir)).toContain('custom-ts-config-script');
    expect(output).toMatchSnapshot();
  });

  test('skip custom config command', async () => {
    // Prepare old tsconfig
    const oldTsConfig = { compilerOptions: { strict: true } };
    writeTSConfig(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

    createUserConfig(project.baseDir, {
      migrate: {
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
        },
      },
    });

    await runTsConfig(project.baseDir, { userConfig: 'rehearsal-config.json' });

    // This proves the custom command works not triggered
    expect(readdirSync(project.baseDir)).not.toContain('custom-ts-config-script');
    expect(output).toMatchSnapshot();
  });

  test('postTsSetup hook from user config', async () => {
    createUserConfig(project.baseDir, {
      migrate: {
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
          postTsSetup: { command: 'mv', args: ['custom-ts-config-script', 'foo'] },
        },
      },
    });

    const options = createMigrateOptions(project.baseDir, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
    const tasks = [tsConfigTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    // This proves the custom command and hook works
    expect(readdirSync(project.baseDir)).toContain('foo');
    expect(readdirSync(project.baseDir)).not.toContain('custom-ts-config-script');
    expect(output).toMatchSnapshot();
  });
});
