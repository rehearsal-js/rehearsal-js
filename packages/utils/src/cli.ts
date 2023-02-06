import { join, resolve } from 'path';
import { readFileSync, writeJSONSync, readJSONSync } from 'fs-extra';
import { compare } from 'compare-versions';
import { parse } from 'json5';
import { valid } from 'semver';
import { type SimpleGit, type SimpleGitOptions, simpleGit } from 'simple-git';
import which from 'which';
import { InvalidArgumentError } from 'commander';
import chalk from 'chalk';
import { glob } from 'glob';

import findup = require('findup-sync');
import execa = require('execa');
import { GitDescribe } from './types';

export const VERSION_PATTERN = /_(\d+\.\d+\.\d+)/;

export const git: SimpleGit = simpleGit({
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
} as Partial<SimpleGitOptions>);

// we might need to check if commitlint is being used and lint against it for msgTypes
export async function gitCommit(msg: string, msgType = 'chore(deps-dev)'): Promise<void> {
  await git.commit(`${msgType.trim()}: [REHEARSAL-BOT] ${msg.trim()}`, '--no-verify');
}

// we want a seperate branch & PR for each diagnostic
// eg. await gitCheckoutNewBranch('4.8.0-beta', 'typescript', 'diagnostic-4082')
export async function gitCheckoutNewLocalBranch(
  depSemVersion: string,
  depName = 'typescript',
  addPathID?: string
): Promise<string> {
  const branchName = `rehearsal-bot/${depName}-${depSemVersion}${addPathID ? `/${addPathID}` : ''}`;
  await git.checkout(['-b', branchName]);

  return branchName;
}

export async function gitIsRepoDirty(cwd?: string): Promise<boolean> {
  // if cwd is provided, create a new git instance with the correct cwd
  const gitClient = cwd
    ? simpleGit({
        baseDir: cwd,
      } as Partial<SimpleGitOptions>)
    : git;
  if (await gitClient.checkIsRepo()) {
    const status = await gitClient.status();
    return status.isClean() === false;
  }
  return false; // false if it's not a git repo
}

// Stage files in a git repo
export async function gitAddIfInRepo(fileList: string[] | string, cwd?: string): Promise<void> {
  // if cwd is provided, create a new git instance with the correct cwd
  const gitClient = cwd
    ? simpleGit({
        baseDir: cwd,
      } as Partial<SimpleGitOptions>)
    : git;
  if (await gitClient.checkIsRepo()) {
    await gitClient.add(fileList);
  }
}

/**
 * Function to introduce a wait
 *
 * @param ms - how many milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert milliseconds to seconds
 *
 * @param ms - number in milliseconds
 * @returns number in seconds
 */
export function msToSeconds(ms: number): number {
  return Math.round(ms / 1000);
}

export function readJSON<T>(file: string): T | undefined {
  const text = readText(file);
  if (text !== undefined) {
    return parse(text);
  }
}

export function readText(file: string): string | undefined {
  return readFile(file, 'utf8');
}

export function readFile(file: string, encoding: 'utf8'): string | undefined;
export function readFile(file: string, encoding?: undefined): Buffer | undefined;
export function readFile(file: string, encoding?: 'utf8'): string | Buffer | undefined {
  try {
    return readFileSync(file, encoding);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw e;
  }
}

/**
 * Provide current timestamp
 * @param inSeconds - if true, return seconds, otherwise milliseconds
 * @returns timestamp in seconds
 */
export function timestamp(inSeconds = false): number {
  return inSeconds ? Date.now() / 1000 : Date.now();
}

/**
 * Parse the string output from git
 *
 * @param desc - String output of "git describe --tags --long"
 * @returns GitDescribe object
 */
export function parseLongDescribe(desc: string): GitDescribe {
  const result = /^(.+)-(\d+)-g([a-f0-9]+)(?:-(dirty))?$/.exec(desc);

  if (!result) {
    throw Error(`Unable to parse ${desc} as a long description`);
  }

  const [, tag, count, sha, dirty] = result;

  return {
    tag,
    count: parseInt(count, 10),
    sha,
    dirty: !!dirty,
  };
}

/**
 * Convert instances like "foo-web_10.2.3" and "1.2.3" to "1.2.3"
 *
 * @param versionString - version string to convert into just numbers and periods
 * @returns version string with only numbers and periods
 */
export function normalizeVersionString(versionString: string): string {
  if (VERSION_PATTERN.test(versionString)) {
    const result = VERSION_PATTERN.exec(versionString);
    return result ? result[1] : versionString;
  }
  return versionString;
}

