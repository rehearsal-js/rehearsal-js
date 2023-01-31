import { resolve } from 'path';
import { createFileSync, rmSync } from 'fs-extra';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { validateTask } from '../../../src/commands/migrate/tasks';
import {
  prepareTmpDir,
  listrTaskRunner,
  createMigrateOptions,
  cleanOutput,
} from '../../test-helpers';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: validate', async () => {
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
  vi.spyOn(logger, 'warn').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    return logger;
  });
  vi.spyOn(logger, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    return logger;
  });

  beforeEach(() => {
    output = '';
    basePath = prepareTmpDir('initialization');
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
  });

  test('pass with paackage.json', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await validateTask(options, logger)];

    await listrTaskRunner(tasks);
    expect(cleanOutput(output, basePath)).toMatchSnapshot();
  });

  test('error if no package.json', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await validateTask(options, logger)];

    rmSync(resolve(basePath, 'package.json'));

    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(`package.json does not exists`);
  });

  test('show warning message for missing files in --regen', async () => {
    const options = createMigrateOptions(basePath, { regen: true });
    const tasks = [await validateTask(options, logger)];

    await listrTaskRunner(tasks);
    expect(cleanOutput(output, basePath)).toMatchSnapshot();
  });

  test('pass with all config files in --regen', async () => {
    const options = createMigrateOptions(basePath, { regen: true });
    const tasks = [await validateTask(options, logger)];

    createFileSync(resolve(basePath, '.eslintrc.js'));
    createFileSync(resolve(basePath, 'tsconfig.json'));

    await listrTaskRunner(tasks);
    expect(cleanOutput(output, basePath)).toMatchSnapshot();
  });
});
