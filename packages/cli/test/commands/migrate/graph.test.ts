import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { Listr } from 'listr2';
import { cleanOutput, createOutputStream, prepareProject } from '../../test-helpers/index.js';
import { graphOrderTask } from '../../../src/commands/graph/tasks/graphOrderTask.js';
import { PackageEntry } from '../../../src/commands/graph/tasks/graphWorker.js';
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
    const task = graphOrderTask(project.baseDir, join(project.baseDir, 'graph.json'));
    await new Listr([task]).run();

    expect(existsSync(join(project.baseDir, 'graph.json'))).toBe(true);

    const graph = JSON.parse(await readFile(join(project.baseDir, 'graph.json'), 'utf-8')) as {
      packages: PackageEntry[];
    };

    expect(graph.packages.length).toBe(1);
    expect(graph.packages[0].files).toMatchObject([
      'index.js',
      'module-a/index.js',
      'module-b/index.js',
    ]);
  });

  test('can print graph order to stdout', async () => {
    const task = graphOrderTask(project.baseDir);

    await new Listr([task]).run();

    expect(cleanOutput(output, project.baseDir)).toMatchSnapshot();
  });
});
