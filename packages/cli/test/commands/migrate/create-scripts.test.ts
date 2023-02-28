import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync } from 'fs-extra';

import { createScriptsTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, listrTaskRunner } from '../../test-helpers';

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

  test('add lint:tsc in package.json', async () => {
    const tasks = [await createScriptsTask(basePath)];
    await listrTaskRunner(tasks);

    const packageJson = readJSONSync(resolve(basePath, 'package.json'));
    expect(packageJson.scripts['lint:tsc']).toBe('tsc --noEmit');

    expect(output).matchSnapshot();
  });
});