export function determineProjectName(directory = process.cwd()): string | null {
  const packageJSONPath = findup('package.json', {
    cwd: directory,
  });

  if (!packageJSONPath) {
    return null;
  }
  const packageJSON = readJSON<{ name: string }>(packageJSONPath);
  return packageJSON?.name ?? null;
}

export function isYarnManager(): boolean {
  const yarnPath = findup('yarn.lock', {
    cwd: process.cwd(),
  });

  return !!yarnPath;
}

export function isYarnBerryManager(): boolean {
  const lockFilePath = findup('yarn.lock', {
    cwd: process.cwd(),
  });
  const berryConfigPath = findup('.yarnrc.yml', {
    cwd: process.cwd(),
  });

  return !!lockFilePath && !!berryConfigPath;
}

export function isPnpmManager(): boolean {
  const pnpmPath = findup('pnpm-lock.yaml', {
    cwd: process.cwd(),
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
    return execa.sync('volta', ['which', manager]).stdout;
  } else {
    return which.sync(manager);
  }
}

export function getLockfilePath(): string | null {
  const yarnPath = findup('yarn.lock', {
    cwd: process.cwd(),
  });

  if (yarnPath) {
    return yarnPath;
  }

  const pnpmPath = findup('pnpm-lock.yaml', {
    cwd: process.cwd(),
  });

  if (pnpmPath) {
    return pnpmPath;
  }

  const npmPath = findup('package-lock.json', {
    cwd: process.cwd(),
  });

  if (npmPath) {
    return npmPath;
  }

  return null;
}

export function getModuleManager(): 'yarn' | 'npm' | 'pnpm' {
  const isYarn = isYarnManager();
  const isPnpm = isPnpmManager();

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
  isDev: boolean
): { bin: string; args: string[] } {
  const bin = getManagerBinPath(manager);

  switch (manager) {
    case 'yarn':
      // since yarn@3 doesn't have --ignore-scripts anymore
      return {
        bin,
        args: isDev
          ? ['add', '-D', ...depList, ...(isYarnBerryManager() ? [] : ['--ignore-scripts'])]
          : ['add', ...depList, ...(isYarnBerryManager() ? [] : ['--ignore-scripts'])],
      };
    case 'pnpm':
      return {
        bin,
        args: isDev ? ['add', '-D', ...depList] : ['add', ...depList],
      };
    case 'npm':
    default:
      return {
        bin,
        args: isDev
          ? ['install', ...depList, '--save-dev', '--ignore-scripts']
          : ['install', ...depList, '--ignore-scripts'],
      };
  }
}

// devDep: dep@version eg. typescript@4.4.4 or typescript or etc
export async function addDep(
  depList: string[],
  isDev: boolean,
  options: execa.Options = {}
): Promise<void> {
  const moduleManager = getModuleManager();
  const binAndArgs = getModuleManagerInstaller(moduleManager, depList, isDev);

  await execa(binAndArgs.bin, [...binAndArgs.args], options);
}

// when executing a command with module manager prefix
// eg. yarn tsc or pnpm tsc or npm tsc
export async function runModuleCommand(args: string[], option: execa.Options = {}): Promise<void> {
  const moduleManager = getModuleManager();
  const binAndArgs = {
    bin: moduleManager,
    args,
  };
  await execa(binAndArgs.bin, [...binAndArgs.args], option);
}

// rather than explicitly setting from node_modules dir we need to handle workspaces use case
// and volta use case
export async function getPathToBinary(
  binaryName: string,
  options: execa.Options = {}
): Promise<string> {
  // pnpm | yarn | npm
  const moduleManager = getModuleManager();
  // /Users/foo/.volta/bin/yarn
  // /usr/local/bin/pnpm
  const moduleManagerBin = getManagerBinPath(moduleManager);

  let stdoutMsg;

  try {
    const { stdout } = await execa(moduleManagerBin, ['bin', binaryName], options);
    stdoutMsg = stdout.trim().split(`/${binaryName}`)[0];
  } catch (e) {
    throw new Error(`Unable to find binary path to ${binaryName}`);
  }

  // return the path to the binary
  try {
    return resolve(join(stdoutMsg, binaryName));
  } catch (error) {
    throw new Error(`Unable to find ${binaryName} with ${moduleManagerBin}`);
  }
}

// handles instances where latest is newer than beta and rc etc.
// latestBeta = whichever is latest between latest, beta and rc tags
export async function getLatestTSVersion(tag: string): Promise<string> {
  const module = 'typescript';

  if (tag === 'latestBeta') {
    const compareTags = ['latest', 'beta', 'rc'];
    const versions = await Promise.all(compareTags.map((t) => getLatestModuleVersion(module, t)));
    // compare versions and return the latest
    return versions.reverse().reduce((acc, curr) => {
      if (compare(curr, acc, '>')) {
        return curr;
      }
      return acc;
    }, '0.0.0');
  } else {
    const { stdout } = await execa('npm', ['show', `typescript@${tag}`, 'version']);
    return stdout;
  }
}

export async function getLatestModuleVersion(module: string, tag: string): Promise<string> {
  const { stdout } = await execa('npm', ['show', `${module}@${tag}`, 'version']);

  return stdout;
}

export function isValidSemver(input: string): boolean {
  return !!valid(input);
}

/**
 * Parses the comma separated string `a,b,c` to an array os strings [a, b, c]
 */
export function parseCommaSeparatedList(value: string): string[] {
  return value.split(',');
}

/**
 * Generate tsconfig
 */
export function writeTSConfig(basePath: string, fileList: string[]): void {
  const include = [...fileList.map((f) => f.replace('.js', '.ts'))];
  const config = {
    $schema: 'https://json.schemastore.org/tsconfig',
    compilerOptions: {
      strict: true,
      esModuleInterop: true,
      noUncheckedIndexedAccess: true,
      module: 'es2020',
      moduleResolution: 'node',
      newLine: 'lf',
      target: 'ES2021',
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      noEmit: true,
    },
    include,
  };

  writeJSONSync(resolve(basePath, 'tsconfig.json'), config, { spaces: 2 });
}

/**
 * Parse the TS Version passed in by the user
 */
export function parseTsVersion(value: string): string {
  if (isValidSemver(value)) {
    return value;
  } else {
    throw new InvalidArgumentError(
      'The tsVersion specified is an invalid string. Please specify a valid version as n.n.n'
    );
  }
}

/**
 * Check if typescript is already installed
 */
export function isTypescriptInDevdep(basePath: string): boolean {
  const packageJSONPath = resolve(basePath, 'package.json');
  const packageJSON = readJSONSync(packageJSONPath);
  return (
    (packageJSON.devDependencies && packageJSON.devDependencies.typescript) ||
    (packageJSON.dependencies && packageJSON.dependencies.typescript)
  );
}

/**
 * Add/Update scripts in package.json
 */
export function addPackageJsonScripts(basePath: string, scriptMap: Record<string, string>): void {
  const packageJSONPath = resolve(basePath, 'package.json');
  const packageJSON = readJSONSync(packageJSONPath);
  packageJSON.scripts = { ...packageJSON.scripts, ...scriptMap };
  writeJSONSync(packageJSONPath, packageJSON, { spaces: 2 });
}

/**
 * Run git reset to get all file changes to the previous state
 */
export async function resetFiles(): Promise<void> {
  if (await git.checkIsRepo()) {
    await git.reset(['--hard']);
  }
}

/**
 * Get default editor with args
 */
export function getEditorBinWithArgs(): string[] {
  const defaultEditor = process.env.EDITOR;
  if (!defaultEditor) {
    return [];
  }

  const editorBinWithArgs = defaultEditor.split(' ');
  const editorBin = editorBinWithArgs[0];

  // Specific for vscode use case
  // Add --wait option if it's not in $EDITOR
  if (
    editorBin === 'code' &&
    !editorBinWithArgs.includes('-w') &&
    !editorBinWithArgs.includes('--wait')
  ) {
    editorBinWithArgs.push('--wait');
  }

  return editorBinWithArgs;
}

/**
 * Open and Edit file with $EDITOR
 */
export async function openInEditor(filePath: string): Promise<void> {
  const editorBinWithArgs = getEditorBinWithArgs();
  const editorBin = editorBinWithArgs[0];
  if (editorBinWithArgs.length) {
    if (editorBin === 'code') {
      editorBinWithArgs.push('--wait');
    }
    await execa(editorBin, [...editorBinWithArgs.slice(1), filePath], {
      stdio: 'inherit',
    });
  } else {
    throw new Error(
      'Cannot find default editor in environment variables, please set $EDITOR and try again.'
    );
  }
}

/**
 * Simple git diff prettier, red for deletion and green for addition
 */
export function prettyGitDiff(text: string): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      if (line[0] === '+') {
        return chalk.bgGreen(line);
      } else if (line[0] === '-') {
        return chalk.bgRed(line);
      }
      return line;
    })
    .join('\n');
}

export function getEsLintConfigPath(basePath: string): string {
  // glob against the following file extension pattern js,yml,json,yaml and return the first match
  const configPath = glob.sync(join(basePath, '.eslintrc.{js,yml,json,yaml}'))[0];
  return configPath;
}