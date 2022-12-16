import { resolve } from 'path';
import { copySync, readdirSync, readJSONSync, writeJSONSync, realpathSync } from 'fs-extra';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { type SimpleGit, type SimpleGitOptions, simpleGit } from 'simple-git';

import { CustomConfig } from '../../src/types';
import { runBin } from '../test-helpers';

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

    expect(stdout).toContain('Initialization Completed!');
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

    expect(stdout).toContain('Initialization Completed!');
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
});

describe('migrate - install dependencies', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Do install typescript dependency if project dose not have one', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('Installing dependencies');
  });

  test('Install custom dependencies with user config provided', async () => {
    basePath = prepareTmpDir('initialization');
    createUserConfig(basePath, {
      migrate: {
        install: {
          dependencies: ['fs-extra'],
          devDependencies: ['@types/fs-extra'],
        },
      },
    });

    const result = await runBin('migrate', ['-u', 'rehearsal-config.json'], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('Installing custom dependencies');

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    expect(packageJson.dependencies).toHaveProperty('fs-extra');
    expect(packageJson.devDependencies).toHaveProperty('@types/fs-extra');
  });
});

describe('migrate - generate tsconfig', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Create basic tsconfig', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('Creating tsconfig');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
  });

  test('On tsconfig exists, ensure strict mode', async () => {
    // tsconfig already created from previous test
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('ensuring strict mode is enabled');
    expect(readdirSync(basePath)).toContain('tsconfig.json');

    const tsConfig = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(tsConfig.compilerOptions.strict).toBeTruthy;
  });

  test('runBin custom ts config command with user config provided', async () => {
    basePath = prepareTmpDir('initialization');
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

  test('able to migrate from default index.js', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    // Test logger messages from package/migrate
    expect(result.stdout).toContain('info');
    expect(result.stdout).toContain('Moving: /foo.js to /foo.ts');
    expect(result.stdout).toContain('Moving: /index.js to /index.ts');
    expect(result.stdout).toContain('Processing:');

    // Test summary message
    expect(result.stdout).toContain(`2 JS files has been converted to TS`);

    expect(readdirSync(basePath)).toContain('index.ts');
    expect(readdirSync(basePath)).toContain('foo.ts');

    expect(readdirSync(basePath)).not.toContain('index.js');
    expect(readdirSync(basePath)).not.toContain('foo.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
    expect(config.include).toContain('foo.ts');
  });

  test('able to migrate from specific entrypoint', async () => {
    const result = await runBin('migrate', ['--entrypoint', 'depends-on-foo.js'], {
      cwd: basePath,
    });

    expect(result.stdout).toContain(`2 JS files has been converted to TS`);
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

    expect(readdirSync(reportPath)).toContain('report.sarif');
  });

  test('Generate report in different formats with -f flag', async () => {
    await runBin('migrate', ['-f', 'json,md,sarif,foo'], {
      cwd: basePath,
    });

    const reportPath = resolve(basePath, '.rehearsal');

    expect(readdirSync(reportPath)).toContain('report.json');
    expect(readdirSync(reportPath)).toContain('report.md');
    expect(readdirSync(reportPath)).toContain('report.sarif');
    expect(readdirSync(reportPath)).not.toContain('report.foo');
  });
});

describe('migrate - generate eslint config', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('initialization');
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

    expect(result.stdout).toContain('Creating .eslintrc.js from custom config');
    expect(readdirSync(basePath)).toContain('custom-lint-config-script');
  });
});

describe('migrate - handle custom basePath', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('custom_basepath');
  });

  test('Run cli againt specific basePath via -basePath option', async () => {
    const customBasePath = resolve(basePath, 'base');
    const result = await runBin('migrate', ['--basePath', customBasePath]);

    expect(result.stdout).toContain('Installing dependencies');
    expect(result.stdout).toContain('Creating tsconfig');
    expect(readdirSync(customBasePath)).toContain('tsconfig.json');

    expect(result.stdout).toContain(`1 JS file has been converted to TS`);
    expect(readdirSync(customBasePath)).toContain('index.ts');
    expect(readdirSync(customBasePath)).not.toContain('index.js');

    const config = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
  });
});

describe('migrate - new scripts for TS', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('basic');
  });

  test('add build:tsc and lint:tsc in package.json ', async () => {
    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Creating new scripts for Typescript in package.json');

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    expect(packageJson.scripts['build:tsc']).toBe('tsc -b');
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');
  });
});
