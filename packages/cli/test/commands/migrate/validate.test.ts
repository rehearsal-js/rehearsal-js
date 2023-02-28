import { resolve } from 'path';
import { createFileSync, rmSync, writeFileSync } from 'fs-extra';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';
import tmp from 'tmp';
import yaml from 'js-yaml';

import fixturify = require('fixturify');

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

  test('set skips if report exists', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await validateTask(options, logger)];

    // create dummy report
    createFileSync(resolve(basePath, '.rehearsal', 'migrate-report.sarif'));

    const { skipDepInstall, skipTsConfig, skipLintConfig, skipScriptConfig } =
      await listrTaskRunner(tasks);
    expect(skipDepInstall).toBeTruthy();
    expect(skipTsConfig).toBeTruthy();
    expect(skipLintConfig).toBeTruthy();
    expect(skipScriptConfig).toBeTruthy();
    expect(cleanOutput(output, basePath)).toMatchSnapshot();
  });

  test('throw if not in project root with npm/yarn workspaces', async () => {
    const { name: basePath } = tmp.dirSync();
    const files = {
      'package.json': JSON.stringify({
        workspaces: ['packages/*'],
      }),
      packages: {
        'package-a': {
          'package.json': JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
          }),
        },
      },
    };
    fixturify.writeSync(basePath, files);
    const options = createMigrateOptions(resolve(basePath, 'packages', 'package-a'));
    const tasks = [await validateTask(options, logger)];
    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(
      `migrate command needs to be running at project root with workspaces`
    );
  });

  test('throw if not in project root with pnpm workspaces', async () => {
    const { name: basePath } = tmp.dirSync();
    const files = {
      'package.json': JSON.stringify({
        name: 'foo',
      }),
      'pnpm-lock.yaml': '',
      'pnpm-workspace.yaml': yaml.dump({ packages: ['packages/*'] }),
      packages: {
        'package-a': {
          'package.json': JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
          }),
        },
      },
    };
    fixturify.writeSync(basePath, files);
    const options = createMigrateOptions(resolve(basePath, 'packages', 'package-a'));
    const tasks = [await validateTask(options, logger)];
    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(
      `migrate command needs to be running at project root with workspaces`
    );
  });
});
