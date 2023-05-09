import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';
import { initTask } from '../../../src/commands/move/tasks/index.js';

import {
  prepareProject,
  listrTaskRunner,
  cleanOutput,
  createOutputStream,
} from '../../test-helpers/index.js';

import type { CommandContext, MoveCommandOptions } from '../../../src/types.js';
import type { Project } from 'fixturify-project';
import type { Readable } from 'node:stream';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Move: Init-Task', () => {
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
    project = prepareProject('base_js_app');
    await project.write();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('project should init with source file arg', async () => {
    const source = 'src/foo/buz/biz.js';
    const options: MoveCommandOptions = {
      rootPath: project.baseDir,
      dryRun: true,
      graph: false,
      devDeps: false,
      deps: false,
      ignore: [''],
    };
    const tasks = [initTask(source, options)];
    const ctx = await listrTaskRunner<CommandContext>(tasks);

    const sanitizedAbsPaths = ctx.sourceFilesAbs?.map((path) => {
      return cleanOutput(path, project.baseDir);
    });

    expect(sanitizedAbsPaths).toMatchSnapshot();
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('project should init with source directory arg', async () => {
    const source = 'src/foo';
    const options: MoveCommandOptions = {
      rootPath: project.baseDir,
      dryRun: true,
      graph: false,
      devDeps: false,
      deps: false,
      ignore: [''],
    };
    const tasks = [initTask(source, options)];
    const ctx = await listrTaskRunner<CommandContext>(tasks);
    expect(ctx.sourceFilesAbs).toMatchObject([
      resolve(project.baseDir, 'src/foo/baz.js'),
      resolve(project.baseDir, 'src/foo/biz.js'),
      resolve(project.baseDir, 'src/foo/e.gjs'),
      resolve(project.baseDir, 'src/foo/buz/biz.js'),
    ]);
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('project should init with source project arg and graph', async () => {
    // childPackage is a relative path from basePath
    const childPackage = 'module-b';
    const options: MoveCommandOptions = {
      rootPath: project.baseDir,
      dryRun: true,
      graph: true,
      devDeps: false,
      deps: true,
      ignore: [''],
    };
    const tasks = [initTask(childPackage, options)];
    const ctx = await listrTaskRunner<CommandContext>(tasks);

    expect(ctx.packageAbs).toStrictEqual(resolve(project.baseDir, './module-b'));
    expect(ctx.packageRel).toStrictEqual(childPackage);
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('expect failure - source file arg not in project', async () => {
    const basePath = project.baseDir;
    const nonExistsSourceFile = 'src/file-does-not-exist-in-project.js';
    await expect(
      async () =>
        await listrTaskRunner<CommandContext>([
          initTask(nonExistsSourceFile, {
            rootPath: project.baseDir,
            dryRun: true,
            graph: false,
            devDeps: false,
            deps: false,
            ignore: [''],
          }),
        ])
    ).rejects.toThrowError(
      `Rehearsal could not find source: ${nonExistsSourceFile} in project: ${basePath}`
    );
  });

  test('expect failure - source directory arg not in project', async () => {
    const basePath = project.baseDir;
    const nonExistsDirectory = '/dir/dont/exist/in/project';
    await expect(
      async () =>
        await listrTaskRunner<CommandContext>([
          initTask(nonExistsDirectory, {
            rootPath: project.baseDir,
            dryRun: true,
            graph: false,
            devDeps: false,
            deps: false,
            ignore: [''],
          }),
        ])
    ).rejects.toThrowError(
      `Rehearsal could not find source: ${nonExistsDirectory} in project: ${basePath}`
    );
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('expect failure - source package arg not in project', async () => {
    const basePath = project.baseDir;
    const nonExistsChildPackage = 'module-nope';
    await expect(
      async () =>
        await listrTaskRunner<CommandContext>([
          initTask(nonExistsChildPackage, {
            rootPath: project.baseDir,
            dryRun: true,
            graph: true,
            devDeps: false,
            deps: true,
            ignore: [''],
          }),
        ])
    ).rejects.toThrowError(
      `Rehearsal could not find the package: "${nonExistsChildPackage}" in project: "${basePath}" OR the package does not have a package.json file.`
    );
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('expect failure - package missing package.json', async () => {
    const basePath = project.baseDir;
    const nonPackage = 'src';
    await expect(
      async () =>
        await listrTaskRunner<CommandContext>([
          initTask(nonPackage, {
            rootPath: project.baseDir,
            dryRun: true,
            graph: true,
            devDeps: false,
            deps: true,
            ignore: [''],
          }),
        ])
    ).rejects.toThrowError(
      `Rehearsal could not find the package: "${nonPackage}" in project: "${basePath}" OR the package does not have a package.json file.`
    );
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });
});
