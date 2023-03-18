import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cosmiconfigSync } from 'cosmiconfig';

import { prepareTmpDir } from '../../test-helpers/index.js';
import {
  createCustomLintConfig,
  createLintConfig,
  extendLintConfig,
  skipConfigThatExtends,
  skipCustomConfigThatExtends,
} from '../../test-helpers/config-lint-test-utils.js';

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
    await createLintConfig(basePath);
    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');
    expect(output).matchSnapshot();
  });

  test('extends .eslintrc.js if existed', async () => {
    const oldConfig = `
    module.exports = {extends: []};
  `;
    await extendLintConfig(oldConfig, basePath, '.eslintrc.js');

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default eslint-related config');

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const newConfig = require(resolve(basePath, '.eslintrc.js')) as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.js']);
  });

  test('skip if .eslintrc.js exists with valid extends', async () => {
    const oldConfig = `
    module.exports = {extends: ["./.rehearsal-eslintrc.js"]};
  `;
    await skipConfigThatExtends(oldConfig, basePath, '.eslintrc.js');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc if existed', async () => {
    const oldConfig = `
    {"extends": []}
  `;
    await extendLintConfig(oldConfig, basePath, '.eslintrc');

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
    const oldConfig = `
    {extends: ["./.rehearsal-eslintrc.js"]}
  `;
    await skipConfigThatExtends(oldConfig, basePath, '.eslintrc');

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.json if existed', async () => {
    const oldConfig = `
    {"extends": []}
  `;
    await extendLintConfig(oldConfig, basePath, '.eslintrc.json');

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
    const oldConfig = `
    {"extends": ["./.rehearsal-eslintrc.js"]}
  `;
    await skipConfigThatExtends(oldConfig, basePath, '.eslintrc.json');

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.yml if existed', async () => {
    const oldConfig = `
    extends: []
  `;
    await extendLintConfig(oldConfig, basePath, '.eslintrc.yml');

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
    const oldConfig = `
    extends: ["./.rehearsal-eslintrc.js"]
  `;
    await skipConfigThatExtends(oldConfig, basePath, '.eslintrc.yml');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.yaml if existed', async () => {
    const oldConfig = `
    extends: []
  `;
    await extendLintConfig(oldConfig, basePath, '.eslintrc.yaml');

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
    const oldConfig = `
    extends: ["./.rehearsal-eslintrc.js"]
  `;
    await skipConfigThatExtends(oldConfig, basePath, '.eslintrc.yaml');

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('run custom config command with user config provided', async () => {
    const customConfig = {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    };
    await createCustomLintConfig(basePath, customConfig);

    expect(readdirSync(basePath)).toContain('custom-lint-config-script');
    expect(output).toMatchSnapshot();
  });

  test('postLintSetup hook from user config', async () => {
    const customConfig = {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
          postLintSetup: { command: 'mv', args: ['custom-lint-config-script', 'foo'] },
        },
      },
    };

    await createCustomLintConfig(basePath, customConfig);

    expect(readdirSync(basePath)).toContain('foo');
    expect(readdirSync(basePath)).not.toContain('custom-lint-config-script');
    expect(output).toMatchSnapshot();
  });

  test('skip if custom config and .eslintrc.js exist', async () => {
    const customConfig = {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    };
    await skipCustomConfigThatExtends(basePath, customConfig);

    expect(readdirSync(basePath)).not.toContain('custom-lint-config-script');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });
});
