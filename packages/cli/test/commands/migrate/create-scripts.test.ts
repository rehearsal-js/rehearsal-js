import { resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra/esm';

import { createScriptsTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import type { PackageJson } from 'type-fest';

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

    const packageJson = JSON.parse(
      await fs.readFile(resolve(basePath, 'package.json'), 'utf-8')
    ) as PackageJson;

    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');

    expect(output).matchSnapshot();
  });

  test('replace if the script exists', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [createScriptsTask(options)];
    await listrTaskRunner(tasks);

    const packageJson = JSON.parse(
      await fs.readFile(resolve(basePath, 'package.json'), 'utf-8')
    ) as PackageJson;

    writeJSONSync(resolve(basePath, 'package.json'), {
      scripts: { 'lint:tsc': 'foo' },
      ...packageJson,
    });
    expect(packageJson.scripts?.['lint:tsc']).toBe('tsc --noEmit');

    expect(output).matchSnapshot();
  });
});
