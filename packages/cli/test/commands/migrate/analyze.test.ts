import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { analyzeTask, addFilesToIncludes } from '../../../src/commands/migrate/tasks/index.js';
import {
  prepareProject,
  listrTaskRunner,
  createMigrateOptions,
  KEYS,
  sendKey,
  createOutputStream,
  isPackageSelection,
  isActionSelection,
} from '../../test-helpers/index.js';
import type { Project } from 'fixturify-project';

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
    const ctx = await listrTaskRunner(tasks);

    expect(ctx.targetPackagePath).toBe(`${project.baseDir}`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${project.baseDir}/index.js`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${project.baseDir}/foo.js`);
    expect(ctx.sourceFilesWithRelativePath).matchSnapshot();

    expect(output).matchSnapshot();
  });

  test('add files in tsconfig.json include', async () => {
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    writeJSONSync(configPath, {});

    const options = createMigrateOptions(project.baseDir, { ci: true });
    const tasks = [analyzeTask(options)];
    await listrTaskRunner(tasks);

    // check include tsconfig.json
    expect(readJSONSync(configPath)).matchSnapshot();
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
    const ctx = await listrTaskRunner(tasks);

    // test message and package selection prompt
    expect(output).toContain(
      'We have found multiple packages in your project, select the one to migrate'
    );
    expect(output).toContain('basic(no progress found)');

    // migration would continue after sending "enter" key
    expect(output).toContain(`[DATA] Running migration on ${project.baseDir}`);
    expect(output).toContain('[SUCCESS] Analyzing Project');

    // check context
    const expectedRellativePaths = ['foo.js', 'depends-on-foo.js', 'index.js'];
    const expectedAbsolutePaths = expectedRellativePaths.map((f) => {
      return resolve(project.baseDir, f);
    });
    expect(ctx.input).toBe('basic(no progress found)');
    expect(ctx.targetPackagePath).toBe(project.baseDir);
    expect(ctx.sourceFilesWithRelativePath).toStrictEqual(expectedRellativePaths);
    expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual(expectedAbsolutePaths);
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
      const ctx = await listrTaskRunner(tasks);

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
      const ctx = await listrTaskRunner(tasks);

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
      const ctx = await listrTaskRunner(tasks);

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
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('basic');
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('do nothing with no tsconfig', () => {
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    addFilesToIncludes([], configPath);
    expect(existsSync(configPath)).toBeFalsy();
  });

  test('repalce include if no include in tsconfig', () => {
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    writeJSONSync(configPath, {});
    const fileList = ['foo', 'bar'];
    addFilesToIncludes(fileList, configPath);

    const config = readJSONSync(configPath) as { include: string[] };
    expect(config.include).toStrictEqual(fileList);
  });

  test('only append unique files to existed include', () => {
    const configPath = resolve(project.baseDir, 'tsconfig.json');
    const oldInclude = ['lib/*.ts', 'test/**/*.ts'];
    writeJSONSync(configPath, {
      include: oldInclude,
    });
    const fileList = [
      'lib/foo/a.ts',
      'lib/a.ts',
      'test/foo/a.ts',
      'test/bar/a.ts',
      'test/a.ts',
      'index.ts',
    ];
    addFilesToIncludes(fileList, configPath);

    const config = readJSONSync(configPath) as { include: string[] };
    expect(config.include).toStrictEqual([...oldInclude, 'lib/foo/a.ts', 'index.ts']);
  });
});
