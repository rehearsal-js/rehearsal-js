import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { getEmberProject } from '@rehearsal/test-support';
import { getPreReqs } from '../../../src/prereqs.js';
import { runBin, cleanOutput } from '../../test-helpers/index.js';
import type { ProjectType } from '../../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function expectFile(filePath: string): Vi.Assertion<string> {
  return expect(readFileSync(filePath, 'utf-8'));
}

describe('Command: fix "base_ts_app" fixture', () => {
  let project: Project;

  beforeEach(async () => {
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
  });

  test('fix directory with src arg', async () => {
    const sourceDir = 'src';
    const src = resolve(project.baseDir, sourceDir);

    const result = await runBin('fix', [src], ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();

    for (const filepath of Object.keys(project.files[sourceDir] as string)) {
      expectFile(resolve(project.baseDir, sourceDir, filepath)).toMatchSnapshot();
    }
  });
});

describe('Command: fix ember-ts-app fixture', () => {
  let project: Project;

  beforeEach(async () => {
    project = getEmberProject('ts-app');

    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('fix package with src arg and graph', async () => {
    const src = resolve(project.baseDir);
    const flags = ['--graph', '--deps', '--rootPath', project.baseDir];

    const result = await runBin('fix', [src], flags, {
      cwd: project.baseDir,
    });

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
  });
});
