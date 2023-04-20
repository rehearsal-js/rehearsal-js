import { join } from 'node:path';
import { existsSync } from 'node:fs';
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

  test('can print graph order to stdout', async () => {
    const options = {
      basePath: project.baseDir,
    };

    await listrTaskRunner<GraphCommandContext>([graphOrderTask(options)]);

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });

  test('can print graph order to stdout in an ember app with in-repo addons', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await project.write();

    const options = {
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

  test('can print graph order to a file for an ember app with in-repo addons', async () => {
    project = getEmberProject('app-with-in-repo-addon');

    await project.write();

    const options = {
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
    expect(graph.packages[0].files).toMatchObject(['lib/some-addon/addon/components/greet.js']);

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
