import { resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra/esm';

import { PackageJson } from '@rehearsal/utils';
import { createScriptsTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';

describe('Task: create-scripts', () => {
  let basePath = '';
  let output = '';
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  beforeEach(() => {
    output = '';
    basePath = prepareTmpDir('basic');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('add lint:tsc in package.json', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [createScriptsTask(options)];
    await listrTaskRunner(tasks);

    const packageJson = PackageJson.parse(
      JSON.parse(await fs.readFile(resolve(basePath, 'package.json'), 'utf-8'))
    );
    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');

    expect(output).matchSnapshot();
  });

  test('replace if the script exists', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [createScriptsTask(options)];
    await listrTaskRunner(tasks);

    const packageJson = PackageJson.parse(
      JSON.parse(await fs.readFile(resolve(basePath, 'package.json'), 'utf-8'))
    );
    writeJSONSync(resolve(basePath, 'package.json'), {
      scripts: { 'lint:tsc': 'foo' },
      ...packageJson,
    });
    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');

    expect(output).matchSnapshot();
  });
});
