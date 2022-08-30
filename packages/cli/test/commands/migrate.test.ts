import { describe, test, expect, afterAll, beforeEach, beforeAll } from 'vitest';
import { runYarnOrNpmCommand } from '../../src/utils';
import { resolve } from 'path';
import fs from 'fs-extra';
import { runLinkedBin } from '../test-helpers';
import { dirSync, setGracefulCleanup } from 'tmp';

const FIXTURE_APP_DIR = resolve(__dirname, '../fixtures/app_for_migrate');
const TEST_SRC_DIR = resolve(FIXTURE_APP_DIR, 'src');

function prepareTmpDir(dir: string): string {
  const srcDir = resolve(TEST_SRC_DIR, dir);
  const { name: targetDir } = dirSync();
  fs.copySync(srcDir, targetDir);
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
  let root = '';

  beforeAll(() => {
    root = prepareTmpDir('initialization');
  });

  test('Do install typescript dependency if project dose not have one', async () => {
    const result = await runLinkedBin('migrate', ['--root', root, '--entrypoint', 'index.js'], {
      cwd: root,
    });

    expect(result.stdout).toContain('[SUCCESS] Installing dependencies');
  });

  test('Do not install typescript dependency if project already has one', async () => {
    // at this point project already have typescript installed in previous test
    const result = await runLinkedBin('migrate', ['--root', root, '--entrypoint', 'index.js'], {
      cwd: root,
    });

    expect(result.stdout).toContain(
      '[SKIPPED] typescript already exists. Skipping installing typescript.'
    );
  });
});

describe('migrate - generate tsconfig', async () => {
  let root = '';

  beforeAll(() => {
    root = prepareTmpDir('initialization');
  });

  test('Create basic tsconfig', async () => {
    const result = await runLinkedBin('migrate', ['--root', root, '--entrypoint', 'index.js'], {
      cwd: root,
    });

    expect(result.stdout).toContain('Creating basic tsconfig');
    expect(fs.readdirSync(root)).toContain('tsconfig.json');
  });

  test('Do not create tsconfig if there is an existed one', async () => {
    // tsconfig already created from previous test
    const result = await runLinkedBin('migrate', ['--root', root, '--entrypoint', 'index.js'], {
      cwd: root,
    });

    expect(result.stdout).toContain('skipping creating tsconfig.json');
    expect(fs.readdirSync(root)).toContain('tsconfig.json');
  });

  test('Create strict tsconfig', async () => {
    // reset the test dir
    root = prepareTmpDir('initialization');

    const result = await runLinkedBin(
      'migrate',
      ['--root', root, '--entrypoint', 'index.js', '-s'],
      {
        cwd: root,
      }
    );

    expect(result.stdout).toContain('Creating strict tsconfig');
    expect(fs.readdirSync(root)).toContain('tsconfig.json');
    const content = fs.readFileSync(resolve(root, 'tsconfig.json'), 'utf-8');
    expect(content).toMatchSnapshot();
  });
});

describe('migrate - JS to TS conversion', async () => {
  let root = '';

  beforeEach(() => {
    root = prepareTmpDir('basic');
  });

  test('able to migrate single JS file', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--root', root, '--entrypoint', 'index.js', '-v'],
      {
        cwd: root,
      }
    );

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
    expect(fs.readdirSync(root)).toContain('index.ts');

    const content = fs.readFileSync(resolve(root, 'index.ts'), 'utf-8');
    expect(content).toMatchSnapshot();

    // keep old JS files without --clean flag
    expect(fs.readdirSync(root)).toContain('index.js');

    const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
    expect(config.include).toEqual(['index.ts']);
  });

  test('Print debug messages with verbose', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--root', root, '--entrypoint', 'index.js', '--verbose'],
      {
        cwd: root,
      }
    );

    expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
  });

  test('able to migrate multiple JS file from an entrypoint', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--root', root, '--entrypoint', 'depends-on-foo.js'],
      {
        cwd: root,
      }
    );

    expect(result.stdout).toContain(`[SUCCESS] Converting JS files to TS`);
    expect(fs.readdirSync(root)).toContain('foo.ts');
    expect(fs.readdirSync(root)).toContain('depends-on-foo.ts');

    const foo = fs.readFileSync(resolve(root, 'foo.ts'), 'utf-8');
    const depends_on_foo = fs.readFileSync(resolve(root, 'depends-on-foo.ts'), 'utf-8');

    expect(foo).toMatchSnapshot();
    expect(depends_on_foo).toMatchSnapshot();

    // keep old JS files without --clean flag
    expect(fs.readdirSync(root)).toContain('depends-on-foo.js');
    expect(fs.readdirSync(root)).toContain('foo.js');

    const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
    expect(config.include).toEqual(['foo.ts', 'depends-on-foo.ts']);
  });

  test('able to cleanup old JS filse', async () => {
    const result = await runLinkedBin(
      'migrate',
      ['--root', root, '--entrypoint', 'depends-on-foo.js', '--clean'],
      { cwd: root }
    );

    expect(result.stdout).toContain(`[SUCCESS] Clean up old JS files`);
    expect(fs.readdirSync(root)).toContain('foo.ts');
    expect(fs.readdirSync(root)).toContain('depends-on-foo.ts');
    expect(fs.readdirSync(root)).not.toContain('bar.js');
    expect(fs.readdirSync(root)).not.toContain('depends-on-foo.js');
  });
});
