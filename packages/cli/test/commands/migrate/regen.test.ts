/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  analyzeTask,
  regenTask,
} from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: regen', () => {
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
    const options = createMigrateOptions(basePath, { ci: true });
    const tasks = [initTask(options), regenTask(options, logger)];

    await expect(async () => await listrTaskRunner(tasks)).rejects.toThrowError(
      `Config file 'tsconfig.json' not found`
    );
  });

  test('no effect on JS filse before conversion', async () => {
    const options = createMigrateOptions(basePath, { ci: true });
    const tasks = [initTask(options), tsConfigTask(options), regenTask(options, logger)];

    await listrTaskRunner(tasks);
    expect(output).matchSnapshot();
  });

  test('update ts and lint errors based on previous conversion', async () => {
    const options = createMigrateOptions(basePath, { ci: true });
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);
    await listrTaskRunner([regenTask(options, logger)]);
    expect(output).matchSnapshot();
  });
});
