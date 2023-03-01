import { resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { State, calculateTSIgnoreCount, Store } from '../../src/helpers/state.js';

setGracefulCleanup();

function prepareTmpDir(): string {
  const { name: targetDir } = dirSync();
  return targetDir;
}

describe('state', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir();
  });

  test('constructor should init state to disk', async () => {
    const configPath = resolve(basePath, 'state.json');
    const { packages, files } = new State('foo', basePath, [], configPath);

    expect(packages).toEqual({});
    expect(files).toEqual({});
    expect(existsSync(configPath)).toBeTruthy();
    expect(readJSONSync(configPath)).matchSnapshot();
  });

  test('constructor should load existed state', async () => {
    const configPath = resolve(basePath, 'state.json');
    const fooPath = resolve(basePath, 'foo');
    const existedStore: Store = {
      name: 'bar',
      packageMap: {
        bar: ['./foo'],
      },
      files: {},
    };
    existedStore.files['./foo'] = {
      origin: 'foo',
      current: 'foo',
      package: './bar',
      errorCount: 2,
    };

    // write existed state
    writeJSONSync(configPath, existedStore);
    // write foo file
    writeFileSync(fooPath, '');

    const { packages, files } = new State('foo', basePath, [], configPath);

    expect(packages.bar).toEqual(['./foo']);
    expect(files['./foo'].package).toBe('./bar');
    expect(readJSONSync(configPath)).toMatchSnapshot();
  });

  test('getVerifiedStore', async () => {
    const configPath = resolve(basePath, 'state.json');
    const existedStore: Store = {
      name: 'bar',
      packageMap: {
        './bar': ['./foo'],
      },
      files: {},
    };
    existedStore.files['./foo'] = {
      origin: 'foo',
      current: 'foo',
      package: './bar',
      errorCount: 2,
    };

    // write existed state
    writeJSONSync(configPath, existedStore);

    const { packages, files } = new State('foo', basePath, [], configPath);

    expect(packages['./bar']).toEqual(['./foo']);
    // there is no actual .foo existed on disk
    // stage would be updated when loading the old state file
    expect(files['./foo'].current).toBe(null);
    expect(readJSONSync(configPath)).toMatchSnapshot();
  });

  test('addFilesToPackages', async () => {
    const configPath = resolve(basePath, 'state.json');
    const fooPath = resolve(basePath, 'foo');

    // write foo file
    writeFileSync(fooPath, '');

    const state = new State('bar', basePath, ['./bar'], configPath);

    state.addFilesToPackage('./bar', ['./foo']);

    expect(state.packages['./bar']).toEqual(['./foo']);
    expect(state.files['./foo'].package).toBe('./bar');
    expect(readJSONSync(configPath)).toMatchSnapshot();
  });

  test('calculateTSIgnoreCount', async () => {
    const foo = '@rehearsal TODO foo bar';
    const fooPath = resolve(basePath, 'foo');

    const bar = '@rehearsal TODO foo\n@rehearsal TODO bar';
    const barPath = resolve(basePath, 'bar');

    writeFileSync(fooPath, foo, 'utf-8');
    writeFileSync(barPath, bar, 'utf-8');

    expect(calculateTSIgnoreCount(fooPath)).toBe(1);
    expect(calculateTSIgnoreCount(barPath)).toBe(2);
  });

  test('getPackageMigrateProgress', async () => {
    const configPath = resolve(basePath, 'state.json');

    const fooPath = resolve(basePath, 'foo.ts');

    const store: Store = {
      name: 'bar',
      packageMap: {
        bar: ['./foo.ts', './bar.ts'],
      },
      files: {},
    };
    store.files['./foo.ts'] = {
      origin: './foo.ts',
      current: './foo.ts',
      package: 'bar',
      errorCount: 2,
    };
    store.files['./bar.ts'] = {
      origin: './bar.ts',
      current: null,
      package: 'bar',
      errorCount: 2,
    };

    writeJSONSync(configPath, store);
    // only have fooPath on disk, so state should know only foo is migrated
    writeFileSync(fooPath, '', 'utf-8');

    let state = new State('bar', basePath, ['sample-package'], configPath);
    state.addFilesToPackage('sample-package', ['./foo.ts', './bar.ts']);
    // here create the state again, to simulate loading previous state
    // the getVerifiedStore would be triggered here to update files' state
    state = new State('bar', basePath, ['sample-package'], configPath);

    const expected = {
      migratedFileCount: 1,
      totalFileCount: 2,
      isCompleted: false,
    };

    expect(state.getPackageMigrateProgress('sample-package')).toStrictEqual(expected);
    expect(readJSONSync(configPath)).toMatchSnapshot();
  });

  test('getPackageErrorCount', async () => {
    const configPath = resolve(basePath, 'state.json');

    const foo = '@rehearsal TODO foo bar';
    const fooPath = resolve(basePath, 'foo');

    const bar = '@rehearsal TODO foo\n@rehearsal TODO bar';
    const barPath = resolve(basePath, 'bar');

    const state = new State('bar', basePath, ['sample-package'], configPath);

    writeFileSync(fooPath, foo, 'utf-8');
    writeFileSync(barPath, bar, 'utf-8');

    state.addFilesToPackage('sample-package', [fooPath, barPath]);

    expect(state.getPackageErrorCount('sample-package')).toStrictEqual(3);
  });

  test('does not contain absolute paths in state file', async () => {
    const configPath = resolve(basePath, 'state.json');
    const fooPath = resolve(basePath, 'foo');
    const barPath = resolve(basePath, 'bar');
    const packagePath = resolve(basePath, 'sample-package');

    const state = new State('bar', basePath, [packagePath], configPath);
    // check state file after init
    expect(readJSONSync(configPath)).toMatchSnapshot();

    state.addFilesToPackage(packagePath, [fooPath, barPath]);
    // check state file again after addFilesToPackage
    expect(readJSONSync(configPath)).toMatchSnapshot();
  });
});
