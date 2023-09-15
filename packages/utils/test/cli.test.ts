import { describe, expect, test } from 'vitest';
import { execaSync } from 'execa';

import {
  getModuleManager,
  getModuleManagerInstaller,
  isPnpmManager,
  isYarnManager,
  isBinExisted,
  getManagerBinPath,
  secondsToTime,
} from '../src/index.js';

export function removeSpecialChars(input: string): string {
  const specialCharRegex = /[^A-Za-z 0-9 .,?""!@#$%^&*()-_=+;:<>/\\|}{[\]`~\n]*/g;
  const colorCharRegex = /\[\d+m/g;
  const outputIgnoreTitles = ['[TITLE]', '[ERROR]', '[DATA]', '[SUCCESS]'];
  return input
    .replace(specialCharRegex, '')
    .replace(colorCharRegex, '')
    .split('\n')
    .map((line) => {
      // remove all empty lines which has outputIgnoreTitles
      if (!line.trim() || outputIgnoreTitles.includes(line.trim())) {
        return '';
      }
      return line;
    })
    .filter((line) => line.trim())
    .join('\n');
}

describe('utils', () => {
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
    const npmBinPath = execaSync('which', ['npm']).stdout;
    expect(getManagerBinPath('npm', false)).toBe(npmBinPath);

    const yarnBinPath = execaSync('which', ['yarn']).stdout;
    expect(getManagerBinPath('yarn', false)).toBe(yarnBinPath);

    const pnpmBinPath = execaSync('which', ['pnpm']).stdout;
    expect(getManagerBinPath('pnpm', false)).toBe(pnpmBinPath);
  });

  test('getModuleManager()', () => {
    const manager = getModuleManager();

    expect(manager).equal('pnpm');
  });

  test('getModuleManagerInstaller()', () => {
    const { bin: pnpmBin, args: pnpmArgs } = getModuleManagerInstaller(
      'pnpm',
      ['typescript'],
      true
    );
    expect(pnpmBin).toContain('pnpm');
    expect(pnpmArgs).toEqual(['add', '-D', 'typescript']);

    // yarn without volta
    const { bin: yarnBin, args: yarnArgs } = getModuleManagerInstaller(
      'yarn',
      ['typescript'],
      true,
      false
    );
    expect(yarnBin).toContain('yarn');
    expect(yarnArgs).toEqual(['add', '-D', 'typescript', '--ignore-scripts']);

    // yarn with volta
    const { bin: voltaYarnBin, args: voltaYarnArgs } = getModuleManagerInstaller(
      'yarn',
      ['typescript'],
      true,
      true
    );
    expect(voltaYarnBin).toContain('volta');
    expect(voltaYarnArgs).toEqual(['run', 'yarn', 'add', '-D', 'typescript', '--ignore-scripts']);

    // npm without volta
    const { bin: npmBin, args: npmArgs } = getModuleManagerInstaller(
      'npm',
      ['typescript'],
      true,
      false
    );
    expect(npmBin).toContain('npm');
    expect(npmArgs).toEqual(['install', 'typescript', '--save-dev', '--ignore-scripts']);

    // npm with volta
    const { bin: voltaNpmBin, args: voltaNpmArgs } = getModuleManagerInstaller(
      'npm',
      ['typescript'],
      true,
      true
    );
    expect(voltaNpmBin).toContain('volta');
    expect(voltaNpmArgs).toEqual([
      'run',
      'npm',
      'install',
      'typescript',
      '--save-dev',
      '--ignore-scripts',
    ]);
  });

  test('secondsToTime()', () => {
    expect(secondsToTime(0)).equal(`00:00`);
    expect(secondsToTime(30)).equal(`00:30`);
    expect(secondsToTime(60)).equal(`01:00`);
    expect(secondsToTime(3723)).equal(`01:02:03`);
    expect(secondsToTime(-50)).equal(`23:59:10`);
  });
});
