import { describe, test, expect, afterAll, beforeEach, beforeAll } from 'vitest';
import { resolve } from 'path';
import fs from 'fs-extra';
import { run } from '../test-helpers';
import { dirSync } from 'tmp';

const FIXTURE_APP_DIR = resolve(__dirname, '../fixtures/app_for_migrate');
const TEST_SRC_DIR = resolve(FIXTURE_APP_DIR, 'src');
// const TEST_TMP_DIR = resolve(FIXTURE_APP_DIR, 'tmp');

function prepareTmpDir(dir: string): string {
  const srcDir = resolve(TEST_SRC_DIR, dir);
  const { name: targetDir } = dirSync();
  // const targetDir = resolve(TEST_TMP_DIR, dir);
  // fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  fs.copySync(srcDir, targetDir);
  return targetDir;
}

afterAll(async () => {
  // fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
});

// describe('migrate - install typecript', async () => {
//   let root = '';

//   beforeAll(() => {
//     root = prepareTmpDir('initialization');
//   });

//   test('Do install typescript dependency if project dose not have one', async () => {
//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

//     console.log(result.stdout);
//     expect(result.stdout).toContain('[SUCCESS] Installing dependencies');
//   });

//   test('Do not install typescript dependency if project already has one', async () => {
//     // at this point project already have typescript installed in previous test
//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

//     console.log(result.stdout);
//     expect(result.stdout).toContain(
//       '[SKIPPED] typescript already exists. Skipping installing typescript.'
//     );
//   });
// });

// describe('migrate - generate tsconfig', async () => {
//   let root = '';

//   beforeAll(() => {
//     root = prepareTmpDir('initialization');
//   });

//   test('Create basic tsconfig', async () => {
//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

//     expect(result.stdout).toContain('Creating basic tsconfig');
//     expect(fs.readdirSync(root)).toContain('tsconfig.json');
//   });

//   test('Do not create tsconfig if there is an existed one', async () => {
//     // tsconfig already created from previous test
//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

//     expect(result.stdout).toContain('skipping creating tsconfig.json');
//     expect(fs.readdirSync(root)).toContain('tsconfig.json');
//   });

//   test('Create strict tsconfig', async () => {
//     // reset the test dir
//     root = prepareTmpDir('initialization');

//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js', '-s']);

//     expect(result.stdout).toContain('Creating strict tsconfig');
//     expect(fs.readdirSync(root)).toContain('tsconfig.json');
//     const content = fs.readFileSync(resolve(root, 'tsconfig.json'), 'utf-8');
//     expect(content).toMatchSnapshot();
//   });
// });

describe('migrate - JS to TS conversion', async () => {
  let root = '';

  beforeEach(() => {
    root = prepareTmpDir('basic');
  });

  test('Print debug messages with verbose', async () => {
    const result = await run('migrate', [
      '--root',
      root,
      '--entrypoint',
      'depends-on-foo.js',
      '--verbose',
    ]);

    console.log(result.stdout);

    expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
  });

  // test('able to migrate single JS file', async () => {
  //   const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

  //   expect(result.stdout).toContain(`Conversion finished.`);
  //   expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);
  //   expect(fs.readdirSync(root)).toContain('index.ts');

  //   const content = fs.readFileSync(resolve(root, 'index.ts'), 'utf-8');
  //   expect(content).toMatchSnapshot();

  //   const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
  //   expect(config.include).toEqual(['index.ts']);
  // });

  // test('able to migrate multiple JS file from an entrypoint', async () => {
  //   const result = await run('migrate', ['--root', root, '--entrypoint', 'depends-on-foo.js']);

  //   expect(result.stdout).toContain(`Conversion finished.`);
  //   expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);
  //   expect(fs.readdirSync(root)).toContain('foo.ts');
  //   expect(fs.readdirSync(root)).toContain('depends-on-foo.ts');

  //   const foo = fs.readFileSync(resolve(root, 'foo.ts'), 'utf-8');
  //   const depends_on_foo = fs.readFileSync(resolve(root, 'depends-on-foo.ts'), 'utf-8');

  //   expect(foo).toMatchSnapshot();
  //   expect(depends_on_foo).toMatchSnapshot();

  //   const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
  //   expect(config.include).toEqual(['foo.ts', 'depends_on_foo.ts']);
  // });

  // test('able to cleanup old JS filse', async () => {
  //   const result = await run('migrate', [
  //     '--root',
  //     root,
  //     '--entrypoint',
  //     'depends-on-foo.js',
  //     '--clean',
  //   ]);

  //   expect(result.stdout).toContain(`Conversion finished.`);
  //   expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);
  //   expect(fs.readdirSync(root)).toContain('foo.ts');
  //   expect(fs.readdirSync(root)).toContain('depends-on-foo.ts');
  //   expect(fs.readdirSync(root)).not.toContain('bar.js');
  //   expect(fs.readdirSync(root)).not.toContain('depends-on-foo.js');
  // });
});

