import { beforeEach, describe, expect, test, vi } from 'vitest';

import { initTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, ListrTaskRunner } from '../../test-helpers';
import { Formats } from '../../../src/types';

describe('Task: initialization', async () => {
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

  test('able to get files that will be migrated', async () => {
    const options = {
      basePath,
      entrypoint: '',
      format: ['sarif' as Formats],
      outputPath: '.rehearsal',
      verbose: false,
      userConfig: undefined,
      interactive: undefined,
      dryRun: false,
    };
    const tasks = [await initTask(options)];
    const runner = new ListrTaskRunner(tasks);
    const ctx = await runner.run();

    expect(ctx.targetPackagePath).toBe(`${basePath}`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${basePath}/index.js`);
    expect(ctx.sourceFilesWithAbsolutePath).toContain(`${basePath}/foo.js`);
    expect(ctx.sourceFilesWithRelativePath).matchSnapshot();

    expect(output).matchSnapshot();
  });
});
