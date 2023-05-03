import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { getEmberProject } from '@rehearsal/test-support';
import {
  listrTaskRunner,
  KEYS,
  cleanOutput,
  createOutputStream,
  prepareProject,
  sendKey,
} from '../../test-helpers/index.js';
import { graphOrderTask } from '../../../src/commands/graph/tasks/graphOrderTask.js';
import type { PackageEntry, GraphCommandContext } from '../../../src/types.js';
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
    project = prepareProject('multi_packages');
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
      srcDir: project.baseDir,
      basePath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
    };

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as {
      packages: PackageEntry[];
    };

    expect(graph.packages.length).toBe(1);
    expect(graph.packages[0].files).toMatchObject([
      'index.js',
      'module-a/index.js',
      'module-a/src/baz.js',
      'module-a/src/foo.js',
      'module-b/index.js',
      'module-b/src/tires.js',
      'module-b/src/car.js',
      'src/foo/baz.js',
      'src/foo/biz.js',
      'src/foo/buz/biz.js',
      'src/index.js',
    ]);
  });

  test('can output to stdout for sub-package', async () => {
    const options = {
      srcDir: `${project.baseDir}/module-a`,
      basePath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
    };

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as {
      packages: PackageEntry[];
    };

    expect(graph.packages.length).toBe(1);
    expect(graph.packages[0].files).toMatchObject([
      'module-a/index.js',
      'module-a/src/baz.js',
      'module-a/src/foo.js',
    ]);
  });

  test('can print graph order to stdout', async () => {
    const options = {
      srcDir: project.baseDir,
      basePath: project.baseDir,
    };

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('can print graph order to stdout in an ember app with in-repo addons', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await project.write();

    const options = {
      srcDir: project.baseDir,
      basePath: project.baseDir,
    };

    outputStream.on('data', (line: string) => {
      if (line.includes('We found the following packages.')) {
        sendKey(KEYS.ENTER);
      }
    });

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test.only('subsets ember graph when entered via addon', async () => {
    project = addWorkspaces(getEmberProject('app-with-in-repo-addon'));

    project.mergeFiles(someOtherAddon(project));

    await project.write();

    const options = {
      srcDir: project.baseDir + '/lib/some-other-addon',
      basePath: project.baseDir,
      output: 'graph.json',
    };

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as {
      packages: PackageEntry[];
    };

    expect(graph.packages.length).toBe(2);
  });

  test('can print graph order to a file for an ember app with in-repo addons', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await project.write();

    const options = {
      basePath: project.baseDir,
      srcDir: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
    };

    outputStream.on('data', (line: string) => {
      if (line.includes('We found the following packages.')) {
        sendKey(KEYS.ENTER);
      }
    });

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as {
      packages: PackageEntry[];
    };

    expect(graph.packages.length).toBe(2);
    expect(graph.packages[0].files).toMatchObject([
      'lib/some-addon/addon/utils/thing.js',
      'lib/some-addon/addon/components/greet.js',
    ]);

    expect(graph.packages[1].files).toMatchObject([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });

  test('can print graph order to a file for an ember app with in-repo addons when the module name and package name differ', async () => {
    project = getEmberProject('app-with-in-repo-addon', true);

    await project.write();

    expect(
      readFileSync(join(project.baseDir, 'lib', 'some-addon', 'index.js'), 'utf-8').includes(
        'name: "some-addon"'
      )
    ).toBe(true);

    expect(
      readFileSync(join(project.baseDir, 'lib', 'some-addon', 'package.json'), 'utf-8').includes(
        '"name": "@company/some-addon"'
      )
    ).toBe(true);

    const options = {
      srcDir: project.baseDir,
      basePath: project.baseDir,
      output: join(project.baseDir, 'graph.json'),
    };

    outputStream.on('data', (line: string) => {
      if (line.includes('We found the following packages.')) {
        sendKey(KEYS.ENTER);
      }
    });

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(existsSync(options.output)).toBe(true);

    const graph = JSON.parse(await readFile(options.output, 'utf-8')) as {
      packages: PackageEntry[];
    };

    expect(graph.packages.length).toBe(2);
    expect(graph.packages[0].files).toMatchObject([
      'lib/some-addon/addon/utils/thing.js',
      'lib/some-addon/addon/components/greet.js',
    ]);

    expect(graph.packages[1].files).toMatchObject([
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
      'tests/acceptance/index-test.js',
      'tests/test-helper.js',
      'tests/unit/services/locale-test.js',
    ]);
  });
});

function someOtherAddon(project: Project) {
  project.pkg['ember-addon'].paths.push('lib/some-other-addon');
  return {
    lib: {
      'some-other-addon': {
        addon: {
          'index.js': 'import Greet from "some-addon/components/greet"',
        },
        'index.js': 'module.exports = { name: "some-other-addon" }',
        'package.json': `{ "name": "@company/some-other-addon", "dependencies": { "some-addon": "*" }, "keywords": ["ember-addon"] }`,
      },
    },
  };
}

function addWorkspaces(project: Project): Project {
  project.pkg.workspaces = ['./lib/*'];
  return project;
}
