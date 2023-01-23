import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra';

import { initTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, ListrTaskRunner, createMigrateOptions } from '../../test-helpers';
import { CustomConfig } from '../../../src/types';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('Task: initialize', async () => {
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
    basePath = prepareTmpDir('basic');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('get files that will be migrated', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks);
    const ctx = await runner.run();

    expect(ctx.targetPackagePath).toBe(`${basePath}`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${basePath}/index.js`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${basePath}/foo.js`);
    expect(ctx.sourceFilesWithRelativePath).matchSnapshot();

    expect(output).matchSnapshot();
  });

  test('store custom config in context', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['foo'],
          devDependencies: ['bat'],
        },
        setup: {
          ts: { command: 'ts-setup', args: ['ts-setup-arg'] },
          lint: { command: 'lint-setup', args: ['lint-setup-arg'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks);
    const ctx = await runner.run();

    expect(ctx.userConfig).toBeTruthy();
    if (ctx.userConfig) {
      expect(ctx.userConfig.basePath).toBe(basePath);
      expect(ctx.userConfig.config).toMatchSnapshot();
      expect(ctx.userConfig.hasDependencies).toBeTruthy();
      expect(ctx.userConfig.hasLintSetup).toBeTruthy();
      expect(ctx.userConfig.hasTsSetup).toBeTruthy();
    }
  });

  test('print files will be attempted to migrate with --dryRun', async () => {
    const options = createMigrateOptions(basePath, { dryRun: true });
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks);
    const ctx = await runner.run();

    expect(ctx.skip).toBe(true);
    expect(output).matchSnapshot();
  });
});
