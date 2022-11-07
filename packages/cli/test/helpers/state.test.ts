import { resolve } from 'path';
import { readJSONSync, writeJSONSync, existsSync, writeFileSync } from 'fs-extra';
import { dirSync, setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { State, calculateTSIgnoreCount, Store } from '../../src/helpers/state';

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
    const { packages, files } = new State('foo', [], configPath);

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
        bar: [fooPath],
      },
      files: {},
    };
    existedStore.files[fooPath] = {
      origin: 'foo',
      current: 'foo',
      package: 'bar',
      errorCount: 2,
    };

    // write existed state
    writeJSONSync(configPath, existedStore);
    // write foo file
    writeFileSync(fooPath, '');

    const { packages, files } = new State('foo', [], configPath);

    expect(packages.bar).toEqual([fooPath]);
    expect(files[fooPath].package).toBe('bar');
  });

  test('getVerifiedStore', async () => {
    const configPath = resolve(basePath, 'state.json');
    const fooPath = resolve(basePath, 'foo');
    const existedStore: Store = {
      name: 'bar',
      packageMap: {
        bar: [fooPath],
      },
      files: {},
    };
    existedStore.files[fooPath] = {
      origin: 'foo',
      current: 'foo',
      package: 'bar',
      errorCount: 2,
    };

    // write existed state
    writeJSONSync(configPath, existedStore);

    const { packages, files } = new State('foo', [], configPath);

    expect(packages.bar).toEqual([fooPath]);
    expect(files[fooPath].current).toBe(null);
  });

  test('addFilesToPackages', async () => {
    const configPath = resolve(basePath, 'state.json');
    const fooPath = resolve(basePath, 'foo');

    // write foo file
    writeFileSync(fooPath, '');

    const state = new State('bar', ['bar'], configPath);

    state.addFilesToPackage('bar', [fooPath]);

    expect(state.packages.bar).toEqual([fooPath]);
    expect(state.files[fooPath].package).toBe('bar');
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
    const barPath = resolve(basePath, 'bar.ts');

    const store: Store = {
      name: 'bar',
      packageMap: {
        bar: [fooPath, barPath],
      },
      files: {},
    };
    store.files[fooPath] = {
      origin: fooPath,
      current: fooPath,
      package: 'bar',
      errorCount: 2,
    };
    store.files[barPath] = {
      origin: barPath,
      current: null,
      package: 'bar',
      errorCount: 2,
    };

    writeJSONSync(configPath, store);
    // only have fooPath on disk, so state should know only foo is migrated
    writeFileSync(fooPath, '', 'utf-8');

    let state = new State('bar', ['sample-package'], configPath);
    state.addFilesToPackage('sample-package', [fooPath, barPath]);
    // here create the state again, to simulate loading previous state
    // the getVerifiedStore would be triggered here to update files' state
    state = new State('bar', ['sample-package'], configPath);

    const expected = {
      migratedFileCount: 1,
      totalFileCount: 2,
      isCompleted: false,
    };

    expect(state.getPackageMigrateProgress('sample-package')).toStrictEqual(expected);
  });

  test('getPackageErrorCount', async () => {
    const configPath = resolve(basePath, 'state.json');

    const foo = '@rehearsal TODO foo bar';
    const fooPath = resolve(basePath, 'foo');

    const bar = '@rehearsal TODO foo\n@rehearsal TODO bar';
    const barPath = resolve(basePath, 'bar');

    const state = new State('bar', ['sample-package'], configPath);

    writeFileSync(fooPath, foo, 'utf-8');
    writeFileSync(barPath, bar, 'utf-8');

    state.addFilesToPackage('sample-package', [fooPath, barPath]);

    expect(state.getPackageErrorCount('sample-package')).toStrictEqual(3);
  });
});
