import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { prepareProject } from '../../test-helpers/index.js';
import { preFlightCheck } from '../../../src/commands/fix/tasks/initialize-task.js';
import { getPreReqs } from '../../../src/prereqs.js';
import type { ProjectType } from '../../../src/types.js';
import type { Project } from 'fixturify-project';

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

describe('Fix: Init-Task', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('multi_packages');
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  for (const pt of ['base', 'ember', 'glimmer'] as ProjectType[]) {
    test(`preFlightCheck ${pt} works`, async () => {
      const projectType: ProjectType = pt;

      projectInit(project, projectType);

      await project.write();

      try {
        preFlightCheck(project.baseDir, projectType);
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });
  }

  test('preFlightCheck base - deps/devDeps compare', async () => {
    const projectType: ProjectType = 'base';

    projectInit(project, projectType);

    // remove from devDeps and add them to deps
    project.removeDevDependency('typescript');
    project.addDependency('typescript', '^5.0.0');

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  test('preFlightCheck base - expect failure tsconfig strict as false', async () => {
    const projectType: ProjectType = 'base';
    const prereqs = getPreReqs(projectType);
    project.files['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        strict: false,
        skipLibCheck: true,
      },
    });
    project.files['.eslintrc.json'] = JSON.stringify({
      ...prereqs.eslint,
    });

    // adds all the deps from the prereqs for the given `ProjectType`
    projectAddDevDeps(project, projectType);

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toMatchSnapshot();
    }
  });

  test('preFlightCheck ember - expect failure tsconfig glint missing', async () => {
    const projectType: ProjectType = 'ember';

    project.files['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: true,
      },
    });
    project.files['.eslintrc.json'] = JSON.stringify({
      parser: '@typescript-eslint/parser',
    });

    // adds all the deps from the prereqs for the given `ProjectType`
    projectAddDevDeps(project, projectType);

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toMatchSnapshot();
    }
  });

  test('preFlightCheck base - expect failure eslint parser invalid', async () => {
    const projectType: ProjectType = 'base';

    project.files['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: true,
      },
    });
    project.files['.eslintrc.json'] = JSON.stringify({
      parser: '@fake/parser',
    });

    // adds all the deps from the prereqs for the given `ProjectType`
    projectAddDevDeps(project, projectType);

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toMatchSnapshot();
    }
  });

  test('preFlightCheck base - expect failure deps missing', async () => {
    const projectType: ProjectType = 'base';

    projectInit(project, projectType);

    project.removeDevDependency('typescript');
    project.removeDevDependency('prettier');
    project.removeDevDependency('eslint');

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toMatchSnapshot();
    }
  });
});
