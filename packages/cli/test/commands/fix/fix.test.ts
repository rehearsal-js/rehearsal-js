import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import fastGlob from 'fast-glob';
import { getPreReqs } from '../../../src/prereqs.js';
import { prepareProject, runBin } from '../../test-helpers/index.js';
import type { ProjectType } from '../../../src/types.js';

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
    ...prereqs.eslint,
  });
}

function sanitizeAbsPath(basePath: string, files: string[]): string[] {
  return files.map((file) => file.replace(basePath, ''));
}

describe('Command: fix multi_packages fixture', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('multi_packages');
    projectInit(project, 'base');
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('fix file with --source flag', async () => {
    const sourceDir = 'src/foo';

    const result = await runBin(
      'move',
      ['--source', `${sourceDir}/baz.js`, '--basePath', project.baseDir],
      {
        cwd: project.baseDir,
      }
    );
    const projectSourceDir = resolve(project.baseDir, sourceDir);

    const jsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{js,gjs}`, {
      cwd: project.baseDir,
    });
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(result.stdout).toMatchSnapshot();
    expect(jsSourceFiles).length(3);
    expect(tsSourceFiles).length(1);
    expect(sanitizeAbsPath(projectSourceDir, tsSourceFiles)).toMatchObject(['/baz.ts']);
  });

  test('move dir and sub-dir with --source flag', async () => {
    const sourceDir = 'src';

    const result = await runBin(
      'move',
      ['--source', `${sourceDir}`, '--basePath', project.baseDir],
      {
        cwd: project.baseDir,
      }
    );

    const projectSourceDir = resolve(project.baseDir, sourceDir);
    // check for js and gjs files -> ts and gts files
    const jsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{js,gjs}`, {
      cwd: project.baseDir,
    });
    const tsSourceFiles = fastGlob.sync(`${projectSourceDir}/**/*.{ts,gts}`, {
      cwd: project.baseDir,
    });

    expect(result.stdout).toMatchSnapshot();
    expect(jsSourceFiles).length(0);
    expect(tsSourceFiles).length(5);
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/src/index.ts',
      '/src/foo/baz.ts',
      '/src/foo/biz.ts',
      '/src/foo/e.gts',
      '/src/foo/buz/biz.ts',
    ]);
  });

  test('move package with --childPackage flag', async () => {
    const childPackage = 'module-a';

    const result = await runBin(
      'move',
      ['--childPackage', `${childPackage}`, '--basePath', project.baseDir],
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

    expect(result.stdout).toMatchSnapshot();
    expect(jsSourceFiles).length(0);
    expect(tsSourceFiles).length(3);
    expect(sanitizeAbsPath(project.baseDir, tsSourceFiles)).toMatchObject([
      '/module-a/index.ts',
      '/module-a/src/baz.ts',
      '/module-a/src/foo.ts',
    ]);
  });

  test('expect failure when --childPackage AND --source are specified', async () => {
    const childPackage = 'module-a';
    const source = 'src';

    await expect(
      async () =>
        await runBin(
          'move',
          ['--childPackage', `${childPackage}`, '--basePath', project.baseDir, '--source', source],
          {
            cwd: project.baseDir,
          }
        )
    ).rejects.toThrowError(`--childPackage AND --source are specified, please specify only one`);
  });

  test('expect failure when neither --childPackage NOR --source are specified', async () => {
    await expect(
      async () =>
        await runBin('move', ['--basePath', project.baseDir], {
          cwd: project.baseDir,
        })
    ).rejects.toThrowError(`you must specify a flag, either --childPackage OR --source`);
  });
});
