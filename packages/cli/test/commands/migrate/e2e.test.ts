import { resolve } from 'path';
import { readFileSync } from 'fs';
import { readdirSync, readJSONSync, writeJSONSync } from 'fs-extra';
import { setGracefulCleanup, dirSync } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { simpleGit, type SimpleGitOptions } from 'simple-git';
import { create, getFiles } from '@rehearsal/test-support';
import yaml from 'js-yaml';
import fixturify = require('fixturify');
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install';

import { runBin, prepareTmpDir, cleanOutput } from '../../test-helpers';
import { CustomConfig } from '../../../src/types';

setGracefulCleanup();

describe('migrate - validation', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('pass in a non git project', async () => {
    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('pass in a clean git project', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .add('package.json')
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .commit('test');

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('exit in a dirty git project', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init().add('package.json');

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain(
      'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
    );
  });

  test('pass in a dirty git project with --dryRun', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init().add('package.json');

    const { stdout } = await runBin('migrate', ['-d'], {
      cwd: basePath,
    });

    expect(stdout).toContain('Initialize -- Dry Run Mode');
    expect(stdout).toContain('List of files will be attempted to migrate:');
  });

  test('pass in a dirty git project with --regen', async () => {
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init();

    const { stdout } = await runBin('migrate', ['-r'], {
      cwd: basePath,
    });
    expect(stdout).not.toContain(
      'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
    );
  });

  test('pass in a dirty git in multi runs', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .add('package.json')
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .commit('test');

    const { stdout: firstRunStdout } = await runBin('migrate', [], {
      cwd: basePath,
    });
    expect(firstRunStdout).not.toContain(
      'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
    );
    expect(firstRunStdout).toContain('Migration Complete');

    const { stdout: secondRunStdout } = await runBin('migrate', [], {
      cwd: basePath,
    });
    expect(cleanOutput(secondRunStdout, basePath)).toMatchSnapshot();
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

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });
    expect(stdout).not.toContain(
      'migrate command needs to be running at project root with workspaces'
    );
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

    const { stdout: secondRunStdout } = await runBin('migrate', [], {
      cwd: basePath,
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

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });
    expect(stdout).not.toContain(
      'migrate command needs to be running at project root with workspaces'
    );
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

    const { stdout: secondRunStdout } = await runBin('migrate', [], {
      cwd: basePath,
    });
    expect(cleanOutput(secondRunStdout, basePath)).toMatchSnapshot();
  });

  test('relative entrypoint inside project root works', async () => {
    basePath = prepareTmpDir('basic');

    const { stdout } = await runBin('migrate', ['-e', 'foo.js'], {
      cwd: basePath,
    });
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('absolute entrypoint inside project root works', async () => {
    basePath = prepareTmpDir('basic');

    const { stdout } = await runBin('migrate', ['-e', resolve(basePath, 'foo.js')], {
      cwd: basePath,
    });
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('entrypoint outside project root does not work', async () => {
    basePath = prepareTmpDir('basic');

    const { stdout } = await runBin('migrate', ['-e', resolve(__dirname, 'e2e.test.ts')], {
      cwd: basePath,
    });
    expect(stdout).toContain('Could not find entrypoint');
  });
});

describe('migrate: e2e', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('default migrate command', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .add('./*')
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .commit('test');

    const { stdout } = await runBin('migrate', [], {
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
    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // report
    const reportPath = resolve(basePath, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');

    // tsconfig.json
    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));
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
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');

    // stage all config files
    const gitStatus = await git.status();
    expect(gitStatus.staged).toStrictEqual([
      '.eslintrc.js',
      '.rehearsal-eslintrc.js',
      '.rehearsal/migrate-report.json',
      '.rehearsal/migrate-report.sarif',
      'tsconfig.json',
    ]);
  });

  test('init flag', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .add('./*')
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .commit('test');

    const { stdout } = await runBin('migrate', ['--init'], {
      cwd: basePath,
    });

    // summary message
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    // file structures
    const fileList = readdirSync(basePath);
    expect(fileList).not.toContain('index.ts');
    expect(fileList).not.toContain('foo.ts');
    expect(fileList).not.toContain('depends-on-foo.ts');
    expect(fileList).toContain('index.js');
    expect(fileList).toContain('foo.js');
    expect(fileList).toContain('depends-on-foo.js');
    expect(fileList).toContain('tsconfig.json');
    expect(fileList).toContain('package.json');
    expect(fileList).toContain('.rehearsal-eslintrc.js');

    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(tsConfig).matchSnapshot();

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');

    const eslint = readFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), 'utf-8');
    expect(eslint).toMatchSnapshot();
  });

  test('Print debug messages with --verbose', async () => {
    const { stdout } = await runBin('migrate', ['--verbose'], {
      cwd: basePath,
    });

    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('show warning message for missing config with --regen', async () => {
    const { stdout } = await runBin('migrate', ['-r'], {
      cwd: basePath,
    });
    expect(stdout).toContain('Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist');
    expect(stdout).toContain('tsconfig.json does not exist');
  });

  test('regen result after the first pass', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .add('./*')
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .commit('test');

    // first run without --regen
    await runBin('migrate', [], {
      cwd: basePath,
    });
    const { stdout } = await runBin('migrate', ['-r'], {
      cwd: basePath,
    });
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  describe('user defined options passed by --user-config -u', async () => {
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

      const result = await runBin('migrate', ['-d', '-u', 'rehearsal-config.json'], {
        cwd: basePath,
      });

      const expected = `[STARTED] Initialize -- Dry Run Mode
[DATA] Running migration on my-package
[DATA] List of files will be attempted to migrate:
[DATA]  lib/a.js
[DATA] index.js`;

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

      const result = await runBin('migrate', ['-d', '-u', 'rehearsal-config.json'], {
        cwd: basePath,
      });

      const expected = `[STARTED] Initialize -- Dry Run Mode
[DATA] Running migration on my-package
[DATA] List of files will be attempted to migrate:
[DATA]  lib/a.js
[DATA] index.js
[DATA] test/index.js
[SUCCESS] Initialize -- Dry Run Mode`;

      expect(result.stdout).contains(expected);
    });
  });
});
