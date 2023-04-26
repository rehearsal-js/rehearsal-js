import { dirname, join, normalize, isAbsolute, relative, resolve, extname } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { compare } from 'compare-versions';
import findupSync from 'findup-sync';
import json5 from 'json5';
import { valid } from 'semver';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';
import which from 'which';
import { InvalidArgumentError } from 'commander';
import chalk from 'chalk';
import { sync } from 'fast-glob';
import micromatch from 'micromatch';
import yaml from 'js-yaml';
import { execa, execaSync } from 'execa';

import { PackageJson } from 'type-fest';
import type { GitDescribe, TSConfig } from './types.js';
import type { Options } from 'execa';

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

// we want a separate branch & PR for each diagnostic
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
    return json5.parse(text);
  }
}

export function writeJSON<T>(file: string, contents: T | unknown): void {
  writeJSONSync(file, contents, { spaces: 2 });
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
  const packageJSONPath = findupSync('package.json', {
    cwd: directory,
  });

  if (!packageJSONPath) {
    return null;
  }
  const packageJSON = readJSON<{ name: string }>(packageJSONPath);
  return packageJSON?.name ?? null;
}

export function isYarnManager(basePath: string = process.cwd()): boolean {
  const yarnPath = findupSync('yarn.lock', {
    cwd: basePath,
  });

  return !!yarnPath;
}

export function isYarnBerryManager(basePath: string = process.cwd()): boolean {
  const lockFilePath = findupSync('yarn.lock', {
    cwd: basePath,
  });
  const berryConfigPath = findupSync('.yarnrc.yml', {
    cwd: basePath,
  });

  return !!lockFilePath && !!berryConfigPath;
}

