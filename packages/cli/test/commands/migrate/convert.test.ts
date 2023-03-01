import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync } from 'fs-extra/esm';
import { simpleGit, type SimpleGitOptions } from 'simple-git';
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
  KEYS,
  sendKey,
  removeSpecialChars,
  createOutputStream,
  isPackageSelection,
  isActionSelection,
} from '../../test-helpers/index.js';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: convert', async () => {
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
    basePath = prepareTmpDir('basic');
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

    const fileList = readdirSync(basePath);
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
    expect(config.include).toContain('foo.ts');
    expect(config.include).toContain('depends-on-foo.ts');
  });

  test('migrate from specific entrypoint', async () => {
    const options = createMigrateOptions(basePath, { entrypoint: 'depends-on-foo.js' });
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

    const fileList = readdirSync(basePath);
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).toContain('foo.ts');

    expect(fileList).not.toContain('depends-on-foo.js');
    expect(fileList).not.toContain('foo.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toContain('depends-on-foo.ts');
    expect(config.include).toContain('foo.ts');
  });

  test('againt specific basePath via -basePath option', async () => {
    basePath = prepareTmpDir('custom_basepath');
    const customBasePath = resolve(basePath, 'base');
    const options = createMigrateOptions(customBasePath);
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

    const fileList = readdirSync(customBasePath);
    expect(fileList).toContain('tsconfig.json');
    expect(fileList).toContain('index.ts');
    expect(fileList).not.toContain('index.js');

    const config = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
  });

  test('generate reports', async () => {
    const options = createMigrateOptions(basePath, {
      format: ['json', 'md', 'sarif'],
    });
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

    const reportPath = resolve(basePath, '.rehearsal');
    const reportList = readdirSync(reportPath);

    expect(reportList).toContain('migrate-report.json');
    expect(reportList).toContain('migrate-report.md');
    expect(reportList).toContain('migrate-report.sarif');
  });

  test('accept changes without git', async () => {
    const options = createMigrateOptions(basePath, { interactive: true });

    // prompt control flow
    outputStream.on('data', (line: string) => {
      // selection package
      if (isPackageSelection(line)) {
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        // select Accept for all 3 files
        sendKey(KEYS.ENTER); // selection package
      }
    });
    // Get context for convert task from previous tasks
    const tasks = [
      await initTask(options),
      await depInstallTask(options),
      await tsConfigTask(options),
      await lintConfigTask(options),
      await convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);

    const pathReg = new RegExp(basePath, 'g');
    const outputWithoutTmpPath = output.replace(pathReg, '<tmp-path>');
    expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();

    const fileList = readdirSync(basePath);
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');
  });

  test('accept and discard changes with git', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .add('./*')
      .commit('first commit!');

    const options = createMigrateOptions(basePath, { interactive: true });
    let fileCount = 1; // file counter in prompt selection

    // prompt control flow
    outputStream.on('data', (line: string) => {
      if (isPackageSelection(line)) {
        // selection package
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        switch (fileCount) {
          case 1:
            // At action selection for foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 2:
            // At action selection for depends-on-foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 3:
            // At action selection for index.js
            sendKey(KEYS.DOWN);
            sendKey(KEYS.DOWN);
            sendKey(KEYS.ENTER); // discard
            break;
        }
        fileCount++;
      }
    });

    // Get context for convert task from previous tasks
    const tasks = [
      await initTask(options),
      await depInstallTask(options),
      await tsConfigTask(options),
      await lintConfigTask(options),
      await convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);

    const pathReg = new RegExp(basePath, 'g');
    const outputWithoutTmpPath = output.replace(pathReg, '<tmp-path>');
    expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();

    const fileList = readdirSync(basePath);
    // index.ts should been discarded
    expect(fileList).toContain('index.js');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.ts');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');
  });

  test('view changes in $EDITOR', async () => {
    // TODO: It is super complicated to test this in real editor
    // 1. It is not promised that every machine has the editor defined here
    // 2. Haven't figured out how to pass key command/press to editor, to edit file and quit the edit
    // 3. Also tried EDITOR = 'echo foo >>', to append string to a file so we know it would change, but it doesn't work (probably related to all stdio config)
    // For now EDITOR is set to be 'rm', which would remove the selected file so we know the edit command works
    process.env.EDITOR = 'rm';
    const options = createMigrateOptions(basePath, { interactive: true });

    let fileCount = 1; // file counter in prompt selection

    // prompt control flow
    outputStream.on('data', (line: string) => {
      if (isPackageSelection(line)) {
        // selection package
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        switch (fileCount) {
          case 1:
            // At action selection for foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 2:
            // At action selection for depends-on-foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 3:
            // At action selection for index.js
            sendKey(KEYS.DOWN);
            sendKey(KEYS.ENTER); // edit
            break;
        }
        fileCount++;
      }
    });
    // Get context for convert task from previous tasks
    const tasks = [
      await initTask(options),
      await depInstallTask(options),
      await tsConfigTask(options),
      await lintConfigTask(options),
      await convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);

    const pathReg = new RegExp(basePath, 'g');
    const outputWithoutTmpPath = output.replace(pathReg, '<tmp-path>');
    expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();

    const fileList = readdirSync(basePath);
    // // index.ts should been removed
    expect(fileList).not.toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');
  });

  test('cancel prompt in interactive mode', async () => {
    const options = createMigrateOptions(basePath, { interactive: true });

    // prompt control flow
    outputStream.on('data', (line: string) => {
      // selection package
      if (isPackageSelection(line)) {
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        // At action selection for foo.js
        sendKey(KEYS.CTRL_C); // cancel
      }
    });

    // Get context for convert task from previous tasks
    const tasks = [
      await initTask(options),
      await depInstallTask(options),
      await tsConfigTask(options),
      await lintConfigTask(options),
      await convertTask(options, logger),
    ];

    // use try catch since it would be killed via ctrl c
    await listrTaskRunner(tasks).catch(() => {
      // replace random tmp path for consistent snapshot
      const pathReg = new RegExp(basePath, 'g');
      const outputWithoutTmpPath = output.replace(pathReg, '<tmp-path>');
      expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();
    });
  });
});
