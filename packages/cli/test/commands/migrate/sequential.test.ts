import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readdirSync, readJSONSync } from 'fs-extra';
import { createLogger, format, transports } from 'winston';
import {
  initTask,
  depInstallTask,
  tsConfigTask,
  lintConfigTask,
  sequentialTask,
} from '../../../src/commands/migrate/tasks';

import {
  prepareTmpDir,
  listrTaskRunner,
  createOutputStream,
  createMigrateOptions,
} from '../../test-helpers';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: sequential', async () => {
  let basePath = '';
  let output = '';

  let outputStream = createOutputStream();

  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });

  beforeEach(() => {
    output = '';
    basePath = prepareTmpDir('sequential');
    outputStream = createOutputStream();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    outputStream.destroy();
  });

  test('sequential run regen on the existing report, and run migrate on current base path and entrypoint', async () => {
    const options = createMigrateOptions({ entrypoint: 'index.ts' });
    const previousRuns = {
      previousFixedCount: 1,
      paths: [{ basePath, entrypoint: 'depends-on-foo.ts' }],
    };
    const tasks = [
      await initTask(basePath, options),
      await depInstallTask(basePath, options),
      await tsConfigTask(basePath, options),
      await lintConfigTask(basePath, options),
      await sequentialTask(basePath, options, logger, previousRuns),
    ];

    await listrTaskRunner(tasks);
    expect(output).toMatchSnapshot();

    const fileList = readdirSync(basePath);
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('index.ts');

    const report = readJSONSync(resolve(basePath, '.rehearsal', 'migrate-report.json'));
    const { summary, fixedItemCount, items } = report;
    expect(summary.length).toBe(2);
    expect(summary[0].basePath).toEqual(summary[1].basePath);
    expect(summary[0].entrypoint).toBe('depends-on-foo.ts');
    expect(summary[1].entrypoint).toBe('index.ts');
    expect(fixedItemCount).toBe(2);
    expect(items.length).toBe(2);
  });
});
