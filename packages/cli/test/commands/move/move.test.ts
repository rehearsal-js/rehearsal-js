import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import fastGlob from 'fast-glob';
import { cleanOutput, prepareProject, runBin } from '../../test-helpers/index.js';

function sanitizeAbsPath(basePath: string, files: string[]): string[] {
  return files.map((file) => file.replace(basePath, ''));
}

describe('Command: move', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('base_js_app');
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('move file', async () => {
    const sourceDir = 'src/foo';

    const result = await runBin('move', [`${sourceDir}/baz.js`], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
    const projectSourceDir = resolve(project.baseDir, sourceDir);

    const jsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{js,gjs}`, {
      cwd: project.baseDir,
    });
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(jsSourceFiles).length(3);
    expect(sanitizeAbsPath(projectSourceDir, tsSourceFiles)).toMatchObject(['/baz.ts']);
  });

  test('move dir and sub-dir', async () => {
    const sourceDir = 'src';
    const projectSourceDir = resolve(project.baseDir, sourceDir);

    const tsSourceFilesBeforeMove = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(tsSourceFilesBeforeMove).length(1);

    const result = await runBin('move', [`${sourceDir}`], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    // check for js and gjs files -> ts and gts files
    const jsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{js,gjs}`, {
      cwd: project.baseDir,
    });
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(jsSourceFiles).length(0);
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/bizz.ts',
      '/src/index.ts',
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });

  test('move packages based on the graph', async () => {
    const result = await runBin('move', [`.`], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    const projectSourceDir = resolve(project.baseDir);
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/bizz.ts',
      '/src/index.ts',
      '/module-a/src/baz.ts',
      '/module-a/src/foo.ts',
      '/module-a/src/index.ts',
      '/module-b/src/car.ts',
      '/module-b/src/index.ts',
      '/module-b/src/tires.ts',
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });

  test('move sub directory based on the graph', async () => {
    const result = await runBin('move', [`src/foo`], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    const projectSourceDir = resolve(project.baseDir);
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/bizz.ts', // Was already renamed
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });

  test('can opt-out of move with graph', async () => {
    const result = await runBin('move', [`./src`], ['--no-graph', '--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    const projectSourceDir = resolve(project.baseDir);
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/bizz.ts',
      '/src/index.ts',
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });

  test('can opt-out of move sub directory with graph', async () => {
    const result = await runBin(
      'move',
      [`./src/foo`],
      ['--no-graph', '--rootPath', project.baseDir],
      {
        cwd: project.baseDir,
    });

    const projectSourceDir = resolve(project.baseDir);
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/bizz.ts',
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });
});