export function isPnpmManager(basePath: string = process.cwd()): boolean {
  const pnpmPath = findupSync('pnpm-lock.yaml', {
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

export function getLockfilePath(): string | null {
  const yarnPath = findupSync('yarn.lock', {
    cwd: process.cwd(),
  });

  if (yarnPath) {
    return yarnPath;
  }

  const pnpmPath = findupSync('pnpm-lock.yaml', {
    cwd: process.cwd(),
  });

  if (pnpmPath) {
    return pnpmPath;
  }

  const npmPath = findupSync('package-lock.json', {
    cwd: process.cwd(),
  });

  if (npmPath) {
    return npmPath;
  }

  return null;
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

// root only force the resolution of a given module to a specific version this does NOT modify lock file
export async function setModuleResolution(
  moduleName: string,
  version: string,
  cwd = process.cwd()
): Promise<void> {
  // using npm pkg api (preferred)
  async function setVersionFromPkg(dir: string): Promise<void> {
    try {
      const npmPath = getManagerBinPath('npm');

      await execa(npmPath, ['pkg', 'set', `resolutions.${moduleName}=${version}`], { cwd: dir });
    } catch (err) {
      throw new Error(`${err}`);
    }
  }

  // when thats not possible and for tests, use package.json
  function setVersionFromPackageJSON(dir: string): void {
    try {
      const pkgPath = findupSync('package.json', {
        cwd: dir,
      }) as string;
      // wrapping in try catch so casting is safe
      const pkg = readJSON(pkgPath) as PackageJson;

      pkg.resolutions = pkg.resolutions || {};
      pkg.resolutions[moduleName] = version;

      writeJSONSync(pkgPath, pkg, { spaces: 2 });
    } catch (err) {
      throw new Error(`${err}`);
    }
  }

  try {
    await setVersionFromPkg(cwd);
  } catch (err) {
    try {
      setVersionFromPackageJSON(cwd);
    } catch (err) {
      throw new Error(`Failed to set resolution for ${moduleName} to ${version} in ${cwd}`);
    }
  }
}

// version specified in package.json NOT resolved version from lock file
export async function getModuleVersion(
  moduleName: string,
  type: 'devDep' | 'dep',
  cwd = process.cwd()
): Promise<string> {
  const depType = type === 'dep' ? 'dependencies' : 'devDependencies';

  // using npm pkg api (preferred)
  async function getVersionFromPkg(dir: string): Promise<string> {
    try {
      const npmPath = getManagerBinPath('npm');
      const { stdout } = await execa(npmPath, ['pkg', 'get', `${depType}.${moduleName}`], {
        cwd: dir,
      });

      if (stdout === '{}') {
        return '';
      } else {
        // eg "^2.3.2"
        return stdout.replace(/"/g, '');
      }
    } catch (err) {
      return '';
    }
  }

  // when thats not possible and for tests, use package.json
  function getVersionFromPkgJson(dir: string): string {
    try {
      const pkgPath = findupSync('package.json', {
        cwd: dir,
      });
      // wrapping in try catch so casting is safe
      const pkg = readJSON(pkgPath as string) as PackageJson;

      return pkg[depType]?.[moduleName] ?? '';
    } catch (err) {
      return '';
    }
  }

  const version = {
    pkg: await getVersionFromPkg(cwd),
    packageJson: getVersionFromPkgJson(cwd),
  };

  return version.pkg || version.packageJson;
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

// when executing a command with module manager prefix
// eg. yarn tsc or pnpm tsc or npm tsc
export async function runModuleCommand(args: string[], option: Options = {}): Promise<void> {
  const moduleManager = getModuleManager();
  const binAndArgs = {
    bin: moduleManager,
    args,
  };
  await execa(binAndArgs.bin, [...binAndArgs.args], option);
}

// rather than explicitly setting from node_modules dir we need to handle workspaces use case
// and volta use case
export async function getPathToBinary(binaryName: string, options: Options = {}): Promise<string> {
  // pnpm | yarn | npm
  const moduleManager = getModuleManager();
  // /Users/foo/.volta/bin/yarn
  // /usr/local/bin/pnpm
  const moduleManagerBin = getManagerBinPath(moduleManager);

  let binaryDir;

  // Get the binary dir
  // pnpm, yarn and npm@<9 support "bin", while npm@>=9 drops bin
  // it is still the best to try bin first
  // then fallback to get the executable bin directly from node_modules/.bin/
  try {
    const { stdout } = await execa(moduleManagerBin, ['bin', binaryName], options);
    binaryDir = stdout.trim().split(`/${binaryName}`)[0];
  } catch (e) {
    // Now <package manager> bin failed
    // try to get the executable bin directly from node_modules/.bin/
    const binPath = resolve(
      `${options.cwd ? options.cwd : process.cwd()}`,
      'node_modules',
      '.bin',
      binaryName
    );
    if (!existsSync(binPath)) {
      // Now both methods failed, throw error
      throw new Error(`Unable to find binary path to ${binaryName}`);
    }
    binaryDir = binPath.trim().split(`/${binaryName}`)[0];
  }

  // Then return the path to the binary
  try {
    return resolve(join(binaryDir, binaryName));
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
 * Ensure a path is absolute based on process.cwd()
 */
export function ensureAbsolutePath(p: string): string {
  return p === process.cwd() ? p : resolve(p);
}

/**
 * check if migration-config.json exists in process.cwd()
 */
export function validateUserConfig(basePath: string, userConfigPath: string): boolean {
  return existsSync(resolve(basePath, userConfigPath));
}

/**
 * Reads a tsConfig file
 * @param configPath
 * @returns
 */
export function readTSConfig<T>(configPath: string): T {
  return json5.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * Generate tsconfig
 */

export const DEFAULT_TS_CONFIG = {
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
};

export function writeTSConfig(configPath: string, config: unknown): void {
  configPath = configPath.endsWith('tsconfig.json')
    ? configPath
    : resolve(configPath, 'tsconfig.json');
  writeJSON(configPath, config);
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
  const packageJSON = readJSONSync(packageJSONPath) as PackageJson;
  return !!(
    packageJSON?.devDependencies?.['typescript'] || packageJSON?.dependencies?.['typescript']
  );
}

/**
 * Add/Update scripts in package.json
 */
export function addPackageJsonScripts(basePath: string, scriptMap: Record<string, string>): void {
  const packageJSONPath = resolve(basePath, 'package.json');
  const packageJSON = readJSONSync(packageJSONPath) as PackageJson;
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
  const defaultEditor = process.env['EDITOR'];
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
  // glob against the following file extension patterns and return the first match
  const configPath = sync(join(basePath, '.eslintrc?(.{js,yml,json,yaml,cjs})'))[0];
  return configPath;
}

/**
 * Return workspaces info for npm/yarn with package.json, or pnpm with pnpm-workspace.yaml
 * Or null if there is no workspaces info
 */
export function getWorkspacesInfo(currentDir: string = process.cwd()): string[] | null {
  if (isPnpmManager(currentDir)) {
    // For pnpm, if currentDir contains pnpm-workspace.yaml
    // read the yaml file and grab workspaces config if there is any
    const yamlPath = resolve(currentDir, 'pnpm-workspace.yaml');
    if (!existsSync(yamlPath)) {
      return null;
    }

    const yamlStr = readFileSync(yamlPath, 'utf-8');
    const yamlObj = yaml.load(yamlStr) as { packages: string[] };
    return yamlObj.packages || null;
  } else {
    // for npm/yarn
    // grab workspaces config from package.json if there is any
    const packageJSONPath = resolve(currentDir, 'package.json');
    if (!existsSync(packageJSONPath)) {
      return null;
    }

    const packageJSON = readJSON<{ workspaces: string[] }>(packageJSONPath);
    return packageJSON ? packageJSON.workspaces : null;
  }
}

/**
 * Find workspaces root for a givin startDir
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let previousDir = null;
  let currentDir = normalize(startDir);

  while (currentDir != previousDir) {
    const workspaces = getWorkspacesInfo(currentDir);
    if (workspaces) {
      const relativePath = relative(currentDir, startDir);
      if (relativePath === '' || micromatch([relativePath], workspaces).length > 0) {
        return currentDir;
      } else {
        return startDir;
      }
    }

    previousDir = currentDir;
    currentDir = dirname(currentDir);
  }

  // For pnpm, cannot find 'pnpm-workspace.yaml
  // Or for npm/yarn, cannot find yarn/npm workspaces
  // startDir should be the root
  return startDir;
}

// be sure the source exists within the basePath project
export function validateSourcePath(
  basePath: string,
  source: string,
  fileType: 'ts' | 'js'
): [string[], string[]] {
  const relativePath = relative(basePath, resolve(basePath, source));
  const globPaths = fileType === 'js' ? ['.js,.gjs'] : ['.ts,.gts'];

  if (
    source &&
    (!relativePath ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath) ||
      !existsSync(resolve(basePath, relativePath)))
  ) {
    throw new Error(`Rehearsal could not find source: ${source} in project: ${basePath}`);
  }

  // if source is a directory, get all the files otherwise just return the source as abs and rel tuple
  if (!isDirectory(source)) {
    // validate that the source is a js | .gjs file
    if (extname(source) === globPaths[0] || extname(source) === globPaths[1]) {
      return [[resolve(basePath, source)], [relativePath]];
    }

    throw new Error(
      `Rehearsal will only move ${globPaths[0]} or ${globPaths[1]} files. Source: ${source} is neither.`
    );
  }

  // otherwise return all the js files in the directory and its subdirectories
  return getFilesByType(basePath, source, fileType);
}

// check if the source is a directory
export function isDirectory(source: string): boolean {
  return extname(source) === '';
}

/**
 * Get files by requested type returns tuple with [abs, rel] paths
 * @typedef {(ts|js)} FileType
 * @param {string} basePath - eg process.cwd()
 * @param {string} source - eg basePath/src or basePath/src/child/file.ts|.js
 * @param {FileType} fileType - either ts | js, which will glob for 'js,gjs'|'ts,gts'
 */
export function getFilesByType(
  basePath: string,
  source: string,
  fileType: 'ts' | 'js'
): [string[], string[]] {
  const sourceAbs = resolve(basePath, source);
  const sourceRel = relative(basePath, sourceAbs);
  const globPaths = fileType === 'js' ? 'js,gjs' : 'ts,gts';

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const sourceFiles = sync(`${sourceRel}/**/*.{${globPaths}}`, { cwd: basePath });

  // if no files are found, throw an error
  if (!sourceFiles.length) {
    throw new Error(
      `Rehearsal could not find any ${fileType} files in the source directory: ${sourceAbs}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  return [sourceFiles.map((file) => resolve(basePath, file)), sourceFiles];
}

// be sure the childPackage exists within the basePath project and returns rel and abs tuple
export function validateChildPackage(basePath: string, childPackage: string): [string, string] {
  if (
    !existsSync(resolve(basePath, childPackage)) ||
    !existsSync(resolve(basePath, childPackage, 'package.json'))
  ) {
    throw new Error(
      `Rehearsal could not find the childPackage: "${childPackage}" in project: "${basePath}" OR the childPackage does not have a package.json file.`
    );
  }

  // return the abs path and rel path of the childPackage
  return [resolve(basePath, childPackage), relative(basePath, resolve(basePath, childPackage))];
}

export function isExistsESLintConfig(basePath: string): boolean {
  const lintConfigPath = getEsLintConfigPath(basePath);
  if (!lintConfigPath) {
    throw new Error(
      `Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist. You need to run rehearsal migrate first before you can run rehearsal migrate --regen`
    );
  }
  return true;
}

export function isExistsTSConfig(basePath: string): boolean {
  const tsConfigPath = resolve(basePath, 'tsconfig.json');
  if (!existsSync(tsConfigPath)) {
    throw new Error(
      `${tsConfigPath} does not exists. Please run rehearsal inside a project with a valid tsconfig.json.`
    );
  }
  return true;
}

export function isExistsPackageJSON(basePath: string): boolean {
  const packageJsonPath = resolve(basePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(
      `${packageJsonPath} does not exists. Please run rehearsal inside a project with a valid package.json.`
    );
  }
  return true;
}

export function isValidGitIgnore(basePath: string): boolean {
  const gitignorePath = resolve(basePath, '.gitignore');
  if (!existsSync(gitignorePath)) {
    return true;
  }

  const gitignore = readFileSync(gitignorePath, 'utf-8');
  const rehearsalReportRegex = /\rehearsal-report.*/g;
  if (rehearsalReportRegex.test(gitignore)) {
    throw new Error(
      `rehearsal-report is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
    );
  }

  return true;
}

export function isExistsRehearsalReport(basePath: string): boolean {
  const rehearsalReportRegex = /\rehearsal-report.*/g;
  return readdirSync(basePath).filter((d: string) => rehearsalReportRegex.test(d)).length > 0;
}

export function isDepsPreReq(basePath: string, requiredDeps: Record<string, string>): boolean {
  // read the package.json
  const packageJSON = readJSONSync(resolve(basePath, 'package.json')) as PackageJson;
  const invalidVersion: string[] = [];
  const message: string[] = [];
  // grab ALL packageJson dependencies and devDependencies as a single array with versions
  const packageJSONDeps = {
    ...packageJSON.dependencies,
    ...packageJSON.devDependencies,
  } as Record<string, string>;

  // all the deps which are missing
  const missingDeps = Object.keys(requiredDeps).filter(
    (dep) => !Object.keys(packageJSONDeps).includes(extractDepName(dep))
  );

  // loop over the packageJSONDeps and compare the versions against the requiredDeps
  for (const dep in packageJSONDeps) {
    // if the dep is in the requiredDeps, but the versions do not match, throw an error
    if (Object.keys(requiredDeps).includes(dep)) {
      if (compare(packageJSONDeps[dep], requiredDeps[dep], '>=')) {
        invalidVersion.push(dep);
      }
    }
  }

  // combine all the errors and throw them together for both missing and version mismatch
  if (invalidVersion.length > 0) {
    message.push(
      `Please update "${invalidVersion.join(', ')}: ${invalidVersion
        .map((dep) => requiredDeps[dep])
        .join(', ')}" to the minimum required version and try again.`
    );
  }

  if (missingDeps.length > 0) {
    message.push(
      `Please install "${missingDeps.join(', ')}: ${missingDeps
        .map((dep) => requiredDeps[dep])
        .join(', ')}" as a devDependency and try again.`
    );
  }

  // throw the message if there are any errors
  if (message.length > 0) {
    throw new Error(message.join('\n'));
  }

  return true;
}

// get the name of dependency from those two format:
// - foo
// - foo@{version}
// Be aware that a package name would start with @, e.g @types/node
export function extractDepName(dep: string): string {
  const reg = /^(@?[^@]+)/g;
  const matched = dep.match(reg);
  return matched ? matched[0] : dep;
}

export function isESLintPreReq(basePath: string, requiredParser: string): boolean {
  const lintConfigPath = getEsLintConfigPath(basePath);
  if (!lintConfigPath) {
    throw new Error(
      `Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist. You need to run rehearsal migrate first before you can run rehearsal migrate --regen`
    );
  }

  // read the eslint config
  const lintConfig = readJSONSync(lintConfigPath) as Record<string, string>;

  // if the parser is not requiredParser throw
  if (!Object.keys(lintConfig).includes('parser')) {
    throw new Error(`Please add "parser: ${requiredParser}" to your eslint config and try again.`);
  }

  // if the parser is not the requiredParser throw
  if (lintConfig['parser'] !== requiredParser) {
    throw new Error(
      `Please update "parser: ${lintConfig['parser']}" to "parser: ${requiredParser}" and try again.`
    );
  }

  return true;
}

export function isTSConfigPreReq(basePath: string, requiredTSConfig: TSConfig): boolean {
  // read the tsconfig.json
  const tsConfig = readTSConfig<TSConfig>(basePath);

  // loop over the requiredTSConfig options and compare them to the tsConfig
  for (const k in requiredTSConfig) {
    if (Object.keys(tsConfig).includes(k)) {
      // TODO
    }
  }

  return true;
}

export function isNodePreReq(requiredNode: string): boolean {
  const nodeVersion = process.version;
  if (compare(nodeVersion, requiredNode, '>=')) {
    throw new Error(`Please update your node version to ${requiredNode} or above and try again.`);
  }

  return true;
}
