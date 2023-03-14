import { resolve } from 'node:path';
import { readdirSync, promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';
import {
  analyzeTask,
  depInstallTask,
  initTask,
  lintConfigTask,
  sequentialTask,
  tsConfigTask,
} from '../../../src/commands/migrate/tasks/index.js';

import {
  createMigrateOptions,
  createOutputStream,
  listrTaskRunner,
  prepareTmpDir,
} from '../../test-helpers/index.js';
import { ReportJson } from '../../../src/types.js';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: sequential', () => {
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
    const options = createMigrateOptions(basePath, { entrypoint: 'index.ts', ci: true });
    const previousRuns = {
      previousFixedCount: 1,
      paths: [{ basePath, entrypoint: 'depends-on-foo.ts' }],
    };
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      sequentialTask(options, logger, previousRuns),
    ];

    await listrTaskRunner(tasks);
    expect(output).toMatchSnapshot();

    const fileList = readdirSync(basePath);
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('index.ts');

    const report = ReportJson.parse(
      JSON.parse(await fs.readFile(resolve(basePath, '.rehearsal', 'migrate-report.json'), 'utf-8'))
    );
    const { summary, fixedItemCount, items } = report;
    expect(summary?.length).toBe(2);
    expect(summary?.[0].basePath).toEqual(summary?.[1].basePath);
    expect(summary?.[0].entrypoint).toBe('depends-on-foo.ts');
    expect(summary?.[1].entrypoint).toBe('index.ts');
    expect(fixedItemCount).toBe(4);
    expect(items?.length).toBe(2);
  });
});
