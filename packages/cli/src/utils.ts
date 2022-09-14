import execa from 'execa';
import findup from 'findup-sync';
import { readFileSync } from 'fs';
import { parse } from 'json5';
import { resolve } from 'path';
import { valid } from 'semver';
import { SimpleGit, simpleGit, SimpleGitOptions } from 'simple-git';

import type { GitDescribe } from './interfaces';

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

export async function gitIsRepoDirty(): Promise<boolean> {
  const status = await git.status();
  return status.isClean() === false;
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

export function readJSON<TJson = unknown>(file: string): TJson | undefined {
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

export async function determineProjectName(directory = process.cwd()): Promise<string | null> {
  const packageJSONPath = await findup('package.json', {
    cwd: directory,
  });

  if (!packageJSONPath) {
    return null;
  }
  const packageJSON = readJSON<{ name: string }>(packageJSONPath);
  return packageJSON?.name ?? null;
}

export async function isYarnManager(): Promise<boolean> {
  const yarnPath = await findup('yarn.lock', {
    cwd: process.cwd(),
  });

  return !!yarnPath;
}

// devDep: dep@version eg. typescript@4.4.4 or typescript or etc
export async function bumpDevDep(devDep: string): Promise<void> {
  const isYarn = await isYarnManager();
  // check if npm or yarn
  const binAndArgs = {
    bin: isYarn ? 'yarn' : 'npm',
    args: isYarn
      ? ['add', '-D', `${devDep}`, '--ignore-scripts']
      : ['install', `${devDep}`, '--save-dev', '--ignore-scripts'],
  };

  await execa(binAndArgs.bin, binAndArgs.args);
}

export async function addDevDep(devDep: string, options: execa.Options = {}): Promise<void> {
  const isYarn = await isYarnManager();
  // check if npm or yarn
  const binAndArgs = {
    bin: isYarn ? 'yarn' : 'npm',
    args: isYarn ? ['add', '-D', `${devDep}`] : ['install', `${devDep}`, '--save-dev'],
  };

  await execa(binAndArgs.bin, binAndArgs.args, options);
}

export async function runYarnOrNpmCommand(
  args: Array<string>,
  option: execa.Options = {}
): Promise<void> {
  const isYarn = await isYarnManager();
  // check if npm or yarn
  const binAndArgs = {
    bin: isYarn ? 'yarn' : 'npm',
    args,
  };
  await execa(binAndArgs.bin, binAndArgs.args, option);
}

// rather than explicity setting from node_modules dir we need to handle workspaces use case
// we need to handle volta use case and check for npm or yarn
export async function getPathToBinary(binaryName: string): Promise<string> {
  // if volta exists on the path use it
  let packageManager = (await isYarnManager()) ? 'yarn' : 'npm';
  let stdoutMsg;
  const { VOLTA_HOME } = process.env as { VOLTA_HOME: string };

  if (VOLTA_HOME) {
    packageManager = resolve(VOLTA_HOME, `bin/${packageManager}`);
  }

  try {
    const { stdout } = await execa(packageManager, ['bin', binaryName]);
    stdoutMsg = stdout;
  } catch (e) {
    throw new Error(`Unable to find binary path to ${binaryName}`);
  }

  // return the path to the binary
  try {
    return stdoutMsg
      .split('\n')
      .filter((p) => p.includes(`bin/${binaryName}`))[0]
      .trim();
  } catch (error) {
    throw new Error(`Unable to find ${binaryName} with ${packageManager}`);
  }
}

// defaults to beta unless other
export async function getLatestTSVersion(build = 'beta'): Promise<string> {
  const { stdout } = await execa('npm', ['show', `typescript@${build}`, 'version']);

  return stdout;
}

export function isValidSemver(input: string): boolean {
  return !!valid(input);
}
