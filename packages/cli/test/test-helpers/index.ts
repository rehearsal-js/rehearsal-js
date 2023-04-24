import { dirname, join, resolve } from 'node:path';
import { Readable } from 'stream';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import which from 'which';
import { Listr, ListrTask } from 'listr2';
import { git, gitIsRepoDirty, readJSON } from '@rehearsal/utils';
import { Project } from 'fixturify-project';
import { createLogger, format, transports } from 'winston';

import type { MigrateCommandOptions } from '../../src/types.js';
import type { ExecaChildProcess, Options } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = readJSON(resolve(__dirname, '../../package.json')) as {
  dependencies: { typescript: string };
};

export const PNPM_PATH = which.sync('pnpm');

export async function gitDeleteLocalBranch(checkoutBranch?: string): Promise<void> {
  // this should be the rehearsal-bot branch
  const { current } = await git.branchLocal();
  // grab the current working branch which should not be the rehearsal-bot branch
  const branch = checkoutBranch || 'master';

  // only restore files in fixtures
  if (await gitIsRepoDirty()) {
    await execa('git', ['restore', '--', resolve(__dirname, '../fixtures/app')]);
  }

  await git.checkout(branch);

  // only delete if a branch rehearsal-bot created
  if (current !== 'master' && current.includes('rehearsal-bot')) {
    await git.deleteLocalBranch(current);
  }
}

// helper function to run a command via the actual bin
// stdout of commands available via ExecaChildProcess.stdout
export function runBin(command: string, args: string[], options: Options = {}): ExecaChildProcess {
  const cliPath = resolve(__dirname, `../../bin/rehearsal.js`);
  return execa(cliPath, [command, ...args], options);
}

let WORKING_BRANCH = '';

export const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');

// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
export const TEST_TSC_VERSION = '4.5.5';
export const ORIGIN_TSC_VERSION = packageJson.dependencies.typescript;

// we bundle typescript in deps
export const beforeEachPrep = async (): Promise<void> => {
  const { current } = await git.branchLocal();
  WORKING_BRANCH = current;
  // install the test version of tsc
  await execa(PNPM_PATH, ['add', '-w', '-D', `typescript@${TEST_TSC_VERSION}`]);
  await execa(PNPM_PATH, ['install']);
  // clean any report files
  rmSync(join(FIXTURE_APP_PATH, '.rehearsal'), { recursive: true, force: true });
};

// Revert to previous TSC version from TEST_TSC_VERSION
export const afterEachCleanup = async (): Promise<void> => {
  await gitDeleteLocalBranch(WORKING_BRANCH);
};

// Create tmp dir for migrate test based on fixture selection
export function prepareProject(
  dir: string,
  options: { linkDeps: boolean; linkDevDeps: boolean } = {
    linkDeps: true,
    linkDevDeps: true,
  }
): Project {
  const projects = resolve(__dirname, '../fixtures/app_for_migrate');
  const migrateFixturesDir = join(projects, 'src', dir);
  const project = Project.fromDir(migrateFixturesDir, options);

  project.files['tsconfig.json'] = readFileSync(join(projects, 'tsconfig.json'), 'utf-8');

  return project;
}

// create default options for migrate cli
export function createMigrateOptions(
  basePath: string,
  options?: Partial<MigrateCommandOptions>
): MigrateCommandOptions {
  return {
    basePath,
    skipInit: false,
    entrypoint: '',
    package: '',
    format: ['sarif'],
    verbose: false,
    userConfig: 'rehearsal-config.json',
    ci: false,
    dryRun: false,
    regen: false,
    ...options,
  };
}

// Task runner for test
export async function listrTaskRunner<T>(tasks: ListrTask[]): Promise<T> {
  const defaultListrOption = {
    concurrent: false,
    exitOnError: true,
    renderer: 'verbose',
  };
  return (await new Listr(tasks, defaultListrOption).run()) as Promise<T>;
}

// keycode for interactive mode test
export enum KEYS {
  ENTER = '\x0D',
  CTRL_C = '\x03',
  UP = '\u001b[A',
  DOWN = '\u001b[B',
}

// send key/command in interactive mode test
export function sendKey(key: KEYS): void {
  process.stdin.emit('data', key);
}

// clear all special chars for snapshot test
// especially in interactive mode, the enquirer prompt would produce difference chars in different environment
// which makes snapshot test impossible
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

// clean special chars and variables for output message snapshot:
// 1. replace CLI version
// 2. remove unicode, color chars
// 3. remove tmp paths
export function cleanOutput(output: string, basePath: string): string {
  const pathRegex = new RegExp(basePath, 'g');
  const versionRegex = /(@rehearsal\/migrate)(.+)/g;
  return removeSpecialChars(
    output.replace(pathRegex, '<tmp-path>').replace(versionRegex, '$1<test-version>')
  );
}

// create readable stream for console messages
export function createOutputStream(): Readable {
  const outputStream = new Readable({
    read() {
      // no-ops
    },
  });
  outputStream.setEncoding('utf-8');
  return outputStream;
}

// check if current line is the prompt message for selecting packages
export function isPackageSelection(currentLine: string): boolean {
  return currentLine.includes(
    'We have found multiple packages in your project, select the one to migrate'
  );
}

// check if current line is the prompt message for selecting Accept/Edit/Discard in interactive mode
export function isActionSelection(currentLine: string): boolean {
  const promptRegex = /Select an option to continue:/gm;
  return (
    promptRegex.test(currentLine) &&
    currentLine.includes('Accept') &&
    currentLine.includes('Edit') &&
    currentLine.includes('Discard')
  );
}

export const winstonLogger = createLogger({
  transports: [new transports.Console({ format: format.cli(), level: 'info' })],
});
