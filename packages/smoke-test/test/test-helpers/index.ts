import { dirname, resolve, join } from 'node:path';
import { Readable } from 'stream';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { Project } from 'fixturify-project';
import { createLogger, format, transports } from 'winston';
import JSON5 from 'json5';
import { expect, type Assertion } from 'vitest';

import type { ExecaChildProcess, Options } from 'execa';
import type { TsConfigJson } from 'type-fest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type FixtureType = 'base_js_app' | 'base_ts_app' | 'glimmerx_js_app' | 'ember_js_app';

interface TsConfigGlint extends TsConfigJson {
  glint?: {
    environment?: string | string[] | Record<string, unknown>;
    checkStandaloneTemplates?: boolean;
  };
}

export function sanitizeAbsPath(basePath: string, files: string[]): string[] {
  return files.map((file) => file.replace(basePath, ''));
}

export function addWorkspaces(project: Project): Project {
  project.pkg.workspaces = ['./lib/*'];
  return project;
}

export function expectFile(filePath: string): Assertion<string> {
  return expect(readFileSync(filePath, 'utf-8'));
}

export const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

export function readTSConfig(baseDir: string): TsConfigGlint {
  return JSON5.parse(readFileSync(join(baseDir, './tsconfig.json'), 'utf-8'));
}

export function writeTSConfig(baseDir: string, data: TsConfigGlint): void {
  writeFileSync(join(baseDir, './tsconfig.json'), JSON5.stringify(data, { space: 2, quote: '"' }));
}

// helper function to run a @rehearsal/cli
// stdout of commands available via ExecaChildProcess.stdout
export function rehearsalCLI(
  command: string,
  args: string = '',
  flags: string[] = [],
  options: Options = {}
): ExecaChildProcess {
  const rehearsalCLIPath = resolve(__dirname, '../../node_modules/.bin/rehearsal');
  return execa(rehearsalCLIPath, [command, args, ...flags], options);
}

// Create tmp dir for migrate test based on fixture selection
// we should always link deps and devDeps so we dont have to run npm install for the fixtures
export function prepareProject(
  dir: FixtureType,
  options: { linkDeps: boolean; linkDevDeps: boolean } = {
    linkDeps: true,
    linkDevDeps: true,
  }
): Project {
  const projectPath = resolve(__dirname, '../fixtures/', dir);
  const project = Project.fromDir(projectPath, options);

  return project;
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
  const versionRegex = /(@rehearsal\/(move|migrate|graph|fix))(.+)/g;
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
