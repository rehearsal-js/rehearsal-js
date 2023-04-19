import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { initTask } from '../../../src/commands/move/tasks/index.js';
import { prepareProject, listrTaskRunner } from '../../test-helpers/index.js';
import type { MoveCommandContext, MoveCommandOptions } from '../../../src/types.js';
import type { Project } from 'fixturify-project';

describe('Move: Init-Task', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('multi_packages');
    await project.write();
  });

  afterEach(() => {
    vi.clearAllMocks();
    project.dispose();
  });

  test('validate source option with file', async () => {
    const source = 'src/foo/buz/biz.js';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: true,
      source,
    };
    const tasks = [initTask(options)];
    const ctx = await listrTaskRunner<MoveCommandContext>(tasks);

    expect(ctx.jsSourcesRel).toStrictEqual([source]);
    expect(ctx.workspaceRoot).toStrictEqual(project.baseDir);
  });

  test('validate source option with directory', async () => {
    const source = 'src/foo';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: true,
      source,
    };
    const tasks = [initTask(options)];
    const ctx = await listrTaskRunner<MoveCommandContext>(tasks);
    expect(ctx.jsSourcesAbs).toMatchObject([
      resolve(project.baseDir, 'src/foo/baz.js'),
      resolve(project.baseDir, 'src/foo/biz.js'),
      resolve(project.baseDir, 'src/foo/e.gjs'),
      resolve(project.baseDir, 'src/foo/buz/biz.js'),
    ]);

    expect(ctx.workspaceRoot).toStrictEqual(project.baseDir);
  });

  test('validate childPackage', async () => {
    // childPackage is a relative path from basePath
    const childPackage = 'module-b';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: true,
      childPackage,
    };
    const tasks = [initTask(options)];
    const ctx = await listrTaskRunner<MoveCommandContext>(tasks);

    expect(ctx.childPackageAbs).toStrictEqual(resolve(project.baseDir, './module-b'));
    expect(ctx.childPackageRel).toStrictEqual(childPackage);
  });

  test('expect failure cases:', () => {
    const basePath = project.baseDir;
    const nonExistsSourceFile = 'src/file-does-not-exist-in-project.js';
    const nonExistsDirectory = '/dir/dont/exist/in/project';
    const nonExistsChildPackage = 'module-nope';

    const expectRejectCases = [
      {
        name: 'source file does not exist',
        eMessage: `Rehearsal could not find source: ${nonExistsSourceFile} in project: ${basePath}`,
        options: { source: nonExistsSourceFile },
      },
      {
        name: 'source directory does not exist',
        eMessage: `Rehearsal could not find source: ${nonExistsDirectory} in project: ${basePath}`,
        options: { source: nonExistsDirectory },
      },
      {
        name: 'childPackage does not exist',
        eMessage: `Rehearsal could not find childPackage: ${nonExistsChildPackage} in project: ${basePath}`,
        options: { childPackage: nonExistsChildPackage },
      },
      {
        name: 'both childPackage and source are specified',
        eMessage:
          '@rehearsal/move: --childPackage AND --source are specified, please specify only one',
        options: { childPackage: nonExistsChildPackage, source: nonExistsSourceFile },
      },
      {
        name: 'neither childPackage nor source are specified',
        eMessage: '@rehearsal/move: you must specify a flag, either --childPackage OR --source',
        options: {},
      },
    ];

    expectRejectCases.forEach((testCase) => {
      test(testCase.name, () => {
        void expect(
          async () =>
            await listrTaskRunner<MoveCommandContext>([
              initTask({
                basePath,
                dryRun: true,
                ...testCase.options,
              }),
            ])
        ).rejects.toThrow(testCase.eMessage);
      });
    });
  });
});
