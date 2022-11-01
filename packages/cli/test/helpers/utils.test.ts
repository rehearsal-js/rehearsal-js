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
  normalizeVersionString,
  sleep,
  timestamp,
  getLockfilePath,
} from '../../src/utils';

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
    expect(projectName).toEqual('@rehearsal/cli');
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
    const latestVersionTagged = compare(await getLatestTSVersion('beta'), '1.0.0', '>');
    const latestVersion = compare(await getLatestTSVersion('latestBeta'), '1.0.0', '>');

    expect(latestVersionTagged).toBeTruthy();
    expect(latestVersion).toBeTruthy();
  });

  test('getLockfilePath()', () => {
    const lockfilePath = getLockfilePath();

    expect(lockfilePath).toContain('pnpm-lock.yaml');
  });
});
