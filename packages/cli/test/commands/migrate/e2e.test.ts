import { resolve } from 'node:path';
import { readFileSync, readdirSync, promises as fs } from 'node:fs';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { setGracefulCleanup, dirSync } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { create, getFiles } from '@rehearsal/test-support';
import yaml from 'js-yaml';
import fixturify from 'fixturify';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { runBin, prepareTmpDir, cleanOutput } from '../../test-helpers/index.js';
import { CustomConfig, TSConfig } from '../../../src/types.js';
import type { PackageJson } from 'type-fest';

setGracefulCleanup();

describe('migrate - validation', () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('pass in a clean project', async () => {
    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: basePath,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('throw if not in project root with npm/yarn workspaces', async () => {
    const { name: basePath } = dirSync();
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

    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(basePath, 'packages', 'package-a'),
    });
    expect(stdout).toContain('migrate command needs to be running at project root with workspaces');
  });

  test('not throw if in project root with unrelated npm/yarn workspaces', async () => {
    const { name: basePath } = dirSync();
    const files = {
      'package.json': JSON.stringify({
        workspaces: ['packages/lib/*'],
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

    const { stdout: secondRunStdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(basePath, 'packages', 'package-a'),
    });
    expect(cleanOutput(secondRunStdout, basePath)).toMatchSnapshot();
  });

  test('throw if not in project root with pnpm workspaces', async () => {
    const { name: basePath } = dirSync();
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

    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(basePath, 'packages', 'package-a'),
    });
    expect(stdout).toContain('migrate command needs to be running at project root with workspaces');
  });

  test('not throw if in project root with unrelated npm/yarn workspaces', async () => {
    const { name: basePath } = dirSync();
    const files = {
      'package.json': JSON.stringify({
        name: 'foo',
      }),
      'pnpm-lock.yaml': '',
      'pnpm-workspace.yaml': yaml.dump({ packages: ['packages/lib/*'] }),
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

    const { stdout: secondRunStdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(basePath, 'packages', 'package-a'),
    });
    expect(cleanOutput(secondRunStdout, basePath)).toMatchSnapshot();
  });

  test('relative entrypoint inside project root works', async () => {
    basePath = prepareTmpDir('basic');

    const { stdout } = await runBin('migrate', ['-e', 'foo.js', '--ci'], {
      cwd: basePath,
    });
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('absolute entrypoint inside project root works', async () => {
    basePath = prepareTmpDir('basic');

    const { stdout } = await runBin('migrate', ['-e', resolve(basePath, 'foo.js'), '--ci'], {
      cwd: basePath,
    });
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('entrypoint outside project root does not work', async () => {
    basePath = prepareTmpDir('basic');

    const { stdout } = await runBin('migrate', ['-e', resolve(__dirname, 'e2e.test.ts'), '--ci'], {
      cwd: basePath,
    });
    expect(stdout).toContain('Could not find entrypoint');
  });
});

describe('migrate: e2e', () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('default migrate command', async () => {
    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: basePath,
    });

    // summary message
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    // file structures
    const fileList = readdirSync(basePath);
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');

    // file contents
    expect(readFileSync(resolve(basePath, 'foo.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
    expect(
      readFileSync(resolve(basePath, 'depends-on-foo.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();
    expect(readFileSync(resolve(basePath, 'index.ts'), { encoding: 'utf-8' })).toMatchSnapshot();

    // Dependencies
    const packageJson = JSON.parse(
      await fs.readFile(resolve(basePath, 'package.json'), 'utf-8')
    ) as PackageJson;

    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps || {}).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // report
    const reportPath = resolve(basePath, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');

    // tsconfig.json
    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json')) as TSConfig;
    expect(tsConfig).matchSnapshot();

    // lint config
    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');
    const lintConfig = readFileSync(resolve(basePath, '.eslintrc.js'), { encoding: 'utf-8' });
    const lintConfigDefualt = readFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), {
      encoding: 'utf-8',
    });
    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefualt).toMatchSnapshot();

    // new scripts
    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');
  });

  test('migrate would skip steps after migrate init', async () => {
    // migrate init
    await runBin('migrate', ['init'], {
      cwd: basePath,
    });

    let fileList = readdirSync(basePath);

    // Dependencies
    const packageJson = JSON.parse(
      await fs.readFile(resolve(basePath, 'package.json'), 'utf-8')
    ) as PackageJson;
    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps || {}).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // tsconfig.json
    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json')) as TSConfig;
    expect(tsConfig).matchSnapshot();

    // lint config
    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');
    const lintConfig = readFileSync(resolve(basePath, '.eslintrc.js'), { encoding: 'utf-8' });
    const lintConfigDefualt = readFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), {
      encoding: 'utf-8',
    });
    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefualt).toMatchSnapshot();

    // new scripts
    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');

    // run migrate
    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: basePath,
    });
    // migrate init output
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    // read files again
    fileList = readdirSync(basePath);
    // file structures
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');

    // file contents
    expect(readFileSync(resolve(basePath, 'foo.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
    expect(
      readFileSync(resolve(basePath, 'depends-on-foo.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();
    expect(readFileSync(resolve(basePath, 'index.ts'), { encoding: 'utf-8' })).toMatchSnapshot();

    // report
    const reportPath = resolve(basePath, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');
  });

  test('--skip-init option', async () => {
    // run migrate with --skip-init
    // this command should fail
    expect.assertions(1);
    try {
      const { stdout } = await runBin('migrate', ['--skip-init', '--ci'], {
        cwd: basePath,
      });
      // validate -> initialize -> analyze -> convert
      const expected = [
        '[STARTED] Validate project',
        '[SUCCESS] Validate project',
        '[STARTED] Initialize',
        '[DATA] Setting up config for initialization',
        '[SUCCESS] Initialize',
        '[STARTED] Analyzing Project',
        '[DATA] Running migration on initialization',
        '[SUCCESS] Analyzing Project',
        '[STARTED] Convert JS files to TS`;',
      ].join('\n');
      expect(stdout).toContain(expected);
    } catch (e) {
      // no-ops
    }
  });

  test('Print debug messages with --verbose', async () => {
    const { stdout } = await runBin('migrate', ['--verbose', '--ci'], {
      cwd: basePath,
    });

    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('show warning message for missing config with --regen', async () => {
    const { stdout } = await runBin('migrate', ['-r', '--ci'], {
      cwd: basePath,
    });
    expect(stdout).toContain('Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist');
    expect(stdout).toContain('tsconfig.json does not exist');
  });

  test('regen result after the first pass', async () => {
    // first run without --regen
    await runBin('migrate', ['--ci'], {
      cwd: basePath,
    });
    const { stdout } = await runBin('migrate', ['-r', '--ci'], {
      cwd: basePath,
    });
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  describe('user defined options passed by --user-config -u', () => {
    function createUserConfig(basePath: string, config: CustomConfig): void {
      const configPath = resolve(basePath, 'rehearsal-config.json');
      writeJSONSync(configPath, config);
    }

    test('migrate.exclude', async () => {
      const files = getFiles('simple');
      // Add a directory that we don't want to ignore
      files['some-dir'] = { 'index.js': '// I should be excluded ' };
      const basePath = create(files);

      createUserConfig(basePath, {
        migrate: {
          setup: {
            ts: { command: 'touch', args: ['custom-ts-config-script'] },
          },
          exclude: ['some-dir'],
        },
      });

      const result = await runBin('migrate', ['-d', '-u', 'rehearsal-config.json', '--ci'], {
        cwd: basePath,
      });

      const expected = [
        '[STARTED] Initialize',
        '[DATA] Setting up config for my-package',
        '[SUCCESS] Initialize',
        '[STARTED] Analyzing Project',
        '[DATA] Running migration on my-package',
        '[DATA] List of files will be attempted to migrate:',
        '[DATA]  lib/a.js',
        '[DATA] index.js',
        '[SUCCESS] Analyzing Project',
      ].join('\n');

      expect(result.stdout).contains(expected);
    });

    test('migrate.include', async () => {
      const files = getFiles('simple');

      // test is a default ignored directory in Package.ts
      // adding it to the include list should override that value.
      files['test'] = { 'index.js': '// I should be included ' };
      const basePath = create(files);

      createUserConfig(basePath, {
        migrate: {
          setup: {
            ts: { command: 'touch', args: ['custom-ts-config-script'] },
          },
          include: ['test'],
        },
      });

      const result = await runBin('migrate', ['-d', '-u', 'rehearsal-config.json', '--ci'], {
        cwd: basePath,
      });
      const expected = [
        '[STARTED] Initialize',
        '[DATA] Setting up config for my-package',
        '[SUCCESS] Initialize',
        '[STARTED] Analyzing Project',
        '[DATA] Running migration on my-package',
        '[DATA] List of files will be attempted to migrate:',
        '[DATA]  lib/a.js',
        '[DATA] index.js',
        '[DATA] test/index.js',
        '[SUCCESS] Analyzing Project',
      ].join('\n');

      expect(result.stdout).contains(expected);
    });
  });
});
