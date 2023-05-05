import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { initTask } from '../../../src/commands/move/tasks/index.js';
import { prepareProject, listrTaskRunner, cleanOutput } from '../../test-helpers/index.js';
import type { CommandContext, MoveCommandOptions } from '../../../src/types.js';
import type { Project } from 'fixturify-project';

describe('Move: Init-Task', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('base_js_app');
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('validate source option with file', async () => {
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
  });

  test('validate source option with directory', async () => {
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
    expect(ctx.jsSourcesAbs).toMatchObject([
      resolve(project.baseDir, 'src/foo/baz.js'),
      resolve(project.baseDir, 'src/foo/biz.js'),
      resolve(project.baseDir, 'src/foo/e.gjs'),
      resolve(project.baseDir, 'src/foo/buz/biz.js'),
    ]);
  });

  test('validate childPackage', async () => {
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
  });

  test('expect failure source not in project', async () => {
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

  test('expect failure directory not in project', async () => {
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
  });

  test('expect failure childPackage not in project', async () => {
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
  });

  test('expect failure childPackage missing package.json', async () => {
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
  });
});
