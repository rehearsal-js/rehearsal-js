import { resolve } from 'path';
import { readdirSync, readJSONSync } from 'fs-extra';
import { setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';

import { runBin, prepareTmpDir } from '../../test-helpers';

setGracefulCleanup();

// These tests are using `runBin` to call the entire `migrate` command instead of testing the individual convert task
// Since there are a lot of context needs to be injected
// And it does make sense to run the whole cli for this case
describe('Task: convert', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('able to migrate from default all files .js in root', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    // Test summary message
    expect(result.stdout).toContain(`3 JS files converted to TS`);

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

  test('able to migrate from specific entrypoint', async () => {
    const result = await runBin('migrate', ['--entrypoint', 'depends-on-foo.js'], {
      cwd: basePath,
    });

    expect(result.stdout).toContain(`2 JS files converted to TS`);

    const fileList = readdirSync(basePath);
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).toContain('foo.ts');

    expect(fileList).not.toContain('depends-on-foo.js');
    expect(fileList).not.toContain('foo.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toContain('depends-on-foo.ts');
    expect(config.include).toContain('foo.ts');
  });

  test('Print debug messages with verbose', async () => {
    const result = await runBin('migrate', ['--verbose'], {
      cwd: basePath,
    });

    expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
  });

  test('Generate sarif report by default', async () => {
    await runBin('migrate', [], {
      cwd: basePath,
    });

    const reportPath = resolve(basePath, '.rehearsal');

    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');
  });

  test('stage report if in a git repo', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    // Init git, add and commit existed files, to make it a clean state
    await git.init();
    await git.add(readdirSync(basePath));
    // GH CI would require git name and email
    await git.addConfig('user.name', 'tester');
    await git.addConfig('user.email', 'tester@tester.com');
    await git.commit('foo');

    await runBin('migrate', [], {
      cwd: basePath,
    });

    const reportPath = resolve(basePath, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');

    const gitStatus = await git.status();
    expect(gitStatus.staged).toStrictEqual([
      '.eslintrc.js',
      '.rehearsal-eslintrc.js',
      '.rehearsal/migrate-report.sarif',
      'tsconfig.json',
    ]);
  });

  test('Generate report in different formats with -f flag', async () => {
    await runBin('migrate', ['-f', 'json,md,sarif,foo'], {
      cwd: basePath,
    });

    const reportPath = resolve(basePath, '.rehearsal');

    const reportList = readdirSync(reportPath);

    expect(reportList).toContain('migrate-report.json');
    expect(reportList).toContain('migrate-report.md');
    expect(reportList).toContain('migrate-report.sarif');
    expect(reportList).not.toContain('migrate-report.foo');
  });

  test('Run cli againt specific basePath via -basePath option', async () => {
    basePath = prepareTmpDir('custom_basepath');

    const customBasePath = resolve(basePath, 'base');
    const result = await runBin('migrate', ['--basePath', customBasePath]);

    const fileList = readdirSync(customBasePath);

    expect(result.stdout).toContain('Install dependencies');
    expect(result.stdout).toContain('Create tsconfig.json');
    expect(fileList).toContain('tsconfig.json');

    expect(result.stdout).toContain(`1 JS file converted to TS`);
    expect(fileList).toContain('index.ts');
    expect(fileList).not.toContain('index.js');

    const config = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
  });
});
