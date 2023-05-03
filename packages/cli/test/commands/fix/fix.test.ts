import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
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

describe('Command: fix base_js_app fixture', () => {
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

    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test.only('fix file with --source flag', async () => {
    const sourceFilepath = 'src/gen-random-grid.ts';

    const result = await runBin(
      'fix',
      ['--source', `${resolve(project.baseDir, sourceFilepath)}`, '--basePath', project.baseDir],
      {
        cwd: project.baseDir,
      }
    );

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expect(project.files[sourceFilepath]).toMatchSnapshot();
  });
});
