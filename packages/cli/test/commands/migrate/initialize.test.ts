import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra/esm';
import { initTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';

function createUserConfig(
  basePath: string,
  config: CustomConfig,
  configName: string = 'rehearsal-config.json'
): void {
  const configPath = resolve(basePath, configName);
  writeJSONSync(configPath, config);
}

describe('Task: initialize', async () => {
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
    output = '';
    vi.clearAllMocks();
  });

  test('read and store default config in context', async () => {
    createUserConfig(basePath, {
      migrate: {
        include: ['test'],
        exclude: ['docs'],
        install: {
          dependencies: ['foo'],
          devDependencies: ['bat'],
        },
        setup: {
          ts: { command: 'ts-setup', args: ['ts-setup-arg'] },
          lint: { command: 'lint-setup', args: ['lint-setup-arg'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { ci: true });
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    expect.assertions(9);

    expect(ctx.userConfig).toBeTruthy();
    expect(ctx?.userConfig?.basePath).toBe(basePath);
    expect(ctx?.userConfig?.config).toMatchSnapshot();
    expect(ctx?.userConfig?.hasDependencies).toBeTruthy();
    expect(ctx?.userConfig?.hasLintSetup).toBeTruthy();
    expect(ctx?.userConfig?.hasTsSetup).toBeTruthy();
    expect(ctx?.userConfig?.include).toStrictEqual(['test']);
    expect(ctx?.userConfig?.exclude).toStrictEqual(['docs']);

    expect(output).matchSnapshot();
  });

  test('read and store config via --userConfig', async () => {
    createUserConfig(
      basePath,
      {
        migrate: {
          include: ['test'],
          exclude: ['docs'],
          install: {
            dependencies: ['foo'],
            devDependencies: ['bat'],
          },
          setup: {
            ts: { command: 'ts-setup', args: ['ts-setup-arg'] },
            lint: { command: 'lint-setup', args: ['lint-setup-arg'] },
          },
        },
      },
      'another-config.json'
    );

    const options = createMigrateOptions(basePath, { ci: true, userConfig: 'another-config.json' });
    const tasks = [await initTask(options)];
    const ctx = await listrTaskRunner(tasks);

    expect.assertions(9);

    expect(ctx.userConfig).toBeTruthy();
    expect(ctx?.userConfig?.basePath).toBe(basePath);
    expect(ctx?.userConfig?.config).toMatchSnapshot();
    expect(ctx?.userConfig?.hasDependencies).toBeTruthy();
    expect(ctx?.userConfig?.hasLintSetup).toBeTruthy();
    expect(ctx?.userConfig?.hasTsSetup).toBeTruthy();
    expect(ctx?.userConfig?.include).toStrictEqual(['test']);
    expect(ctx?.userConfig?.exclude).toStrictEqual(['docs']);

    expect(output).matchSnapshot();
  });
});