// describe('migrate command - glob matching', async () => {
//   let root = '';

//   beforeEach(() => {
//     root = prepareTmpDir('glob');
//   });

//   test('glob/*.js', async () => {
//     const result = await run('migrate', ['--root', root, '--globs', '*.js']);

//     expect(result.stdout).toContain(`Conversion finished.`);
//     expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);

//     // only do migration in top level of glob/
//     expect(fs.readdirSync(root)).toContain('foo.ts');
//     expect(fs.readdirSync(root)).toContain('bar.ts');

//     // do nothing in glob/sub_bar
//     expect(fs.readdirSync(resolve(root, 'sub_bar'))).not.toContain('sub_bar_bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_bar'))).not.toContain('sub_bar_foo.ts');

//     // do nothing in glob/sub_foo
//     expect(fs.readdirSync(resolve(root, 'sub_foo'))).not.toContain('sub_foo_bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_foo'))).not.toContain('sub_foo_foo.ts');

//     // check tsconfig -> include
//     const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
//     expect(config.include).toEqual(['*.ts']);
//   });

//   test('glob/sub_foo/*.js and glob/sub_bar/*.js', async () => {
//     const result = await run('migrate', ['--root', root, '--globs', 'sub_foo/*.js,sub_bar/*.js']);

//     expect(result.stdout).toContain(`Conversion finished.`);
//     expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);

//     // do nothing in top level of glob/
//     expect(fs.readdirSync(root)).not.toContain('foo.ts');
//     expect(fs.readdirSync(root)).not.toContain('bar.ts');

//     // migarte all js files in glob/sub_bar
//     expect(fs.readdirSync(resolve(root, 'sub_bar'))).toContain('sub_bar_bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_bar'))).toContain('sub_bar_foo.ts');

//     // migarte all js files in glob/sub_foo
//     expect(fs.readdirSync(resolve(root, 'sub_foo'))).toContain('sub_foo_bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_foo'))).toContain('sub_foo_foo.ts');

//     // check tsconfig -> include
//     const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
//     expect(config.include).toEqual(['sub_foo/*.ts', 'sub_bar/*.ts']);
//   });

//   test('glob/**/*.js', async () => {
//     const result = await run('migrate', ['--root', root, '--globs', '**/*.js']);

//     // do migration for all js files in glob/
//     expect(result.stdout).toContain(`Conversion finished.`);
//     expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);

//     expect(fs.readdirSync(root)).toContain('foo.ts');
//     expect(fs.readdirSync(root)).toContain('bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_bar'))).toContain('sub_bar_bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_bar'))).toContain('sub_bar_foo.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_foo'))).toContain('sub_foo_bar.ts');
//     expect(fs.readdirSync(resolve(root, 'sub_foo'))).toContain('sub_foo_foo.ts');

//     // check tsconfig -> include
//     const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
//     expect(config.include).toEqual(['**/*.ts']);
//   });
// });

// TODO: add test for --clean option
