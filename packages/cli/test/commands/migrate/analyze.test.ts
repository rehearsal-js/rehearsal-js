import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra/esm';
import { Project } from 'fixturify-project';
import { readFile, readTSConfig, writeTSConfig } from '@rehearsal/utils';
import { addFilesToIncludes, analyzeTask } from '../../../src/commands/migrate/tasks/index.js';
import {
  createMigrateOptions,
  createOutputStream,
  isActionSelection,
  isPackageSelection,
  KEYS,
  listrTaskRunner,
  prepareProject,
  sendKey,
} from '../../test-helpers/index.js';
import type { TSConfig, MigrateCommandContext } from '../../../src/types.js';

describe('Task: analyze', () => {
  let output = '';
  let outputStream = createOutputStream();
  let project: Project;
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

  beforeEach(async () => {
    output = '';
    project = prepareProject('basic');
    await project.write();
    outputStream = createOutputStream();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    outputStream.destroy();
    project.dispose();
  });

  test('get files that will be migrated', async () => {
    const options = createMigrateOptions(project.baseDir, { ci: true });
    const tasks = [analyzeTask(options)];
    const ctx = await listrTaskRunner<MigrateCommandContext>(tasks);

    expect(ctx.targetPackagePath).toBe(`${project.baseDir}`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${project.baseDir}/index.js`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${project.baseDir}/foo.js`);
    expect(ctx.sourceFilesWithRelativePath).matchSnapshot();

    expect(output).matchSnapshot();
  });

  test('add files in tsconfig.json include', async () => {
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    writeTSConfig(configPath, {});

    const options = createMigrateOptions(project.baseDir, { ci: true });
    const tasks = [analyzeTask(options)];
    await listrTaskRunner(tasks);
    // check include tsconfig.json
    expect(readTSConfig(configPath)).matchSnapshot();
  });

  test('print files will be attempted to migrate with --dryRun', async () => {
    const options = createMigrateOptions(project.baseDir, { ci: true, dryRun: true });
    const tasks = [analyzeTask(options)];
    await listrTaskRunner(tasks);

    expect(output).matchSnapshot();
  });

  test('single package selection in interactive mode', async () => {
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

    const options = createMigrateOptions(project.baseDir);
    const tasks = [analyzeTask(options)];
    const ctx = await listrTaskRunner<MigrateCommandContext>(tasks);

    // test message and package selection prompt
    expect(output).toContain(
      'We have found multiple packages in your project, select the one to migrate'
    );
    expect(output).toContain('basic(no progress found)');

    // migration would continue after sending "enter" key
    expect(output).toContain(`[DATA] Running migration on ${project.baseDir}`);
    expect(output).toContain('[SUCCESS] Analyze project');

    // check context
    const expectedRelativePaths = ['foo.js', 'depends-on-foo.js', 'index.js'];
    const expectedAbsolutePaths = expectedRelativePaths.map((f) => {
      return resolve(project.baseDir, f);
    });
    expect(ctx.input).toBe('basic(no progress found)');
    expect(ctx.targetPackagePath).toBe(project.baseDir);
    expect(ctx.sourceFilesWithRelativePath).toStrictEqual(expectedRelativePaths);
    expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual(expectedAbsolutePaths);
  });

  test('accept --package option to skip the selection', async () => {
    const options = createMigrateOptions(project.baseDir, { package: '.' });
    const tasks = [analyzeTask(options)];
    const ctx = await listrTaskRunner<MigrateCommandContext>(tasks);

    expect(ctx.targetPackagePath).toBe(`${project.baseDir}`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${project.baseDir}/index.js`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${project.baseDir}/foo.js`);
    expect(ctx.sourceFilesWithRelativePath).matchSnapshot();

    expect(output).matchSnapshot();
  });

  test('throw if --package option is not valid', async () => {
    const options = createMigrateOptions(project.baseDir, { package: 'no-valid-package' });
    const tasks = [analyzeTask(options)];
    await expect(() => listrTaskRunner(tasks)).rejects.toThrowError(
      `Cannot find package no-valid-package in your project. Make sure its a valid package and try again.`
    );
  });

  describe('multi-package', () => {
    let project: Project;

    beforeEach(async () => {
      project = prepareProject('multi_packages');

      await project.write();
    });

    afterEach(() => {
      project.dispose();
    });
    test.todo('multi package selection in interactive mode', async () => {
      // prompt control flow
      outputStream.on('data', (line: string) => {
        // selection package
        if (isPackageSelection(line)) {
          // move down twice to select module-b
          sendKey(KEYS.DOWN);
          sendKey(KEYS.DOWN);
          sendKey(KEYS.ENTER);
        }
        if (isActionSelection(line)) {
          // select Accept for all 3 files
          sendKey(KEYS.ENTER); // selection package
        }
      });

      const options = createMigrateOptions(project.baseDir);
      const tasks = [analyzeTask(options)];
      const ctx = await listrTaskRunner<MigrateCommandContext>(tasks);

      // test message and package selection prompt
      expect(output).toContain(
        'We have found multiple packages in your project, select the one to migrate'
      );
      expect(output).toContain('multi-package(no progress found)');
      expect(output).toContain('module-a(no progress found)');
      expect(output).toContain('module-b(no progress found)');

      // migration would continue after sending "enter" key
      expect(output).toContain(
        `[DATA] Running migration on ${resolve(project.baseDir, 'module-b')}`
      );
      expect(output).toContain('[SUCCESS] Initialize');

      // check context
      expect(ctx.input).toBe('module-b(no progress found)');
      expect(ctx.targetPackagePath).toBe(resolve(project.baseDir, 'module-b'));
      expect(ctx.sourceFilesWithRelativePath).toStrictEqual(['index.js']);
      expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual([
        resolve(project.baseDir, 'module-b/', 'index.js'),
      ]);
    });

    test('show package progress in interactive mode', async () => {
      // prompt control flow
      outputStream.on('data', (line: string) => {
        // selection package
        if (isPackageSelection(line)) {
          // select
          sendKey(KEYS.ENTER);
        }
      });

      // write previous state
      const previousState = {
        name: 'multi-package',
        packageMap: {
          '.': [],
          './module-a': ['./module-a/index.js'],
          './module-b': [],
        },
        files: {
          './module-a/index.js': {
            origin: './module-a/index.js',
            current: './module-a/index.ts',
            package: './module-a',
            errorCount: 0,
          },
        },
      };

      // simulate a converted index.ts with 2 error
      writeFileSync(
        resolve(project.baseDir, 'module-a', 'index.ts'),
        '@rehearsal TODO\nfoo\bar\n@rehearsal TODO'
      );
      mkdirSync(resolve(project.baseDir, '.rehearsal'));
      writeJSONSync(resolve(project.baseDir, '.rehearsal', 'migrate-state.json'), previousState);

      const options = createMigrateOptions(project.baseDir);
      const tasks = [analyzeTask(options)];
      const ctx = await listrTaskRunner<MigrateCommandContext>(tasks);

      // test message and package selection prompt
      expect(output).toContain(
        'We have found multiple packages in your project, select the one to migrate'
      );
      expect(output).toContain('multi-package(no progress found)');
      expect(output).toContain(
        'module-a(1 of 1 files migrated, 2 @ts-expect-error(s) need to be fixed)'
      );
      expect(output).toContain('module-b(no progress found)');

      // check state
      expect(ctx.state.packages).toMatchSnapshot();
      expect(ctx.state.files).toMatchSnapshot();
    });

    test('disable package selection if completed', async () => {
      // prompt control flow
      outputStream.on('data', (line: string) => {
        // selection package
        if (isPackageSelection(line)) {
          // select
          sendKey(KEYS.ENTER);
        }
      });

      // write previous state
      const previousState = {
        name: 'multi-package',
        packageMap: {
          '.': [],
          './module-a': ['./module-a/index.js'],
          './module-b': [],
        },
        files: {
          './module-a/index.js': {
            origin: './module-a/index.js',
            current: './module-a/index.ts',
            package: './module-a',
            errorCount: 0,
          },
        },
      };

      // simulate a converted index.ts
      writeFileSync(resolve(project.baseDir, 'module-a', 'index.ts'), '');
      mkdirSync(resolve(project.baseDir, '.rehearsal'));
      writeJSONSync(resolve(project.baseDir, '.rehearsal', 'migrate-state.json'), previousState);

      const options = createMigrateOptions(project.baseDir);
      const tasks = [analyzeTask(options)];
      const ctx = await listrTaskRunner<MigrateCommandContext>(tasks);

      // test message and package selection prompt
      expect(output).toContain(
        'We have found multiple packages in your project, select the one to migrate'
      );
      expect(output).toContain('multi-package(no progress found)');
      expect(output).toContain('module-a(Fully migrated)');
      expect(output).toContain('module-b(no progress found)');

      // check state
      expect(ctx.state.packages).toMatchSnapshot();
      expect(ctx.state.files).toMatchSnapshot();
    });
  });
});

