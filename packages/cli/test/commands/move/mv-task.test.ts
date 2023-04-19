import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import fastGlob from 'fast-glob';
import { prepareProject, listrTaskRunner } from '../../test-helpers/index.js';
import { initTask, moveTask } from '../../../src/commands/move/tasks/index.js';
import { graphOrderTask } from '../../../src/commands/graph/tasks/graphOrderTask.js';
import type { Project } from 'fixturify-project';
import type { MoveCommandContext, MoveCommandOptions } from '../../../src/types.js';

describe('Task: mv', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('multi_packages');
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('move js source file', async () => {
    const sourceDir = 'src/foo';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: false,
      source: `${sourceDir}/baz.js`,
    };

    const tasks = [initTask(options), graphOrderTask(options), moveTask(options)];
    await listrTaskRunner<MoveCommandContext>(tasks);
    const fileList = readdirSync(resolve(project.baseDir, sourceDir));

    expect(fileList).toContain('baz.ts');
    // should not of been moved to .ts
    expect(fileList).toContain('biz.js');
    expect(fileList).not.toContain('baz.js');
  });

  test('move gjs source file', async () => {
    const sourceDir = 'src/foo';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: false,
      source: `${sourceDir}/e.gjs`,
    };

    const tasks = [initTask(options), graphOrderTask(options), moveTask(options)];
    await listrTaskRunner<MoveCommandContext>(tasks);
    const fileList = readdirSync(resolve(project.baseDir, sourceDir));

    expect(fileList).toContain('e.gts');
    // should not of been moved to .ts
    expect(fileList).toContain('biz.js');
    expect(fileList).not.toContain('e.gjs');
  });

  test('move directory', async () => {
    const source = 'src';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: false,
      source,
    };

    const tasks = [initTask(options), graphOrderTask(options), moveTask(options)];
    await listrTaskRunner<MoveCommandContext>(tasks);

    const jsSourceFiles = fastGlob.sync(`${source}/**/*.{js,gjs}`, { cwd: project.baseDir });
    const tsSourceFiles = fastGlob.sync(`${source}/**/*.{ts,gts}`, { cwd: project.baseDir });

    expect(jsSourceFiles).length(0);
    expect(tsSourceFiles).toContain('src/index.ts');
    expect(tsSourceFiles).toContain('src/foo/baz.ts');
    expect(tsSourceFiles).toContain('src/foo/e.gts');
    expect(tsSourceFiles).toContain('src/foo/biz.ts');
    expect(tsSourceFiles).toContain('src/foo/buz/biz.ts');
  });
});
