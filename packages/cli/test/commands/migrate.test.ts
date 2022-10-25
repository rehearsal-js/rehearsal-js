import { resolve } from 'path';
import { copySync, readdirSync, readFileSync, readJSONSync, writeJSONSync } from 'fs-extra';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

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
  return targetDir;
}

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('migrate - install dependencies', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Do install typescript dependency if project dose not have one', async () => {
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('[SUCCESS] Installing dependencies');
  });

  test('Do not install typescript dependency if project already has one', async () => {
    // at this point project already have typescript installed in previous test
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain(
      '[SKIPPED] typescript already exists. Skipping installing typescript.'
    );
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

  test('Do not create tsconfig if there is an existed one', async () => {
    // tsconfig already created from previous test
    const result = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(result.stdout).toContain('skipping creating tsconfig.json');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
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

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
    expect(readdirSync(basePath)).toContain('index.ts');
    expect(readdirSync(basePath)).toContain('foo.ts');

    expect(readdirSync(basePath)).not.toContain('index.js');
    expect(readdirSync(basePath)).not.toContain('foo.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
    expect(config.include).toContain('foo.ts');
  });

  test('able to migrate from specific entrypoint', async () => {
    console.log(basePath);
    const result = await runBin('migrate', ['--entrypoint', 'depends-on-foo.js'], {
      cwd: basePath,
    });

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
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

  test('Generate report with -r flag', async () => {
    await runBin('migrate', ['-r', 'json,md,sarif,foo'], {
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

    expect(result.stdout).toContain('Creating .eslintrc.js from custom config.');
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
    const result = await runBin('migrate', ['--basePath', customBasePath], {
      cwd: basePath, // still run cli in basePath
    });

    expect(result.stdout).toContain('[SUCCESS] Installing dependencies');
    expect(result.stdout).toContain('Creating tsconfig');
    expect(readdirSync(customBasePath)).toContain('tsconfig.json');

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
    expect(readdirSync(customBasePath)).toContain('index.ts');
    expect(readdirSync(customBasePath)).not.toContain('index.js');

    const config = readJSONSync(resolve(customBasePath, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
  });
});