describe('Helper: addFilesToIncludes', () => {
  test('do nothing with no tsconfig', async () => {
    const project = new Project();
    await project.write();

    // expected that no tsconfig.json exists in this project fixture
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    addFilesToIncludes([], configPath);
    expect(existsSync(configPath)).toBeFalsy();

    project.dispose();
  });

  test('parse tsconfig.json that has a comment /**/ block', async () => {
    const project = new Project();
    project.mergeFiles({
      'tsconfig.json': `{
                /* */
      }`,
    });
    await project.write();

    // expected that no tsconfig.json exists in this project fixture
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    addFilesToIncludes([], configPath);

    const content = readFile(configPath, 'utf8');
    expect(content).toMatchSnapshot();

    project.dispose();
  });

  test('replace include if no include in tsconfig', async () => {
    const project = new Project();
    project.mergeFiles({
      'tsconfig.json': '{}',
    });
    await project.write();

    const configPath = resolve(project.baseDir, 'tsconfig.json');
    const fileList = ['foo', 'bar'];
    addFilesToIncludes(fileList, configPath);

    const config = readTSConfig<TSConfig>(configPath);
    expect(config.include).toStrictEqual(fileList);
    project.dispose();
  });

  test('only append unique files to existed include', async () => {
    const project = new Project();
    project.mergeFiles({
      'tsconfig.json': `{
        include: ['lib/*.ts', 'test/**/*.ts']
      }`,
    });
    await project.write();

    const configPath = resolve(project.baseDir, 'tsconfig.json');
    const fileList = [
      'lib/foo/a.ts',
      'lib/a.ts',
      'test/foo/a.ts',
      'test/bar/a.ts',
      'test/a.ts',
      'index.ts',
    ];
    addFilesToIncludes(fileList, configPath);

    const config = readTSConfig<TSConfig>(configPath);
    expect(config.include).toStrictEqual(['lib/*.ts', 'test/**/*.ts', 'lib/foo/a.ts', 'index.ts']);
    project.dispose();
  });
});
