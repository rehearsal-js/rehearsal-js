import { compare } from 'compare-versions';
import { describe, expect, test } from 'vitest';

import execa = require('execa');

import {
  determineProjectName,
  getLatestTSVersion,
  getModuleManager,
  getModuleManagerInstaller,
  getPathToBinary,
  isPnpmManager,
  isYarnManager,
  isBinExisted,
  getManagerBinPath,
  normalizeVersionString,
  sleep,
  timestamp,
  getLockfilePath,
  getEditorBinWithArgs,
} from '../src/cli';

describe('utils', () => {
  describe.each([
    {
      args: ['foo-web_10.2.3'] as const,
      expected: '10.2.3',
    },
    {
      args: ['foo-web_10.20.30'] as const,
      expected: '10.20.30',
    },
    {
      args: ['1.2.3'] as const,
      expected: '1.2.3',
    },
  ])('normalizeVersionString', ({ args, expected }) => {
    test('args should be converted to expected version', () => {
      expect(normalizeVersionString(args[0])).toBe(expected);
    });
  });

  test('determineProjectName()', () => {
    const projectName = determineProjectName();
    expect(projectName).toEqual('@rehearsal/utils');
  });

  test('timestamp(true)', async () => {
    const start = timestamp(true);
    await sleep(1000);
    const end = timestamp(true);
    expect(`${start}`.split('.').length).equal(2);
    expect(end).toBeGreaterThan(start);
  });

  test('getPathToBinary()', async () => {
    const tscPath = await getPathToBinary('tsc');
    const { stdout } = await execa(tscPath, ['--version']);

    expect(stdout).toContain(`Version`);
  });

  // @rehearsal/cli uses pnpm
  test('isYarnManager()', () => {
    const isYarn = isYarnManager();

    expect(isYarn).equal(false);
  });

  test('isPnpmManager()', () => {
    const isPnpm = isPnpmManager();

    expect(isPnpm).equal(true);
  });

  test('isBinExisted()', () => {
    expect(isBinExisted('ls')).equal(true);
    expect(isBinExisted('this-should-not-exist')).equal(false);
  });

  test('getManagerBinPath()', () => {
    // TODO: Add test scenarios if volta exists
    // Haven't came up with a quick and good way to do it
    const npmBinPath = execa.sync('which', ['npm']).stdout;
    expect(getManagerBinPath('npm', false)).toBe(npmBinPath);

    const yarnBinPath = execa.sync('which', ['yarn']).stdout;
    expect(getManagerBinPath('yarn', false)).toBe(yarnBinPath);

    const pnpmBinPath = execa.sync('which', ['pnpm']).stdout;
    expect(getManagerBinPath('pnpm', false)).toBe(pnpmBinPath);
  });

  test('getModuleManager()', () => {
    const manager = getModuleManager();

    expect(manager).equal('pnpm');
  });

  test('getModuleManagerInstaller()', () => {
    const { bin, args } = getModuleManagerInstaller('pnpm', ['typescript'], true);

    expect(bin).toContain('pnpm');
    expect(args).toEqual(['add', '-D', 'typescript']);
  });

  test('getLatestTSVersion()', async () => {
    const betaVersionTagged = compare(await getLatestTSVersion('beta'), '4.0.0', '>');
    const latestBetaVersion = compare(await getLatestTSVersion('latestBeta'), '4.0.0', '>');
    const latestVersion = compare(await getLatestTSVersion('latest'), '4.0.0', '>');
    const rcVersion = compare(await getLatestTSVersion('rc'), '4.0.0', '>');

    expect(betaVersionTagged).toBeTruthy();
    expect(latestVersion).toBeTruthy();
    expect(latestBetaVersion).toBeTruthy();
    expect(rcVersion).toBeTruthy();
  });

  test('getLockfilePath()', () => {
    const lockfilePath = getLockfilePath();

    expect(lockfilePath).toContain('pnpm-lock.yaml');
  });

  test('getEditorBinWithArgs()', () => {
    // No $EDITOR defined
    delete process.env.EDITOR;
    expect(getEditorBinWithArgs()).toEqual([]);

    process.env.EDITOR = 'code';
    expect(getEditorBinWithArgs()).toEqual(['code', '--wait']);

    process.env.EDITOR = 'code -w';
    expect(getEditorBinWithArgs()).toEqual(['code', '-w']);

    process.env.EDITOR = 'code --wait';
    expect(getEditorBinWithArgs()).toEqual(['code', '--wait']);

    process.env.EDITOR = 'nvim';
    expect(getEditorBinWithArgs()).toEqual(['nvim']);
  });
});