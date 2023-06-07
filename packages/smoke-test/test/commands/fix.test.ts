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
      ['--rootPath', project.baseDir, '--ignore', 'vitest.config.ts,test/**'],
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

  test('base_ts_app (file only)', async () => {
    project = prepareProject('base_ts_app');
    await project.write();
    const projectRoot = resolve(project.baseDir);

    const result = await rehearsalCLI('fix', './src/app.ts', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
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
    await rehearsalCLI('move', './app', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });
    // infer types and TODOs
    const result = await rehearsalCLI('fix', './app', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

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

  test.todo('should not fail if file reference out of package bondary', async () => {
    project = prepareProject('base_ts_app');

    project.mergeFiles({
      'module-a': {
        'tsconfig.json': `
        {
          "include": ['src/**/*.ts'],
          "compilerOptions": {
            "paths": {
              "module-b/*": ["../module-b/dist/src/*"]
            }
          }
        }
        `,
        src: {
          'checker.js': `
            import { IS_BROWSER } from "module-b/is-browser";
            console.log(IS_BROWSER);
          `,
        },
      },
      'module-b': {
        'package.json': `
        {
          "name": "module-b",
          "version": "1.0.0",
          "main": "index.js",
          "license": "MIT",
          "dependencies": {
            "path": "*"
          },
          "exports": {
            ".": {
              "types": "./dist/src/index.d.ts",
              "import": "./dist/src/index.js"
            },
            "./*": "./dist/src/*"
          },
          "main": "dist/src/index.js",
          "types": "dist/src/index.d.ts",
          "files": [
            "dist"
          ],
          "packageManager": "pnpm@7.12.1"
        }
        `,
        'tsconfig.json': `{ include: ['src']}`,
        src: {
          'is-browser.ts': `
          const IS_BROWSER = true;
          export default IS_BROWSER;
          `,
        },
        dist: {
          src: {
            'is-browser.d.ts': '',
            'is-browser.js': `
              const IS_BROWSER = true;
              export default IS_BROWSER;
            `,
          },
        },
      },
    });
    //
    await project.write();

    // move to .ts
    await rehearsalCLI('move', './module-a', ['--rootPath', project.baseDir], {
      cwd: project.baseDir,
    });

    const result = await rehearsalCLI(
      'fix',
      './module-a',
      ['--graph', '--rootPath', project.baseDir, '--ignore', 'vitest.config.ts,test/**'],
      {
        cwd: project.baseDir,
      }
    );

    expect(cleanOutput(result.stderr, project.baseDir)).not.contains(
      '[FAILED] Could not find source file: <tmp-path>/module-b/dist/src/is-browser.js'
    );
    expect(false).toBe(true);
  });
});
