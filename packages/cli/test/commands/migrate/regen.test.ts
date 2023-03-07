/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  regenTask,
} from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';

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

  // test('throw error with no tsconfig.json', async () => {
  //   const options = createMigrateOptions(basePath);
  //   const tasks = [await initTask(options), await regenTask(options, logger)];

  //   try {
  //     await listrTaskRunner(tasks);
  //   } catch (error: any) {
  //     expect(error.message).toContain(`Config file 'tsconfig.json' not found`);
  //   }
  // });

  // test('no effect on JS filse before conversion', async () => {
  //   const options = createMigrateOptions(basePath);
  //   const tasks = [
  //     await initTask(options),
  //     await tsConfigTask(options),
  //     await regenTask(options, logger),
  //   ];

  //   await listrTaskRunner(tasks);
  //   expect(output).matchSnapshot();
  // });

  test('update ts and lint errors based on previous conversion', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [
      await initTask(options),
      await depInstallTask(options),
      await tsConfigTask(options),
      await lintConfigTask(options),
      await convertTask(options, logger),
      await regenTask(options, logger),
    ];

    await listrTaskRunner(tasks);
    console.warn(output);
    expect(output).matchSnapshot();
  });
});
