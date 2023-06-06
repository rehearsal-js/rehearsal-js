import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { getEmberProject } from '@rehearsal/test-support';
import {
  listrTaskRunner,
  cleanOutput,
  createOutputStream,
  prepareProject,
} from '../../test-helpers/index.js';
import { graphOrderTask } from '../../../src/commands/graph/tasks/graphOrderTask.js';
import type { CommandContext } from '../../../src/types.js';
import type { DirJSON } from 'fixturify';
import type { Project } from 'fixturify-project';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: graphOrderTask', () => {
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
    project = prepareProject('base_js_app');
    outputStream = createOutputStream();
    // tests below assume creation
    delete project.files['tsconfig.json'];
    await project.write();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    project.dispose();
  });

  test('can output a graph.json file', async () => {
    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: false,
      deps: true,
      ignore: [],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(project.baseDir, options)]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: 'base_js_app',
        external: false,
        files: [
          {
            name: './src/bizz.ts',
            hasTypes: true,
            edges: [],
          },
          {
            name: './src/index.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'base_js_app',
                hasTypes: true,
                missing: false,
                fileName: './src/bizz.ts',
              },
            ],
          },
          {
            name: './src/foo/baz.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './src/foo/biz.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './src/foo/e.gjs',
            hasTypes: false,
            edges: [],
          },
          {
            name: './src/foo/buz/biz.js',
            hasTypes: false,
            edges: [],
          },
        ],
      },
      {
        name: 'module-a',
        external: false,
        files: [
          {
            name: './module-a/src/baz.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './module-a/src/foo.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'module-a',
                hasTypes: false,
                fileName: './module-a/src/baz.js',
              },
            ],
          },
          {
            name: './module-a/src/index.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'module-a',
                hasTypes: false,
                missing: false,
                fileName: './module-a/src/foo.js',
              },
            ],
          },
        ],
      },
      {
        name: 'module-b',
        external: false,
        files: [
          {
            name: './module-b/src/tires.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './module-b/src/car.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'module-b',
                hasTypes: false,
                missing: false,
                fileName: './module-b/src/tires.js',
              },
            ],
          },
          {
            name: './module-b/src/index.js',
            hasTypes: false,
            edges: [],
          },
        ],
      },
    ]);
  });

  test('can output for sub-package', async () => {
    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: false,
      deps: true,
      ignore: [],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(`${project.baseDir}/module-a`, options)]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: 'module-a',
        external: false,
        files: [
          {
            name: './module-a/src/baz.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './module-a/src/foo.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'module-a',
                hasTypes: false,
                missing: false,
                fileName: './module-a/src/baz.js',
              },
            ],
          },
          {
            name: './module-a/src/index.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'module-a',
                hasTypes: false,
                missing: false,
                fileName: './module-a/src/foo.js',
              },
            ],
          },
        ],
      },
    ]);
  });

  test('can print graph order to stdout', async () => {
    const options = {
      rootPath: project.baseDir,
      devDeps: false,
      deps: true,
      ignore: [],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(project.baseDir, options)]);

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('can print graph order to stdout in an ember app with in-repo addons', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await project.write();

    const options = {
      rootPath: project.baseDir,
      devDeps: false,
      deps: true,
      ignore: [],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-addon/addon', options),
    ]);

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('subsets ember graph when entered via addon', async () => {
    project = addWorkspaces(getEmberProject('app-with-in-repo-addon'));

    project.mergeFiles(someOtherAddons(project));

    await project.write();

    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: false,
      deps: true,
      ignore: [],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: '@company/some-other-addon',
        external: false,
        files: [
          {
            name: './lib/some-other-addon/addon/index.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'some-addon',
                hasTypes: false,
                missing: false,
                fileName: './lib/some-addon/addon/components/greet.js',
              },
            ],
          },
          {
            name: './lib/some-other-addon/addon/thing.ts',
            hasTypes: true,
            edges: [],
          },
        ],
      },
      {
        name: 'some-addon',
        external: false,
        files: [
          {
            name: './lib/some-addon/addon/utils/thing.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './lib/some-addon/addon/components/greet.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'some-addon',
                hasTypes: false,
                missing: false,
                fileName: './lib/some-addon/addon/utils/thing.js',
              },
            ],
          },
        ],
      },
    ]);
  });

  test('can ignore packages from graph', async () => {
    project = addWorkspaces(getEmberProject('app-with-in-repo-addon'));

    project.mergeFiles(someOtherAddons(project));

    await project.write();

    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: true,
      deps: true,
      ignore: ['./lib/some-addon/*'],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: '@company/some-other-addon',
        external: false,
        files: [
          {
            name: './lib/some-other-addon/addon/index.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './lib/some-other-addon/addon/thing.ts',
            hasTypes: true,
            edges: [],
          },
        ],
      },
    ]);
  });

  test('can ignore a glob from the from graph', async () => {
    project = addWorkspaces(getEmberProject('app-with-in-repo-addon'));

    project.mergeFiles(someOtherAddons(project));

    await project.write();

    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: true,
      deps: true,
      ignore: ['lib/some-addon/addon/utils/*.js'],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: '@company/some-other-addon',
        external: false,
        files: [
          {
            name: './lib/some-other-addon/addon/index.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'some-addon',
                hasTypes: false,
                missing: false,
                fileName: './lib/some-addon/addon/components/greet.js',
              },
            ],
          },
          {
            name: './lib/some-other-addon/addon/thing.ts',
            hasTypes: true,
            edges: [],
          },
        ],
      },
      {
        name: 'some-addon',
        external: false,
        files: [
          {
            name: './lib/some-addon/addon/components/greet.js',
            hasTypes: false,
            edges: [],
          },
        ],
      },
    ]);
  });

  test('can ignore all js files', async () => {
    project = addWorkspaces(getEmberProject('app-with-in-repo-addon'));

    project.mergeFiles(someOtherAddons(project));

    await project.write();

    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: true,
      deps: true,
      ignore: ['**/*.js'],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: '@company/some-other-addon',
        external: false,
        files: [
          {
            name: './lib/some-other-addon/addon/thing.ts',
            hasTypes: true,
            edges: [],
          },
        ],
      },
    ]);
  });

  test('can ignore a single file from the from graph', async () => {
    project = addWorkspaces(getEmberProject('app-with-in-repo-addon'));

    project.mergeFiles(someOtherAddons(project));

    await project.write();

    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: true,
      deps: true,
      ignore: ['lib/some-addon/addon/utils/thing.js'],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: '@company/some-other-addon',
        external: false,
        files: [
          {
            name: './lib/some-other-addon/addon/index.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'some-addon',
                hasTypes: false,
                missing: false,
                fileName: './lib/some-addon/addon/components/greet.js',
              },
            ],
          },
          {
            name: './lib/some-other-addon/addon/thing.ts',
            hasTypes: true,
            edges: [],
          },
        ],
      },
      {
        name: 'some-addon',
        external: false,
        files: [
          {
            name: './lib/some-addon/addon/components/greet.js',
            hasTypes: false,
            edges: [],
          },
        ],
      },
    ]);
  });

  test('can print graph order to a file for an ember app with in-repo addons', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await project.write();

    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: false,
      deps: true,
      ignore: [],
      outputGraphToConsole: true,
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(project.baseDir, options)]);

    expect(existsSync(options.output)).toBe(true);

    expect(JSON.parse(await readFile(options.output, 'utf-8'))).toMatchObject([
      {
        name: 'app-template',
        external: false,
        files: [
          {
            name: './app/app.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './app/router.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './config/environment.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './config/targets.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './tests/test-helper.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './app/components/salutation.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './app/services/locale.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './tests/acceptance/index-test.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './tests/unit/services/locale-test.js',
            hasTypes: false,
            edges: [],
          },
        ],
      },
      {
        name: 'some-addon',
        external: false,
        files: [
          {
            name: './lib/some-addon/index.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './lib/some-addon/addon/utils/thing.js',
            hasTypes: false,
            edges: [],
          },
          {
            name: './lib/some-addon/addon/components/greet.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'some-addon',
                hasTypes: false,
                missing: false,
                fileName: './lib/some-addon/addon/utils/thing.js',
              },
            ],
          },
          {
            name: './lib/some-addon/app/components/greet.js',
            hasTypes: false,
            edges: [
              {
                packageName: 'some-addon',
                hasTypes: false,
                missing: false,
                fileName: './lib/some-addon/addon/components/greet.js',
              },
            ],
          },
        ],
      },
    ]);
  });
});

