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
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(project.baseDir, options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './src/bizz.ts',
      './src/index.js',
      './src/foo/baz.js',
      './src/foo/biz.js',
      './src/foo/e.gjs',
      './src/foo/buz/biz.js',
      './module-a/src/baz.js',
      './module-a/src/foo.js',
      './module-a/src/index.js',
      './module-b/src/tires.js',
      './module-b/src/car.js',
      './module-b/src/index.js',
    ]);
  });

  test('can output to stdout for sub-package', async () => {
    const options = {
      rootPath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
      devDeps: false,
      deps: true,
      ignore: [],
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(`${project.baseDir}/module-a`, options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './module-a/src/baz.js',
      './module-a/src/foo.js',
      './module-a/src/index.js',
    ]);
  });

  test('can print graph order to stdout', async () => {
    const options = {
      rootPath: project.baseDir,
      devDeps: false,
      deps: true,
      ignore: [],
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
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './lib/some-addon/addon/utils/thing.js',
      './lib/some-addon/addon/components/greet.js',
      './lib/some-other-addon/addon/index.js',
      './lib/some-other-addon/addon/thing.ts',
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
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './lib/some-other-addon/addon/index.js',
      './lib/some-other-addon/addon/thing.ts',
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
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './lib/some-addon/addon/components/greet.js',
      './lib/some-other-addon/addon/index.js',
      './lib/some-other-addon/addon/thing.ts',
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
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject(['./lib/some-other-addon/addon/thing.ts']);
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
    };

    await listrTaskRunner<CommandContext>([
      graphOrderTask(project.baseDir + '/lib/some-other-addon/addon', options),
    ]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './lib/some-addon/addon/components/greet.js',
      './lib/some-other-addon/addon/index.js',
      './lib/some-other-addon/addon/thing.ts',
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
    };

    await listrTaskRunner<CommandContext>([graphOrderTask(project.baseDir, options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as string[];

    expect(graph).toMatchObject([
      './app/app.js',
      './app/router.js',
      './config/environment.js',
      './config/targets.js',
      './tests/test-helper.js',
      './app/components/salutation.js',
      './app/services/locale.js',
      './tests/acceptance/index-test.js',
      './tests/unit/services/locale-test.js',
      './lib/some-addon/index.js',
      './lib/some-addon/addon/utils/thing.js',
      './lib/some-addon/addon/components/greet.js',
      './lib/some-addon/app/components/greet.js',
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
