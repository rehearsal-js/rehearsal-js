import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra';

import { initTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, ListrTaskRunner } from '../../test-helpers';
import { CustomConfig, Formats } from '../../../src/types';

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
    const options = {
      basePath,
      entrypoint: '',
      format: ['sarif' as Formats],
      outputPath: '.rehearsal',
      verbose: false,
      userConfig: undefined,
      interactive: undefined,
      dryRun: false,
    };
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks);
    const ctx = await runner.run();

    // console.warn(ctx.sourceFilesWithAbsolutePath);

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

    const options = {
      basePath,
      entrypoint: '',
      format: ['sarif' as Formats],
      outputPath: '.rehearsal',
      verbose: false,
      userConfig: 'rehearsal-config.json',
      interactive: undefined,
      dryRun: true,
    };
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
    const options = {
      basePath,
      entrypoint: '',
      format: ['sarif' as Formats],
      outputPath: '.rehearsal',
      verbose: false,
      userConfig: undefined,
      interactive: undefined,
      dryRun: true,
    };
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks);
    const ctx = await runner.run();

    expect(ctx.skip).toBe(true);
    expect(output).matchSnapshot();
  });
});
