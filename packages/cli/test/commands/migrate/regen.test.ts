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
import { prepareProject, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import type { Project } from 'fixturify-project';

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
    project = prepareProject('basic');
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('throw error with no tsconfig.json', async () => {
    project.linkDevDependency('typescript', { baseDir: process.cwd() });
    delete project.files['tsconfig.json'];
    await project.write();
    const options = createMigrateOptions(project.baseDir, { ci: true });
    const tasks = [initTask(options), regenTask(options, logger)];

    await expect(async () => await listrTaskRunner(tasks)).rejects.toThrowError(
      `Config file 'tsconfig.json' not found`
    );
  });

  test('no effect on JS filse before conversion', async () => {
    delete project.files['tsconfig.json'];
    await project.write();
    const options = createMigrateOptions(project.baseDir, { ci: true });
    const tasks = [initTask(options), tsConfigTask(options), regenTask(options, logger)];

    await listrTaskRunner(tasks);
    expect(output).matchSnapshot();
  });

  test('update ts and lint errors based on previous conversion', async () => {
    delete project.files['tsconfig.json'];
    await project.write();
    const options = createMigrateOptions(project.baseDir, { ci: true });
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
