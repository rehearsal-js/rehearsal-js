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
    expect(tsSourceFiles).length(1);
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
    expect(tsSourceFiles).length(6);
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/bizz.ts',
      '/src/index.ts',
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });

  test('move package with --graph and --deps flag', async () => {
    const childPackage = 'module-a';

    const result = await runBin(
      'move',
      [`${childPackage}`],
      ['--graph', '--deps', '--rootPath', project.baseDir],
      {
        cwd: project.baseDir,
      }
    );

    const projectSourceDir = resolve(project.baseDir, childPackage);
    // check for js and gjs files -> ts and gts files
    const jsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{js,gjs}`, {
      cwd: project.baseDir,
    });
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(jsSourceFiles).length(0);
    expect(tsSourceFiles).length(3);
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/module-a/index.ts',
      '/module-a/src/baz.ts',
      '/module-a/src/foo.ts',
    ]);
  });

  test('expect failure when --deps is passed without --graph', async () => {
    const childPackage = 'module-a';

    await expect(
      async () =>
        await runBin('move', [`${childPackage}`], ['--deps', '--rootPath', project.baseDir], {
          cwd: project.baseDir,
        })
    ).rejects.toThrowError(`'--deps' can only be passed when you pass --graph`);
  });

  test('expect failure when --devDeps is passed without --graph', async () => {
    const childPackage = 'module-a';
    await expect(
      async () =>
        await runBin('move', [`${childPackage}`], ['--devDeps', '--rootPath', project.baseDir], {
          cwd: project.baseDir,
        })
    ).rejects.toThrowError(`'--devDeps' can only be passed when you pass --graph`);
  });

  test('expect failure when --ignore is passed without --graph', async () => {
    const childPackage = 'module-a';
    await expect(
      async () =>
        await runBin(
          'move',
          [`${childPackage}`],
          ['--ignore', 'foo', '--rootPath', project.baseDir],
          {
            cwd: project.baseDir,
          }
        )
    ).rejects.toThrowError(`'--ignore' can only be passed when you pass --graph`);
  });
});
