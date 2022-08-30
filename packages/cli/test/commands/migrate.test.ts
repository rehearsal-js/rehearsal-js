import { describe, test, expect, afterAll, beforeEach } from 'vitest';
import { resolve } from 'path';
import fs from 'fs-extra';
import { run } from '../test-helpers';

const FIXTURE_APP_DIR = resolve(__dirname, '../fixtures/app_for_migrate');
const TEST_SRC_DIR = resolve(FIXTURE_APP_DIR, 'src');
const TEST_TMP_DIR = resolve(FIXTURE_APP_DIR, 'tmp');

function prepareTmpDir(dir: string): string {
  const srcDir = resolve(TEST_SRC_DIR, dir);
  const targetDir = resolve(TEST_TMP_DIR, dir);
  fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  fs.copySync(srcDir, targetDir);
  return targetDir;
}

afterAll(async () => {
  fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
});

describe('migrate command - install TSC', async () => {
  let root = '';

  beforeEach(() => {
    root = prepareTmpDir('basic');
  });

  test('Install typescript dependency', async () => {
    const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

    console.log(result.stdout);
    expect(result.stdout).toContain('[SUCCESS] Creating tsconfig.json');
    expect(fs.readdirSync(root)).toContain('tsconfig.json');
  });

  // test('Skipping tsconfig is there is an existed one', async () => {
  //   // copy a dummy tsconfig to the TMP dir
  //   fs.copySync(resolve(FIXTURE_APP_DIR, 'tsconfig.json'), resolve(root, 'tsconfig.json'));
  //   const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

  //   console.log(result.stdout);
  //   expect(result.stderr).toContain(`[SKIPPED] skipping creating tsconfig.json`);
  // });
});

// describe('migrate command - tsconfig', async () => {
//   let root = '';

//   beforeEach(() => {
//     root = prepareTmpDir('basic');
//   });

//   test('Create tsconfig.json if there is nothing', async () => {
//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

//     console.log(result.stdout);
//     expect(result.stdout).toContain('[SUCCESS] Creating tsconfig.json');
//     expect(fs.readdirSync(root)).toContain('tsconfig.json');
//   });

//   test('Skipping tsconfig is there is an existed one', async () => {
//     // copy a dummy tsconfig to the TMP dir
//     fs.copySync(resolve(FIXTURE_APP_DIR, 'tsconfig.json'), resolve(root, 'tsconfig.json'));
//     const result = await run('migrate', ['--root', root, '--entrypoint', 'index.js']);

//     console.log(result.stdout);
//     expect(result.stderr).toContain(`[SKIPPED] skipping creating tsconfig.json`);
//   });
// });

// describe('migrate command - basic', async () => {
//   let root = '';

//   beforeEach(() => {
//     root = prepareTmpDir('basic');
//   });

//   test('Do nothing for TS file', async () => {
//     const result = await run('migrate', ['--root', root, '--files', 'no_ops.ts']);

//     expect(result.stdout).toContain(`is a .ts file`);
//   });

//   test('Print debug messages with verbose', async () => {
//     const result = await run('migrate', ['--root', root, '--files', 'index.js', '--verbose']);

//     expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
//   });

//   test('able to migrate single JS file', async () => {
//     const result = await run('migrate', ['--root', root, '--files', 'index.js']);

//     expect(result.stdout).toContain(`Conversion finished.`);
//     expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);
//     expect(fs.readdirSync(root)).toContain('index.ts');

//     const content = fs.readFileSync(resolve(root, 'index.ts'), 'utf-8');
//     expect(content).toMatchSnapshot();

//     const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
//     expect(config.include).toEqual(['index.ts']);
//   });

//   test('able to migrate multiple JS file', async () => {
//     const result = await run('migrate', ['--root', root, '--files', 'index.js,foo.js,bar.js']);

//     expect(result.stdout).toContain(`Conversion finished.`);
//     expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);
//     expect(fs.readdirSync(root)).toContain('index.ts');
//     expect(fs.readdirSync(root)).toContain('foo.ts');
//     expect(fs.readdirSync(root)).toContain('bar.ts');

//     const index = fs.readFileSync(resolve(root, 'index.ts'), 'utf-8');
//     const foo = fs.readFileSync(resolve(root, 'index.ts'), 'utf-8');
//     const bar = fs.readFileSync(resolve(root, 'index.ts'), 'utf-8');

//     expect(index).toMatchSnapshot();
//     expect(foo).toMatchSnapshot();
//     expect(bar).toMatchSnapshot();

//     const config = fs.readJSONSync(resolve(root, 'tsconfig.json'));
//     expect(config.include).toEqual(['index.ts', 'foo.ts', 'bar.ts']);
//   });

//   test('able to cleanup old JS filse', async () => {
//     const result = await run('migrate', [
//       '--root',
//       root,
//       '--files',
//       'index.js,foo.js,bar.js',
//       '--clean',
//     ]);

//     expect(result.stdout).toContain(`Conversion finished.`);
//     expect(result.stdout).toContain(`[SUCCESS] Migrating JS to TS`);
//     expect(fs.readdirSync(root)).toContain('index.ts');
//     expect(fs.readdirSync(root)).toContain('foo.ts');
//     expect(fs.readdirSync(root)).toContain('bar.ts');
//     expect(fs.readdirSync(root)).not.toContain('index.js');
//     expect(fs.readdirSync(root)).not.toContain('bar.js');
//     expect(fs.readdirSync(root)).not.toContain('foo.js');
//   });
// });

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
