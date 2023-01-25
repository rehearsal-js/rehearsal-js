import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra';

import { initTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, ListrTaskRunner, createMigrateOptions } from '../../test-helpers';
import { CustomConfig } from '../../../src/types';
import { sleep } from '../../../src/utils';

enum KEYS {
  ENTER = '\x0D',
  CTRL_C = '\x03',
  UP = '\u001b[A',
  DOWN = '\u001b[B',
}

function sendKey(key: KEYS): void {
  process.stdin.emit('data', key);
}

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

  test('single package selection in interactive mode', async () => {
    // send keycode after runner.run()
    setTimeout(async () => {
      sendKey(KEYS.ENTER);
    }, 2000);

    const options = createMigrateOptions(basePath, { interactive: true });
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks, { input: 'basic' });
    const ctx = await runner.run();

    // test message and package selection prompt
    expect(output).toContain(
      'We have found multiple packages in your project, select the one to migrate'
    );
    expect(output).toContain('basic(no progress found)');

    // migration would continue after sending "enter" key
    expect(output).toContain(`[DATA] Running migration on ${basePath}`);
    expect(output).toContain('[SUCCESS] Initialize');

    // check context
    const expectedRellativePaths = ['foo.js', 'depends-on-foo.js', 'index.js'];
    const expectedAbsolutePaths = expectedRellativePaths.map((f) => {
      return resolve(basePath, f);
    });
    expect(ctx.input).toBe('basic(no progress found)');
    expect(ctx.targetPackagePath).toBe(basePath);
    expect(ctx.sourceFilesWithRelativePath).toStrictEqual(expectedRellativePaths);
    expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual(expectedAbsolutePaths);
  });

  test('multi package selection in interactive mode', async () => {
    basePath = prepareTmpDir('multi_packages');
    // send keycode after runner.run()
    setTimeout(async () => {
      // move down twice to select module-b
      sendKey(KEYS.DOWN);
      sendKey(KEYS.DOWN);
      await sleep(200);
      sendKey(KEYS.ENTER);
    }, 2000);

    const options = createMigrateOptions(basePath, { interactive: true });
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks, { input: 'basic' });
    const ctx = await runner.run();

    // test message and package selection prompt
    expect(output).toContain(
      'We have found multiple packages in your project, select the one to migrate'
    );
    expect(output).toContain('multi-package(no progress found)');
    expect(output).toContain('module-a(no progress found)');
    expect(output).toContain('module-b(no progress found)');

    // migration would continue after sending "enter" key
    expect(output).toContain(`[DATA] Running migration on ${resolve(basePath, 'module-b')}`);
    expect(output).toContain('[SUCCESS] Initialize');

    // check context
    expect(ctx.input).toBe('module-b(no progress found)');
    expect(ctx.targetPackagePath).toBe(resolve(basePath, 'module-b'));
    expect(ctx.sourceFilesWithRelativePath).toStrictEqual(['index.js']);
    expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual([
      resolve(basePath, 'module-b/', 'index.js'),
    ]);
  });
});
