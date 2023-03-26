import { resolve } from 'path';
import { compare } from 'compare-versions';
import { Project } from 'fixturify-project';
import { writeSync } from 'fixturify';
import tmp from 'tmp';
import { describe, expect, test } from 'vitest';
import yaml from 'js-yaml';
import { execa, execaSync } from 'execa';

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
  findWorkspaceRoot,
} from '../src/index.js';

tmp.setGracefulCleanup();

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
    const project = new Project('my-project', '0.0.0', {
      files: {
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '0.0.0',
        }),
      },
    });

    project.linkDevDependency('typescript', { baseDir: process.cwd() });

    await project.write();

    const tscPath = await getPathToBinary('tsc', { cwd: project.baseDir });
    const { stdout } = await execa(tscPath, ['--version']);

    expect(stdout).toContain(`Version`);

    project.dispose();
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
    delete process.env['EDITOR'];
    expect(getEditorBinWithArgs()).toEqual([]);

    process.env['EDITOR'] = 'code';
    expect(getEditorBinWithArgs()).toEqual(['code', '--wait']);

    process.env['EDITOR'] = 'code -w';
    expect(getEditorBinWithArgs()).toEqual(['code', '-w']);

    process.env['EDITOR'] = 'code --wait';
    expect(getEditorBinWithArgs()).toEqual(['code', '--wait']);

    process.env['EDITOR'] = 'nvim';
    expect(getEditorBinWithArgs()).toEqual(['nvim']);
  });

  describe('findWorkspaceRoot', () => {
    test('npm/yarn with workspace', () => {
      const { name: tmpLocation } = tmp.dirSync();
      const files = {
        'package.json': JSON.stringify({
          workspaces: ['packages/*'],
        }),
        packages: {
          'package-a': {
            'package.json': JSON.stringify({
              name: 'package-a',
              version: '1.0.0',
            }),
          },
        },
      };

      writeSync(tmpLocation, files);

      const currentDir = resolve(tmpLocation, 'packages', 'package-a');
      expect(findWorkspaceRoot(currentDir)).toBe(tmpLocation);
    });

    test('npm/yarn without workspace', () => {
      const { name: tmpLocation } = tmp.dirSync();
      const files = {
        'package.json': JSON.stringify({
          name: 'foo',
        }),
        packages: {
          'package-a': {
            'package.json': JSON.stringify({
              name: 'package-a',
              version: '1.0.0',
            }),
          },
        },
      };

      writeSync(tmpLocation, files);

      const currentDir = resolve(tmpLocation, 'packages', 'package-a');
      expect(findWorkspaceRoot(currentDir)).toBe(currentDir);
    });

    test('pnpm with workspace', () => {
      const { name: tmpLocation } = tmp.dirSync();
      const files = {
        'package.json': JSON.stringify({
          name: 'foo',
        }),
        'pnpm-lock.yaml': '',
        'pnpm-workspace.yaml': yaml.dump({ packages: ['packages/*'] }),
        packages: {
          'package-a': {
            'package.json': JSON.stringify({
              name: 'package-a',
              version: '1.0.0',
            }),
          },
        },
      };

      writeSync(tmpLocation, files);

      const currentDir = resolve(tmpLocation, 'packages', 'package-a');
      expect(findWorkspaceRoot(currentDir)).toBe(tmpLocation);
    });

    test('pnpm without workspace', () => {
      const { name: tmpLocation } = tmp.dirSync();
      const files = {
        'package.json': JSON.stringify({
          name: 'foo',
        }),
        'pnpm-lock.yaml': '',
        packages: {
          'package-a': {
            'package.json': JSON.stringify({
              name: 'package-a',
              version: '1.0.0',
            }),
            'pnpm-lock.yaml': '',
          },
        },
      };

      writeSync(tmpLocation, files);

      const currentDir = resolve(tmpLocation, 'packages', 'package-a');
      expect(findWorkspaceRoot(currentDir)).toBe(currentDir);
    });
  });
});
