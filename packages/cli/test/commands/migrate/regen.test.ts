import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  regenTask,
} from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: regen', async () => {
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
    basePath = prepareTmpDir('basic');
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
  });

  test('throw error with no tsconfig.json', async () => {
    const options = createMigrateOptions();
    const tasks = [await initTask(basePath, options), await regenTask(basePath, options, logger)];

    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(
      `Config file 'tsconfig.json' not found`
    );
  });

  test('no effect on JS filse before conversion', async () => {
    const options = createMigrateOptions();
    const tasks = [
      await initTask(basePath, options),
      await tsConfigTask(basePath, options),
      await regenTask(basePath, options, logger),
    ];

    await listrTaskRunner(tasks);
    expect(output).matchSnapshot();
  });

  test('update ts and lint errors based on previous conversion', async () => {
    const options = createMigrateOptions();
    const tasks = [
      await initTask(basePath, options),
      await depInstallTask(basePath, options),
      await tsConfigTask(basePath, options),
      await lintConfigTask(basePath, options),
      await convertTask(basePath, options, logger),
      await regenTask(basePath, options, logger),
    ];

    await listrTaskRunner(tasks);
    expect(output).matchSnapshot();
  });
});
