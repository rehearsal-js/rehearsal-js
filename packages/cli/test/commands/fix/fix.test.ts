import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Project } from 'fixturify-project';
import { createLogger, format, transports } from 'winston';
import { getEmberProject } from '@rehearsal/test-support';
import { getPreReqs } from '../../../src/prereqs.js';
import { runBin, cleanOutput, createOutputStream } from '../../test-helpers/index.js';

import type { ProjectType } from '../../../src/types.js';
import type { Readable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

function projectAddDevDeps(project: Project, type: ProjectType): void {
  const prereqs = getPreReqs(type);
  const deps = prereqs.deps;
  for (const [dep, version] of Object.entries(deps)) {
    project.addDevDependency(dep, `^${version}`);
  }
}

function projectInit(project: Project, type: ProjectType): void {
  projectAddDevDeps(project, type);

  const prereqs = getPreReqs(type);

  project.files['tsconfig.json'] = JSON.stringify({
    ...prereqs.tsconfig,
  });
  project.files['.eslintrc.json'] = JSON.stringify({
    parser: prereqs.eslint,
  });
}

function expectFile(filePath: string): Vi.Assertion<string> {
  return expect(readFileSync(filePath, 'utf-8'));
}

describe('Command: fix "base_ts_app" fixture', () => {
  let project: Project;
  let outputStream: Readable;
  let output = '';

  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(logger, 'warn').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
    return logger;
  });
  vi.spyOn(logger, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
    return logger;
  });

  beforeEach(async () => {
    output = '';
    outputStream = createOutputStream();

    const options = {
      linkDeps: true,
      linkDevDeps: true,
    };

    project = Project.fromDir(resolve(__dirname, '../../fixtures/base_ts_app'), options);

    // init project with tsconfig, eslint, and deps
    projectInit(project, 'base');
    project.linkDevDependency('typescript', { baseDir: process.cwd() });
    project.linkDevDependency('eslint', { baseDir: process.cwd() });

    await project.write();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('fix file with src arg', async () => {
    const sourceFilepath = 'src/gen-random-grid.ts';
    const src = resolve(project.baseDir, sourceFilepath);

    const result = await runBin('fix', [src], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expectFile(resolve(project.baseDir, sourceFilepath)).toMatchSnapshot();
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('fix directory with src arg', async () => {
    const sourceDir = 'src';
    const src = resolve(project.baseDir, sourceDir);

    const result = await runBin('fix', [src], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();

    for (const filepath of Object.keys(project.files[sourceDir] as string)) {
      expectFile(resolve(project.baseDir, sourceDir, filepath)).toMatchSnapshot();
    }
  });
});

describe('Command: fix "ember-ts-app" fixture', () => {
  let project: Project;
  let outputStream: Readable;
  let output = '';

  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(logger, 'warn').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
    return logger;
  });
  vi.spyOn(logger, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
    return logger;
  });

  beforeEach(async () => {
    output = '';
    outputStream = createOutputStream();
    project = getEmberProject('ts-app');

    await project.write();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('fix package with src arg and graph', async () => {
    const src = resolve(project.baseDir);
    const flags = ['--graph', '--deps', '--rootPath', project.baseDir];

    const result = await runBin('fix', [src], flags, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });
});
