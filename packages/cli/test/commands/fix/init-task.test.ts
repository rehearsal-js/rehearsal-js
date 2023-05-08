import { resolve } from 'node:path';
import { Project } from 'fixturify-project';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import {
  prepareProject,
  listrTaskRunner,
  cleanOutput,
  createOutputStream,
} from '../../test-helpers/index.js';
import { preFlightCheck } from '../../../src/commands/fix/tasks/initialize-task.js';
import { getPreReqs } from '../../../src/prereqs.js';
import { initTask } from '../../../src/commands/fix/tasks/index.js';

import type { ProjectType, CommandContext, FixCommandOptions } from '../../../src/types.js';
import type { Readable } from 'node:stream';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

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
    parser: prereqs.eslint,
  });
}

describe('Fix: Init-Task', () => {
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

  test(`preFlightCheck "base-ts" works`, async () => {
    const projectType: ProjectType = 'base-ts';

    projectInit(project, projectType);
    // support "latest" as a version
    project.addDevDependency('typescript', 'latest')

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeUndefined();
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test(`preFlightCheck "ember" works`, async () => {
    const projectType: ProjectType = 'ember';

    projectInit(project, projectType);

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeUndefined();
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test(`preFlightCheck "glimmer" works`, async () => {
    const projectType: ProjectType = 'glimmer';

    projectInit(project, projectType);

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeUndefined();
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('preFlightCheck "base-ts" - deps/devDeps compare', async () => {
    const projectType: ProjectType = 'base-ts';

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

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('preFlightCheck "base-ts" - expect failure tsconfig strict as false', async () => {
    const projectType: ProjectType = 'base-ts';
    const prereqs = getPreReqs(projectType);
    project.files['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        strict: false,
        skipLibCheck: true,
      },
    });
    project.files['.eslintrc.json'] = JSON.stringify({
      parser: prereqs.eslint,
    });

    // adds all the deps from the prereqs for the given `ProjectType`
    projectAddDevDeps(project, projectType);

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(cleanOutput(error.message, project.baseDir)).toMatchSnapshot();
      }
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('preFlightCheck "ember" - expect failure tsconfig glint missing', async () => {
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
      if (error instanceof Error) {
        expect(cleanOutput(error.message, project.baseDir)).toMatchSnapshot();
      }
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('preFlightCheck "base-ts" - expect failure eslint parser invalid', async () => {
    const projectType: ProjectType = 'base-ts';

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
      if (error instanceof Error) {
        expect(cleanOutput(error.message, project.baseDir)).toMatchSnapshot();
      }
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('preFlightCheck "base-ts" - expect failure deps missing', async () => {
    const projectType: ProjectType = 'base-ts';

    projectInit(project, projectType);

    project.removeDevDependency('typescript');
    project.removeDevDependency('prettier');
    project.removeDevDependency('eslint');

    await project.write();

    try {
      preFlightCheck(project.baseDir, projectType);
    } catch (error) {
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(cleanOutput(error.message, project.baseDir)).toMatchSnapshot();
      }
    }

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test(`validate initTask "base-ts" works with src arg`, async () => {
    const projectType: ProjectType = 'base-ts';

    project = Project.fromDir(resolve(__dirname, '../../fixtures/base_ts_app'), {
      linkDeps: true,
      linkDevDeps: true,
    });

    projectInit(project, projectType);
    await project.write();

    const src = resolve(project.baseDir, 'src');
    const options: FixCommandOptions = {
      rootPath: project.baseDir,
      format: ['sarif'],
      ignore: [],
    };
    const tasks = [initTask(src, options)];
    const ctx = await listrTaskRunner<CommandContext>(tasks);
    const sanitizedAbsPaths = ctx.orderedFiles?.map((path) => {
      return cleanOutput(path, project.baseDir);
    });

    expect(sanitizedAbsPaths).toMatchSnapshot();
    expect(ctx.orderedFiles.map((file) => file.replace(project.baseDir, ''))).toMatchSnapshot();
    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });
});
