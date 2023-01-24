import { resolve } from 'path';
import { readdirSync, readJSONSync } from 'fs-extra';
import { setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';

import { runBin, prepareTmpDir } from '../test-helpers';

setGracefulCleanup();

describe('migrateOld - check repo status', async () => {
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
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init();
    await git.add('package.json');
    // GH CI would require git name and email
    await git.addConfig('user.name', 'tester');
    await git.addConfig('user.email', 'tester@tester.com');
    await git.commit('test');

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('exit in a dirty git project', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
      binary: 'git',
      maxConcurrentProcesses: 6,
    } as Partial<SimpleGitOptions>);
    await git.init();
    await git.add('package.json');

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain(
      'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
    );
  });

  test('pass in a dirty git project with --dryRun', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
      binary: 'git',
      maxConcurrentProcesses: 6,
    } as Partial<SimpleGitOptions>);
    await git.init();
    await git.add('package.json');

    const { stdout } = await runBin('migrate', ['-d'], {
      cwd: basePath,
    });

    expect(stdout).toContain('Initialize -- Dry Run Mode');
    expect(stdout).toContain('List of files will be attempted to migrate:');
  });
});

// describe('migrate - JS to TS conversion', async () => {
//   let basePath = '';

//   beforeEach(() => {
//     basePath = prepareTmpDir('basic');
//   });

//   test('able to migrate from default all files .js in root', async () => {
//     const result = await runBin('migrate', [], {
//       cwd: basePath,
//     });

//     // Test summary message
//     expect(result.stdout).toContain(`3 JS files converted to TS`);

//     expect(readdirSync(basePath)).toContain('index.ts');
//     expect(readdirSync(basePath)).toContain('foo.ts');
//     expect(readdirSync(basePath)).toContain('depends-on-foo.ts');

//     expect(readdirSync(basePath)).not.toContain('index.js');
//     expect(readdirSync(basePath)).not.toContain('foo.js');
//     expect(readdirSync(basePath)).not.toContain('depends-on-foo.js');

//     const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
//     expect(config.include).toContain('index.ts');
//     expect(config.include).toContain('foo.ts');
//     expect(config.include).toContain('depends-on-foo.ts');
//   });

//   test('able to migrate from specific entrypoint', async () => {
//     const result = await runBin('migrate', ['--entrypoint', 'depends-on-foo.js'], {
//       cwd: basePath,
//     });

//     expect(result.stdout).toContain(`2 JS files converted to TS`);
//     expect(readdirSync(basePath)).toContain('depends-on-foo.ts');
//     expect(readdirSync(basePath)).toContain('foo.ts');

//     expect(readdirSync(basePath)).not.toContain('depends-on-foo.js');
//     expect(readdirSync(basePath)).not.toContain('foo.js');

//     const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
//     expect(config.include).toContain('depends-on-foo.ts');
//     expect(config.include).toContain('foo.ts');
//   });

//   test('Print debug messages with verbose', async () => {
//     const result = await runBin('migrate', ['--verbose'], {
//       cwd: basePath,
//     });

//     expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
//   });

//   test('Generate sarif report by default', async () => {
//     await runBin('migrate', [], {
//       cwd: basePath,
//     });

//     const reportPath = resolve(basePath, '.rehearsal');

//     expect(readdirSync(reportPath)).toContain('migrate-report.sarif');
//   });

//   test('stage report if in a git repo', async () => {
//     // simulate clean git project
//     const git: SimpleGit = simpleGit({
//       baseDir: basePath,
//     } as Partial<SimpleGitOptions>);
//     // Init git, add and commit existed files, to make it a clean state
//     await git.init();
//     await git.add(readdirSync(basePath));
//     // GH CI would require git name and email
//     await git.addConfig('user.name', 'tester');
//     await git.addConfig('user.email', 'tester@tester.com');
//     await git.commit('foo');

//     await runBin('migrate', [], {
//       cwd: basePath,
//     });

//     const reportPath = resolve(basePath, '.rehearsal');
//     expect(readdirSync(reportPath)).toContain('migrate-report.sarif');

//     const gitStatus = await git.status();
//     expect(gitStatus.staged).toStrictEqual([
//       '.eslintrc.js',
//       '.rehearsal-eslintrc.js',
//       '.rehearsal/migrate-report.sarif',
//       'tsconfig.json',
//     ]);
//   });

//   test('Generate report in different formats with -f flag', async () => {
//     await runBin('migrate', ['-f', 'json,md,sarif,foo'], {
//       cwd: basePath,
//     });

//     const reportPath = resolve(basePath, '.rehearsal');

//     expect(readdirSync(reportPath)).toContain('migrate-report.json');
//     expect(readdirSync(reportPath)).toContain('migrate-report.md');
//     expect(readdirSync(reportPath)).toContain('migrate-report.sarif');
//     expect(readdirSync(reportPath)).not.toContain('migrate-report.foo');
//   });
// });

// describe('migrate - handle custom basePath', async () => {
//   let basePath = '';

//   beforeEach(() => {
//     basePath = prepareTmpDir('custom_basepath');
//   });

//   test('Run cli againt specific basePath via -basePath option', async () => {
//     const customBasePath = resolve(basePath, 'base');
//     const result = await runBin('migrate', ['--basePath', customBasePath]);

//     expect(result.stdout).toContain('Install dependencies');
//     expect(result.stdout).toContain('Create tsconfig.json');
//     expect(readdirSync(customBasePath)).toContain('tsconfig.json');

//     expect(result.stdout).toContain(`1 JS file converted to TS`);
//     expect(readdirSync(customBasePath)).toContain('index.ts');
//     expect(readdirSync(customBasePath)).not.toContain('index.js');

//     const config = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
//     expect(config.include).toContain('index.ts');
//   });
// });
