import { resolve, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync } from 'fs-extra/esm';
import { createLogger, format, transports } from 'winston';

import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
} from '../../../src/commands/migrate/tasks/index.js';
import {
  prepareTmpDir,
  listrTaskRunner,
  createMigrateOptions,
  removeSpecialChars,
  createOutputStream,
} from '../../test-helpers/index.js';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: convert vanilla-js-mvc-esm', async () => {
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
    basePath = prepareTmpDir('vanilla-js-mvc-esm');
    outputStream = createOutputStream();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    outputStream.destroy();
  });

  test('migrate from default all files .js in root', async () => {
    const options = createMigrateOptions(basePath);
    // Get context for convert task from previous tasks
    const tasks = [
      await initTask(options),
      await depInstallTask(options),
      await tsConfigTask(options),
      await lintConfigTask(options),
      await convertTask(options, logger),
    ];
    await listrTaskRunner(tasks);

    expect(output).toMatchSnapshot();

    const fileList = readdirSync(join(basePath, 'src'));

    // confirm the .js files have git mv to .ts and are all in src folder
    expect(fileList).toContain('controller.ts');
    expect(fileList).toContain('helpers.ts');
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('model.ts');
    expect(fileList).toContain('template.ts');
    expect(fileList).toContain('view.ts');

    expect(fileList).not.toContain('controller.js');
    expect(fileList).not.toContain('helpers.js');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('model.js');
    expect(fileList).not.toContain('template.js');
    expect(fileList).not.toContain('view.js');

    // confirm each file in fileList matches the snapshot
    fileList.forEach((file) => {
      const filePath = join(basePath, 'src', file);
      const content = readFileSync(filePath, 'utf8');
      expect(removeSpecialChars(content)).toMatchSnapshot(file);
    });

    // confirm the tsconfig.json is correct
    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));

    expect(config.compilerOptions.strict).toBe(true);
    expect(config.include).toContain('src/index.ts');
    expect(config.include).toContain('src/controller.ts');
    expect(config.include).toContain('src/model.ts');
    expect(config.include).toContain('src/view.ts');
    expect(config.include).toContain('src/template.ts');
    expect(config.include).toContain('src/helpers.ts');
  });
});
