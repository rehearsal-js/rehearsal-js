import { resolve } from 'node:path';
import { readdirSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync } from 'fs-extra/esm';
import { cosmiconfigSync } from 'cosmiconfig';

import { depInstallTask, lintConfigTask } from '../../../src/commands/migrate/tasks/index.js';
import { prepareTmpDir, listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('Task: config-lint', () => {
  let basePath = '';
  let output = '';
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  let explorerSync;

  beforeEach(() => {
    output = '';
    basePath = prepareTmpDir('initialization');
  });

  afterEach(() => {
    vi.clearAllMocks();
    explorerSync = null;
  });

  test('create .eslintrc.js if not existed', async () => {
    const options = createMigrateOptions(basePath);
    // lint task requires dependencies installed first
    const tasks = [depInstallTask(options), lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');
    expect(output).matchSnapshot();
  });

  test('extends .eslintrc.js if existed', async () => {
    // prepare old .eslintrc.js
    const oldConfig = `
    module.exports = {extends: []};
  `;
    writeFileSync(resolve(basePath, '.eslintrc.js'), oldConfig);

    const options = createMigrateOptions(basePath);
    // lint task requires dependencies installed first
    const tasks = [depInstallTask(options), lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default eslint-related config');

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const newConfig = require(resolve(basePath, '.eslintrc.js')) as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.js']);
  });

  test('skip if .eslintrc.js exists with valid extends', async () => {
    // prepare old .eslintrc.js and .rehearsal-eslintrc.js
    const oldConfig = `
    module.exports = {extends: ["./.rehearsal-eslintrc.js"]};
  `;
    writeFileSync(resolve(basePath, '.eslintrc.js'), oldConfig);
    writeFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), '');

    const options = createMigrateOptions(basePath);
    // this validation does not need depInstallTask
    const tasks = [lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc if existed', async () => {
    const oldConfig = `
    {"extends": []}
  `;
    writeFileSync(resolve(basePath, '.eslintrc'), oldConfig);

    const options = createMigrateOptions(basePath);
    const tasks = [depInstallTask(options), lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(readdirSync(basePath)).toContain('.eslintrc');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(basePath, '.eslintrc'));
    const newConfig = loaded?.config as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc']);
  });

  test('skip if .eslintrc exists with valid extends', async () => {
    // prepare old .eslintrc and .rehearsal-eslintrc.js
    const oldConfig = `
    {extends: ["./.rehearsal-eslintrc.js"]}
  `;
    writeFileSync(resolve(basePath, '.eslintrc'), oldConfig);
    writeFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), '');

    const options = createMigrateOptions(basePath);
    // this validation does not need depInstallTask
    const tasks = [lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.json if existed', async () => {
    const oldConfig = `
    {"extends": []}
  `;
    writeFileSync(resolve(basePath, '.eslintrc.json'), oldConfig);

    const options = createMigrateOptions(basePath);
    const tasks = [depInstallTask(options), lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(readdirSync(basePath)).toContain('.eslintrc.json');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.json');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(basePath, '.eslintrc.json'));
    const newConfig = loaded?.config as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.json']);
  });

  test('skip if .eslintrc.json exists with valid extends', async () => {
    // prepare old .eslintrc.json and .rehearsal-eslintrc.js
    const oldConfig = `
    {"extends": ["./.rehearsal-eslintrc.js"]}
  `;
    writeFileSync(resolve(basePath, '.eslintrc.json'), oldConfig);
    writeFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), '');

    const options = createMigrateOptions(basePath);
    // this validation does not need depInstallTask
    const tasks = [lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.yml if existed', async () => {
    const oldConfig = `
    extends: []
  `;
    writeFileSync(resolve(basePath, '.eslintrc.yml'), oldConfig);

    const options = createMigrateOptions(basePath);
    const tasks = [depInstallTask(options), lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(readdirSync(basePath)).toContain('.eslintrc.yml');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.yml');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(basePath, '.eslintrc.yml'));
    const config = loaded?.config as { extends: string[] };

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    expect(config.extends).toStrictEqual(['./.rehearsal-eslintrc.yml']);
  });

  test('skip if .eslintrc.yml exists with valid extends', async () => {
    // prepare old .eslintrc.yml and .rehearsal-eslintrc.js
    const oldConfig = `
    extends: ["./.rehearsal-eslintrc.js"]
  `;
    writeFileSync(resolve(basePath, '.eslintrc.yml'), oldConfig);
    writeFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), '');

    const options = createMigrateOptions(basePath);
    // this validation does not need depInstallTask
    const tasks = [lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.yaml if existed', async () => {
    const oldConfig = `
    extends: []
  `;
    writeFileSync(resolve(basePath, '.eslintrc.yaml'), oldConfig);

    const options = createMigrateOptions(basePath);
    const tasks = [depInstallTask(options), lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(readdirSync(basePath)).toContain('.eslintrc.yaml');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.yaml');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(basePath, '.eslintrc.yaml'));
    const config = loaded?.config as { extends: string[] };

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    expect(config.extends).toStrictEqual(['./.rehearsal-eslintrc.yaml']);
  });

  test('skip if .eslintrc.yaml exists with valid extends', async () => {
    // prepare old .eslintrc.yaml and .rehearsal-eslintrc.js
    const oldConfig = `
    extends: ["./.rehearsal-eslintrc.js"]
  `;
    writeFileSync(resolve(basePath, '.eslintrc.yaml'), oldConfig);
    writeFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), '');

    const options = createMigrateOptions(basePath);
    // this validation does not need depInstallTask
    const tasks = [lintConfigTask(options)];
    await listrTaskRunner(tasks);

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('run custom config command with user config provided', async () => {
    createUserConfig(basePath, {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const tasks = [depInstallTask(options), lintConfigTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    // This proves the custom command works
    expect(readdirSync(basePath)).toContain('custom-lint-config-script');
    expect(output).toMatchSnapshot();
  });

  test('postLintSetup hook from user config', async () => {
    createUserConfig(basePath, {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
          postLintSetup: { command: 'mv', args: ['custom-lint-config-script', 'foo'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const tasks = [depInstallTask(options), lintConfigTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    // This proves the custom command and hook works
    expect(readdirSync(basePath)).toContain('foo');
    expect(readdirSync(basePath)).not.toContain('custom-lint-config-script');
    expect(output).toMatchSnapshot();
  });

  test('skip if custom config and .eslintrc.js exist', async () => {
    // prepare old .eslintrc.js
    const oldConfig = `
    module.exports = {extends: ["./.rehearsal-eslintrc.js"]};
  `;
    writeFileSync(resolve(basePath, '.eslintrc.js'), oldConfig);

    createUserConfig(basePath, {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const tasks = [lintConfigTask(options, { userConfig })];
    await listrTaskRunner(tasks);

    // This proves the custom command works
    expect(readdirSync(basePath)).not.toContain('custom-lint-config-script');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });
});
