import { resolve, join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { cleanOutput, prepareProject, rehearsalCLI, expectFile } from '../test-helpers/index.js';
import type { Project } from 'fixturify-project';

describe('fix command', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('base_ts_app', async () => {
    project = prepareProject('base_ts_app');
    await project.write();
    const projectRoot = resolve(project.baseDir);

    const result = await rehearsalCLI(
      'fix',
      '.',
      ['--rootPath', project.baseDir, '--graph', '--deps', '--ignore', 'vitest.config.ts,test/**'],
      {
        cwd: project.baseDir,
      }
    );
    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    // validate type inference
    expectFile(join(projectRoot, 'src/gen-random-grid.ts')).toMatchSnapshot();
    expectFile(join(projectRoot, 'src/apply-rules.ts')).toMatchSnapshot();
    expectFile(join(projectRoot, 'src/get-live-neighbor-count.ts')).toMatchSnapshot();
    expectFile(join(projectRoot, 'src/app.ts')).toMatchSnapshot();
  });

  test('ember_js_app_4.11', async () => {
    project = prepareProject('ember_js_app');
    await project.write();
    const projectRoot = resolve(project.baseDir);

    // move to .ts
    await rehearsalCLI('move', 'app', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
    // infer types and TODOs
    const result = await rehearsalCLI(
      'fix',
      '.',
      ['--rootPath', project.baseDir, '--graph', '--deps', '--ignore', '*.d.ts'],
      {
        cwd: project.baseDir,
      }
    );

    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
    expectFile(join(projectRoot, 'app/components/map.ts')).toMatchSnapshot();
    expectFile(join(projectRoot, 'app/components/share-button.ts')).toMatchSnapshot();
    expectFile(join(projectRoot, 'app/models/rental.ts')).toMatchSnapshot();
    expectFile(join(projectRoot, 'app/components/hello-world.gts')).toMatchSnapshot();
  });

  test('glimmerx_js_app', async () => {
    project = prepareProject('glimmerx_js_app');
    await project.write();

    await rehearsalCLI('move', 'src', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    const result = await rehearsalCLI('fix', 'src', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
    expect(cleanOutput(result.stdout, project.baseDir)).toMatchSnapshot();
  });
});