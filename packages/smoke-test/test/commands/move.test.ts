import { afterEach, describe, expect, test } from 'vitest';
import { cleanOutput, prepareProject, rehearsalCLI } from '../test-helpers/index.js';

import type { Project } from 'fixturify-project';

describe('move command', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('base_js_app', async () => {
    project = prepareProject('base_js_app');
    await project.write();

    const result = await rehearsalCLI(
      'move',
      '.',
      ['--rootPath', project.baseDir, '--ignore', 'vitest.config.ts,docs/**'],
      {
        cwd: project.baseDir,
      }
    );
    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
  });

  test('ember_js_app_4.11', async () => {
    project = prepareProject('ember_js_app');
    await project.write();

    const result = await rehearsalCLI('move', 'app', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
  });

  test('glimmerx_js_app', async () => {
    project = prepareProject('glimmerx_js_app');
    await project.write();

    const result = await rehearsalCLI('move', 'src', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
  });
});
