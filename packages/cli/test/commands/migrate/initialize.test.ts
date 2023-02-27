import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync, mkdirSync, writeFileSync } from 'fs-extra/esm';
import { initTask } from '../../../src/commands/migrate/tasks/index.js';
import {
  prepareTmpDir,
  listrTaskRunner,
  createMigrateOptions,
  KEYS,
  sendKey,
  createOutputStream,
  isPackageSelection,
  isActionSelection,
} from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';

function createUserConfig(
  basePath: string,
  config: CustomConfig,
  configName: string = 'rehearsal-config.json'
): void {
  const configPath = resolve(basePath, configName);
  writeJSONSync(configPath, config);
}

describe('Task: initialize', async () => {
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

  test('get files that will be migrated', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    expect(ctx.targetPackagePath).toBe(`${basePath}`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${basePath}/index.js`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${basePath}/foo.js`);
    expect(ctx.sourceFilesWithRelativePath).matchSnapshot();

    expect(output).matchSnapshot();
  });

  test('read and store default config in context', async () => {
    createUserConfig(basePath, {
      migrate: {
        include: ['test'],
        exclude: ['docs'],
        install: {
          dependencies: ['foo'],
          devDependencies: ['bat'],
        },
        setup: {
          ts: { command: 'ts-setup', args: ['ts-setup-arg'] },
          lint: { command: 'lint-setup', args: ['lint-setup-arg'] },
        },
      },
    });

    const options = createMigrateOptions(basePath);
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    expect.assertions(8);

    expect(ctx.userConfig).toBeTruthy();
    expect(ctx?.userConfig?.basePath).toBe(basePath);
    expect(ctx?.userConfig?.config).toMatchSnapshot();
    expect(ctx?.userConfig?.hasDependencies).toBeTruthy();
    expect(ctx?.userConfig?.hasLintSetup).toBeTruthy();
    expect(ctx?.userConfig?.hasTsSetup).toBeTruthy();
    expect(ctx?.userConfig?.include).toStrictEqual(['test']);
    expect(ctx?.userConfig?.exclude).toStrictEqual(['docs']);
  });

  test('read and store config via --userConfig', async () => {
    createUserConfig(
      basePath,
      {
        migrate: {
          include: ['test'],
          exclude: ['docs'],
          install: {
            dependencies: ['foo'],
            devDependencies: ['bat'],
          },
          setup: {
            ts: { command: 'ts-setup', args: ['ts-setup-arg'] },
            lint: { command: 'lint-setup', args: ['lint-setup-arg'] },
          },
        },
      },
      'another-config.json'
    );

    const options = createMigrateOptions(basePath, { userConfig: 'another-config.json' });
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    expect.assertions(8);

    expect(ctx.userConfig).toBeTruthy();
    expect(ctx?.userConfig?.basePath).toBe(basePath);
    expect(ctx?.userConfig?.config).toMatchSnapshot();
    expect(ctx?.userConfig?.hasDependencies).toBeTruthy();
    expect(ctx?.userConfig?.hasLintSetup).toBeTruthy();
    expect(ctx?.userConfig?.hasTsSetup).toBeTruthy();
    expect(ctx?.userConfig?.include).toStrictEqual(['test']);
    expect(ctx?.userConfig?.exclude).toStrictEqual(['docs']);
  });

  test('print files will be attempted to migrate with --dryRun', async () => {
    const options = createMigrateOptions(basePath, { dryRun: true });
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    expect(ctx.skip).toBe(true);
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

    const options = createMigrateOptions(basePath, { interactive: true });
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    // test message and package selection prompt
    expect(output).toContain(
      'We have found multiple packages in your project, select the one to migrate'
    );
    expect(output).toContain('basic(no progress found)');

    // migration would continue after sending "enter" key
    expect(output).toContain(`[DATA] Running migration on ${basePath}`);
    expect(output).toContain('[SUCCESS] Initialize');

    // check context
    const expectedRellativePaths = ['foo.js', 'depends-on-foo.js', 'index.js'];
    const expectedAbsolutePaths = expectedRellativePaths.map((f) => {
      return resolve(basePath, f);
    });
    expect(ctx.input).toBe('basic(no progress found)');
    expect(ctx.targetPackagePath).toBe(basePath);
    expect(ctx.sourceFilesWithRelativePath).toStrictEqual(expectedRellativePaths);
    expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual(expectedAbsolutePaths);
  });

  test.todo('multi package selection in interactive mode', async () => {
    basePath = prepareTmpDir('multi_packages');

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

    const options = createMigrateOptions(basePath, { interactive: true });
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    // test message and package selection prompt
    expect(output).toContain(
      'We have found multiple packages in your project, select the one to migrate'
    );
    expect(output).toContain('multi-package(no progress found)');
    expect(output).toContain('module-a(no progress found)');
    expect(output).toContain('module-b(no progress found)');

    // migration would continue after sending "enter" key
    expect(output).toContain(`[DATA] Running migration on ${resolve(basePath, 'module-b')}`);
    expect(output).toContain('[SUCCESS] Initialize');

    // check context
    expect(ctx.input).toBe('module-b(no progress found)');
    expect(ctx.targetPackagePath).toBe(resolve(basePath, 'module-b'));
    expect(ctx.sourceFilesWithRelativePath).toStrictEqual(['index.js']);
    expect(ctx.sourceFilesWithAbsolutePath).toStrictEqual([
      resolve(basePath, 'module-b/', 'index.js'),
    ]);
  });

  test('show package progress in interactive mode', async () => {
    basePath = prepareTmpDir('multi_packages');
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
      resolve(basePath, 'module-a', 'index.ts'),
      '@rehearsal TODO\nfoo\bar\n@rehearsal TODO'
    );
    mkdirSync(resolve(basePath, '.rehearsal'));
    writeJSONSync(resolve(basePath, '.rehearsal', 'migrate-state.json'), previousState);

    const options = createMigrateOptions(basePath, { interactive: true });
    const tasks = [await initTask(options)];
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
    basePath = prepareTmpDir('multi_packages');
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
    writeFileSync(resolve(basePath, 'module-a', 'index.ts'), '');
    mkdirSync(resolve(basePath, '.rehearsal'));
    writeJSONSync(resolve(basePath, '.rehearsal', 'migrate-state.json'), previousState);

    const options = createMigrateOptions(basePath, { interactive: true });
    const tasks = [await initTask(options)];
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
