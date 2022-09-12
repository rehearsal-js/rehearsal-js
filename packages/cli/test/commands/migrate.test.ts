import { copySync, readdirSync, readFileSync, readJSONSync } from 'fs-extra';
import { resolve } from 'path';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { runYarnOrNpmCommand } from '../../src/utils';
import { runLinkedBin } from '../test-helpers';

const FIXTURE_APP_DIR = resolve(__dirname, '../fixtures/app_for_migrate');
const TEST_SRC_DIR = resolve(FIXTURE_APP_DIR, 'src');

function prepareTmpDir(dir: string): string {
  const srcDir = resolve(TEST_SRC_DIR, dir);
  const { name: targetDir } = dirSync();
  copySync(srcDir, targetDir);
  return targetDir;
}

beforeAll(async () => {
  // Link bin/rehearsal to be able to run the full cli
  await runYarnOrNpmCommand(['link']);
  setGracefulCleanup();
});

afterAll(async () => {
  try {
    await runYarnOrNpmCommand(['unlink']);
  } catch (e) {
    // no-ops
  }
});

describe('migrate - install typecript', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Do install typescript dependency if project dose not have one', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain('[SUCCESS] Installing dependencies');
  });

  test('Do not install typescript dependency if project already has one', async () => {
    // at this point project already have typescript installed in previous test
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain(
      '[SKIPPED] typescript already exists. Skipping installing typescript.'
    );
  });
});

describe('migrate - generate tsconfig', async () => {
  let basePath = '';

  beforeAll(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('Create basic tsconfig', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain('Creating basic tsconfig');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
  });

  test('Do not create tsconfig if there is an existed one', async () => {
    // tsconfig already created from previous test
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain('skipping creating tsconfig.json');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
  });

  test('Create strict tsconfig', async () => {
    // reset the test dir
    basePath = prepareTmpDir('initialization');

    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js', '-s'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain('Creating strict tsconfig');
    expect(readdirSync(basePath)).toContain('tsconfig.json');
    const content = readFileSync(resolve(basePath, 'tsconfig.json'), 'utf-8');
    expect(content).toMatchSnapshot();
  });
});

describe('migrate - JS to TS conversion', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('basic');
  });

  test('able to migrate single JS file', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js', '-v'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
    expect(readdirSync(basePath)).toContain('index.ts');

    const content = readFileSync(resolve(basePath, 'index.ts'), 'utf-8');
    expect(content).toMatchSnapshot();

    // keep old JS files without --clean flag
    expect(readdirSync(basePath)).toContain('index.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toEqual(['index.ts']);
  });

  test('Print debug messages with verbose', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js', '--verbose'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
  });

  test('Generate report with -r flag', async () => {
    await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'index.js', '-r', 'json,md,sarif,foo'],
      {
        cwd: basePath,
      }
    );

    expect(readdirSync(basePath)).toContain('.rehearsal-report.json');
    expect(readdirSync(basePath)).toContain('.rehearsal-report.md');
    expect(readdirSync(basePath)).toContain('.rehearsal-report.sarif');
    expect(readdirSync(basePath)).not.toContain('.rehearsal-report.foo');
  });

  test('able to migrate multiple JS file from an entrypoint', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'depends-on-foo.js'],
      {
        cwd: basePath,
      }
    );

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
    expect(readdirSync(basePath)).toContain('foo.ts');
    expect(readdirSync(basePath)).toContain('depends-on-foo.ts');

    const foo = readFileSync(resolve(basePath, 'foo.ts'), 'utf-8');
    const depends_on_foo = readFileSync(resolve(basePath, 'depends-on-foo.ts'), 'utf-8');

    expect(foo).toMatchSnapshot();
    expect(depends_on_foo).toMatchSnapshot();

    // keep old JS files without --clean flag
    expect(readdirSync(basePath)).toContain('depends-on-foo.js');
    expect(readdirSync(basePath)).toContain('foo.js');

    const config = readJSONSync(resolve(basePath, 'tsconfig.json'));
    expect(config.include).toEqual(['foo.ts', 'depends-on-foo.ts']);
  });

  test('able to cleanup old JS filse', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--basePath', basePath, '--entrypoint', 'depends-on-foo.js', '--clean'],
      { cwd: basePath }
    );

    expect(result.stdout).toContain(`[SUCCESS] Clean up old JS files`);
    expect(readdirSync(basePath)).toContain('foo.ts');
    expect(readdirSync(basePath)).toContain('depends-on-foo.ts');
    expect(readdirSync(basePath)).not.toContain('bar.js');
    expect(readdirSync(basePath)).not.toContain('depends-on-foo.js');
  });
});
