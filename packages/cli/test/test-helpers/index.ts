import { dirname, resolve } from 'node:path';
import { Readable } from 'stream';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { Listr, ListrTask } from 'listr2';
import { Project } from 'fixturify-project';

import type { ExecaChildProcess, Options } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// helper function to run a command via the actual bin
// stdout of commands available via ExecaChildProcess.stdout
export function runBin(
  command: string,
  args: string[] = [],
  flags: string[] = [],
  options: Options = {}
): ExecaChildProcess {
  const cliPath = resolve(__dirname, `../../bin/rehearsal.js`);
  return execa(cliPath, [command, ...args, ...flags], options);
}

// Create tmp dir for migrate test based on fixture selection
export function prepareProject(
  dir: string,
  options: { linkDeps: boolean; linkDevDeps: boolean } = {
    linkDeps: true,
    linkDevDeps: true,
  }
): Project {
  const projectPath = resolve(__dirname, '../fixtures/', dir);
  const project = Project.fromDir(projectPath, options);

  return project;
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
