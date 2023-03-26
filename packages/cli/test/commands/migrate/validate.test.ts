import { resolve } from 'node:path';
import { rmSync, writeFileSync } from 'node:fs';
import { createFileSync } from 'fs-extra/esm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { validateTask } from '../../../src/commands/migrate/tasks/index.js';
import {
  prepareProject,
  listrTaskRunner,
  createMigrateOptions,
  cleanOutput,
} from '../../test-helpers/index.js';
import type { Project } from 'fixturify-project';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: validate', () => {
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
  vi.spyOn(logger, 'warn').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    return logger;
  });
  vi.spyOn(logger, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    return logger;
  });

  beforeEach(async () => {
    output = '';
    project = prepareProject('initialization');
    // tests below assume creation
    delete project.files['tsconfig.json'];
    await project.write();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('pass with package.json', async () => {
    const options = createMigrateOptions(project.baseDir);
    const tasks = [validateTask(options, logger)];

    await listrTaskRunner(tasks);
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('error if no package.json', async () => {
    const options = createMigrateOptions(project.baseDir);
    const tasks = [validateTask(options, logger)];

    rmSync(resolve(project.baseDir, 'package.json'));

    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(`package.json does not exists`);
  });

  test('error if .gitignore has .rehearsal', async () => {
    const options = createMigrateOptions(project.baseDir);
    const tasks = [validateTask(options, logger)];

    const gitignore = `.rehearsal\nfoo\nbar`;
    const gitignorePath = resolve(project.baseDir, '.gitignore');
    writeFileSync(gitignorePath, gitignore, 'utf-8');

    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(
      `.rehearsal directory is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
    );
  });

  test('show warning message for missing files in --regen', async () => {
    const options = createMigrateOptions(project.baseDir, { regen: true });
    const tasks = [validateTask(options, logger)];

    await listrTaskRunner(tasks);
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('pass with all config files in --regen', async () => {
    const options = createMigrateOptions(project.baseDir, { regen: true });
    const tasks = [validateTask(options, logger)];

    createFileSync(resolve(project.baseDir, '.eslintrc.js'));
    createFileSync(resolve(project.baseDir, 'tsconfig.json'));

    await listrTaskRunner(tasks);
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });
});
