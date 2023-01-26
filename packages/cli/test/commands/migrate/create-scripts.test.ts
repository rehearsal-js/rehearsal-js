import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync } from 'fs-extra';

import { createScriptsTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers';

describe('Task: create-scripts', async () => {
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

  test('add build:tsc and lint:tsc in package.json', async () => {
    const options = createMigrateOptions(basePath);
    const tasks = [await createScriptsTask(options)];
    await listrTaskRunner(tasks);

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    expect(packageJson.scripts['build:tsc']).toBe('tsc -b');
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');

    expect(output).matchSnapshot();
  });
});
