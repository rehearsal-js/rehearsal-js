import { resolve } from 'path';
import { readFileSync } from 'fs';
import { readdirSync, readJSONSync } from 'fs-extra';
import { setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { simpleGit, type SimpleGitOptions } from 'simple-git';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install';

import { runBin, prepareTmpDir, cleanOutput } from '../../test-helpers';

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
    expect(packageJson).matchSnapshot();

    const eslint = readFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), 'utf-8');
    expect(eslint).toMatchSnapshot();
  });

  test('Print debug messages with verbose', async () => {
    const { stdout } = await runBin('migrate', ['--verbose'], {
      cwd: basePath,
    });

    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();
  });

  test('againt specific basePath via -basePath option', async () => {
    basePath = prepareTmpDir('custom_basepath');

    const customBasePath = resolve(basePath, 'base');
    const { stdout } = await runBin('migrate', ['--basePath', customBasePath]);

    // summary message
    expect(cleanOutput(stdout, basePath)).toMatchSnapshot();

    // file structures
    const fileList = readdirSync(customBasePath);
    expect(fileList).toContain('index.ts');
    expect(fileList).not.toContain('index.js');

    // file contents
    expect(
      readFileSync(resolve(customBasePath, 'index.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();

    // Dependencies
    const packageJson = readJSONSync(resolve(customBasePath, 'package.json'));
    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // report
    const reportPath = resolve(customBasePath, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');

    // tsconfig.json
    const tsConfig = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
    expect(tsConfig).matchSnapshot();

    // lint config
    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');
    const lintConfig = readFileSync(resolve(customBasePath, '.eslintrc.js'), { encoding: 'utf-8' });
    const lintConfigDefualt = readFileSync(resolve(customBasePath, '.rehearsal-eslintrc.js'), {
      encoding: 'utf-8',
    });
    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefualt).toMatchSnapshot();

    // new scripts
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');
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
});
