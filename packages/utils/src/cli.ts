import { readFileSync } from 'node:fs';
import { writeJSONSync } from 'fs-extra/esm';
import { findUpSync } from 'find-up';
import json5 from 'json5';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';
import which from 'which';
import { execa, execaSync } from 'execa';

import type { Options } from 'execa';

export const VERSION_PATTERN = /_(\d+\.\d+\.\d+)/;
export const git: SimpleGit = simpleGit({
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
} as Partial<SimpleGitOptions>);

export function readJSON<T>(file: string): T | undefined {
  const text = readFileSync(file, 'utf-8');
  if (text !== undefined) {
    return json5.parse(text);
  }
}

export function writeJSON<T>(file: string, contents: T | unknown): void {
  writeJSONSync(file, contents, { spaces: 2 });
}

export function isYarnManager(basePath: string = process.cwd()): boolean {
  const yarnPath = findUpSync('yarn.lock', {
    cwd: basePath,
  });

  return !!yarnPath;
}

export function isYarnBerryManager(basePath: string = process.cwd()): boolean {
  const lockFilePath = findUpSync('yarn.lock', {
    cwd: basePath,
  });
  const berryConfigPath = findUpSync('.yarnrc.yml', {
    cwd: basePath,
  });

  return !!lockFilePath && !!berryConfigPath;
}

export function isPnpmManager(basePath: string = process.cwd()): boolean {
  const pnpmPath = findUpSync('pnpm-lock.yaml', {
    cwd: basePath,
  });

  return !!pnpmPath;
}

// Check if a binary exists and if it's executable
export function isBinExisted(binName: string): boolean {
  try {
    which.sync(binName);
    return true;
  } catch (e) {
    return false;
  }
}

// Get the binary path for a package manager
export function getManagerBinPath(
  manager: 'yarn' | 'npm' | 'pnpm',
  hasVolta: boolean = isBinExisted('volta')
): string {
  if (hasVolta && manager !== 'pnpm') {
    return execaSync('volta', ['which', manager]).stdout;
  } else {
    return which.sync(manager);
  }
}

export function getModuleManager(basePath: string = process.cwd()): 'yarn' | 'npm' | 'pnpm' {
  const isYarn = isYarnManager(basePath);
  const isPnpm = isPnpmManager(basePath);

  if (isYarn) {
    return 'yarn';
  }

  if (isPnpm) {
    return 'pnpm';
  }

  return 'npm';
}

export function getModuleManagerInstaller(
  manager: 'yarn' | 'npm' | 'pnpm',
  depList: string[],
  isDev: boolean,
  hasVolta: boolean = isBinExisted('volta')
): { bin: string; args: string[] } {
  const executablePath = getManagerBinPath(manager);

  const voltaYarnArgs = hasVolta ? ['run', 'yarn'] : [];
  const voltaNpmArgs = hasVolta ? ['run', 'npm'] : [];

  switch (manager) {
    case 'yarn':
      // since yarn@3 doesn't have --ignore-scripts anymore
      // If there is volta, call volta run yarn xxx instead of <path-to-yarn> xxx
      return {
        bin: hasVolta ? 'volta' : executablePath,
        args: isDev
          ? [
              ...voltaYarnArgs,
              'add',
              '-D',
              ...depList,
              ...(isYarnBerryManager() ? [] : ['--ignore-scripts']),
            ]
          : [
              ...voltaYarnArgs,
              'add',
              ...depList,
              ...(isYarnBerryManager() ? [] : ['--ignore-scripts']),
            ],
      };
    case 'pnpm':
      return {
        bin: executablePath,
        args: isDev ? ['add', '-D', ...depList] : ['add', ...depList],
      };
    case 'npm':
    default:
      // If there is volta, call volta run npm xxx instead of <path-to-npm> xxx
      return {
        bin: hasVolta ? 'volta' : executablePath,
        args: isDev
          ? [...voltaNpmArgs, 'install', ...depList, '--save-dev', '--ignore-scripts']
          : [...voltaNpmArgs, 'install', ...depList, '--ignore-scripts'],
      };
  }
}

// devDep: dep@version eg. typescript@4.4.4 or typescript or etc
export async function addDep(
  depList: string[],
  isDev: boolean,
  options: Options = {}
): Promise<void> {
  let basePath = options.cwd ? options.cwd : process.cwd();

  if (typeof basePath === 'object') {
    basePath = basePath.toString();
  }

  const moduleManager = getModuleManager(basePath);
  const binAndArgs = getModuleManagerInstaller(moduleManager, depList, isDev);

  await execa(binAndArgs.bin, [...binAndArgs.args], options);
}

/**
 * Parses the comma separated string `a,b,c` to an array os strings [a, b, c]
 */
export function parseCommaSeparatedList(value: string): string[] {
  return value.split(',');
}

/**
 * Reads a tsConfig file
 * @param configPath
 * @returns
 */
export function readTSConfig<T>(configPath: string): T {
  return json5.parse(readFileSync(configPath, 'utf-8'));
}
