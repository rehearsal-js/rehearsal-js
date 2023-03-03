import { resolve } from 'node:path';
import { rmSync, writeFileSync } from 'node:fs';
import { createFileSync } from 'fs-extra/esm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { validateTask } from '../../../src/commands/migrate/tasks/index.js';
import {
  prepareTmpDir,
  listrTaskRunner,
  createMigrateOptions,
  cleanOutput,
} from '../../test-helpers/index.js';

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

  test('pass with package.json', async () => {
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

  test('error if .gitignore has .rehearsal', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await validateTask(options, logger)];

    const gitignore = `.rehearsal\nfoo\nbar`;
    const gitignorePath = resolve(basePath, '.gitignore');
    writeFileSync(gitignorePath, gitignore, 'utf-8');

    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(
      `.rehearsal directory is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
    );
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
