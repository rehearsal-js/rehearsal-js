import { resolve } from 'path';
import {
  copySync,
  readdirSync,
  readJSONSync,
  writeJSONSync,
  realpathSync,
  writeFileSync,
} from 'fs-extra';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { type SimpleGit, type SimpleGitOptions, simpleGit } from 'simple-git';

import { runBin } from '../test-helpers';
import { REQUIRED_DEPENDENCIES } from '../../src/commands/migrate/tasks/dependency-install';
import type { CustomConfig } from '../../src/types';

setGracefulCleanup();

// TODO migrate this to fixturify
const FIXTURE_APP_DIR = resolve(__dirname, '../fixtures/app_for_migrate');
const TEST_SRC_DIR = resolve(FIXTURE_APP_DIR, 'src');

function prepareTmpDir(dir: string): string {
  const srcDir = resolve(TEST_SRC_DIR, dir);
  const { name: targetDir } = dirSync();
  copySync(srcDir, targetDir);
  // /var is a symlink to /private/var, use realpath to return /private/var
  return realpathSync(targetDir);
}

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('migrate - check repo status', async () => {
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
      binary: 'git',
      maxConcurrentProcesses: 6,
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

describe('migrate - initialization', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('print files will be attempted to migrate with --dryRun', async () => {
    const result = await runBin('migrate', ['-d'], {
      cwd: basePath,
    });

    expect(result.stdout).toMatchSnapshot();
  });

  // TODO: add tests for other cases
  // figure out a way to test the ctx result in other scenario during initialization
});

describe('migrate - install dependencies', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Install required dependencies', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;

    expect(result.stdout).toContain('Install dependencies');
    expect(Object.keys(devDeps).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());
  });

  test('Install custom dependencies', async () => {
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: [],
          devDependencies: ['fs-extra'],
        },
      },
    });
    const result = await runBin('migrate', ['-u', 'rehearsal-config.json'], {
      cwd: basePath,
    });

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    const devDeps = packageJson.devDependencies;

    expect(result.stdout).toContain('Install dependencies from config');
    expect(devDeps).toHaveProperty('fs-extra');
  });
});

describe('migrate - generate tsconfig', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Create basic tsconfig', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('Create tsconfig.json');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
  });

  test('stage tsconfig if in git repo', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    // Init git, add and commit existed files, to make it a clean state
    await git.init();
    await git.add(resolve(basePath, 'package.json'));
    await git.commit('foo');

    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    const gitStatus = await git.status();
    expect(gitStatus.staged).toContain('tsconfig.json');

    expect(result.stdout).toContain('Create tsconfig.json');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
  });

  test('On tsconfig exists, ensure strict mode', async () => {
    const oldConfig = { compilerOptions: { strict: false } };
    writeJSONSync(resolve(basePath, 'tsconfig.json'), oldConfig);
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('ensuring strict mode is enabled');
    expect(readdirSync(basePath)).toContain('tsconfig.json');

    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(tsConfig.compilerOptions.strict).toBeTruthy;
  });

  test('Custom ts config command with user config provided', async () => {
    createUserConfig(basePath, {
      migrate: {
        setup: {
          ts: { command: 'touch', args: ['custom-ts-config-script'] },
        },
      },
    });

    await runBin('migrate', ['-u', 'rehearsal-config.json'], {
      cwd: basePath,
    });

    expect(readdirSync(basePath)).toContain('custom-ts-config-script');
  });
});

describe('migrate - JS to TS conversion', async () => {
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

    expect(readdirSync(basePath)).toContain('index.ts');
    expect(readdirSync(basePath)).toContain('foo.ts');
    expect(readdirSync(basePath)).toContain('depends-on-foo.ts');

    expect(readdirSync(basePath)).not.toContain('index.js');
    expect(readdirSync(basePath)).not.toContain('foo.js');
    expect(readdirSync(basePath)).not.toContain('depends-on-foo.js');

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
    expect(readdirSync(basePath)).toContain('depends-on-foo.ts');
    expect(readdirSync(basePath)).toContain('foo.ts');

    expect(readdirSync(basePath)).not.toContain('depends-on-foo.js');
    expect(readdirSync(basePath)).not.toContain('foo.js');

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

    expect(readdirSync(reportPath)).toContain('migrate-report.json');
    expect(readdirSync(reportPath)).toContain('migrate-report.md');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');
    expect(readdirSync(reportPath)).not.toContain('migrate-report.foo');
  });
});

describe('migrate - generate eslint config', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('create .eslintrc.js if not existed', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain(
      'Create .eslintrc.js, extending Rehearsal default typescript-related config'
    );
    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const eslintConfig = require(resolve(basePath, '.eslintrc.js'));
    expect(eslintConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.js']);
  });

  test('extends .eslintrc.js if existed', async () => {
    const oldConfig = `
    module.exports = {extends: ['foo']};
  `;
    writeFileSync(resolve(basePath, '.eslintrc.js'), oldConfig);

    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('extending Rehearsal default typescript-related config');
    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const newConfig = require(resolve(basePath, '.eslintrc.js'));
    expect(newConfig.extends).toStrictEqual(['foo', './.rehearsal-eslintrc.js']);
  });

  test('stage lint configs if in git repo', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    // Init git, add and commit existed files, to make it a clean state
    await git.init();
    await git.add(resolve(basePath, 'package.json'));
    await git.commit('foo');

    await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');

    const gitStatus = await git.status();
    expect(gitStatus.staged).toContain('.eslintrc.js');
    expect(gitStatus.staged).toContain('.rehearsal-eslintrc.js');
  });

  test('Run custom lint config command with user config provided', async () => {
    basePath = prepareTmpDir('initialization');
    createUserConfig(basePath, {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    });

    const result = await runBin('migrate', ['-u', 'rehearsal-config.json'], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('Create .eslintrc.js from config');
    expect(readdirSync(basePath)).toContain('custom-lint-config-script');
  });
});

describe('migrate - handle custom basePath', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('custom_basepath');
  });

  test('Run cli againt specific basePath via -basePath option', async () => {
    const customBasePath = resolve(basePath, 'base');
    const result = await runBin('migrate', ['--basePath', customBasePath]);

    expect(result.stdout).toContain('Install dependencies');
    expect(result.stdout).toContain('Create tsconfig.json');
    expect(readdirSync(customBasePath)).toContain('tsconfig.json');

    expect(result.stdout).toContain(`1 JS file converted to TS`);
    expect(readdirSync(customBasePath)).toContain('index.ts');
    expect(readdirSync(customBasePath)).not.toContain('index.js');

    const config = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
  });
});

describe('migrate - new scripts for TS', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('add build:tsc and lint:tsc in package.json ', async () => {
    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Add package scripts');

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    expect(packageJson.scripts['build:tsc']).toBe('tsc -b');
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');
  });
});
