/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';
import { setGracefulCleanup } from 'tmp';

import { Project } from 'fixturify-project';
import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  analyzeTask,
  regenTask,
  validateTask,
} from '../../../src/commands/migrate/tasks/index.js';
import { prepareProject, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';

setGracefulCleanup();

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: regen', () => {
  let project: Project;
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
    project = prepareProject('basic_regen');
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('throw error with no tsconfig.json', async () => {
    delete project.files['tsconfig.json'];
    await project.write();
    const options = createMigrateOptions(project.baseDir, { ci: true, regen: true });
    const tasks = [validateTask(options, logger), regenTask(options, logger)];

    await expect(async () => await listrTaskRunner(tasks)).rejects.toThrowError(
      `Config file 'tsconfig.json' not found`
    );
  });

  test('no effect on JS filse before conversion', async () => {
    project.files['package.json'] = JSON.stringify({
      name: 'basic_regen',
      version: '1.0.0',
    });
    await project.write();
    const options = createMigrateOptions(project.baseDir, { ci: true, regen: true });
    const tasks = [
      initTask(options),
      validateTask(options, logger),
      tsConfigTask(options),
      regenTask(options, logger),
    ];

    await listrTaskRunner(tasks);
    expect(output).matchSnapshot();
  });

  test('update ts and lint errors based on previous conversion', async () => {
    project.files['package.json'] = JSON.stringify({
      name: 'basic_regen',
      version: '1.0.0',
    });
    await project.write();
    const options = createMigrateOptions(project.baseDir, { ci: true, regen: true });
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