function someOtherAddons(project: Project): DirJSON {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  project.pkg['ember-addon'].paths.push('lib/some-other-addon');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  project.pkg['ember-addon'].paths.push('lib/some-test-package');
  return {
    lib: {
      'some-test-package': {
        'addon-test-support': {
          'index.js': 'export const thing = "thing"',
        },
        'index.js': 'module.exports = { name: "some-test-package" }',
        'tsconfig.json': JSON.stringify({
          extends: '../../tsconfig.json',
          compilerOptions: {
            paths: {
              'some-test-package': ['./lib/some-test-package/addon-test-support'],
              'some-test-package/*': ['./lib/some-test-package/addon-test-support/*'],
            },
          },
        }),
        'package.json': JSON.stringify({ name: 'some-test-package', keywords: ['ember-addon'] }),
      },
      'some-other-addon': {
        addon: {
          'thing.ts': 'export function a(num: number): void {}',
          'index.js': 'import Greet from "some-addon/components/greet"',
        },
        'index.js': 'module.exports = { name: "some-other-addon" }',
        'tsconfig.json': JSON.stringify({
          extends: '../../tsconfig.json',
          compilerOptions: {
            paths: {
              'some-addon/*': ['./lib/some-addon/addon/*'],
            },
          },
        }),
        'package.json': JSON.stringify({
          name: '@company/some-other-addon',
          dependencies: { 'some-addon': '*' },
          devDependencies: { 'some-test-package': '*' },
          keywords: ['ember-addon'],
        }),
      },
    },
  };
}

function addWorkspaces(project: Project): Project {
  project.pkg.workspaces = ['./lib/*'];
  return project;
}
