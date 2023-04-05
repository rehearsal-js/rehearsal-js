import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cosmiconfigSync } from 'cosmiconfig';

import { prepareProject } from '../../test-helpers/index.js';
import {
  createCustomLintConfig,
  createLintConfig,
  extendLintConfig,
  skipConfigThatExtends,
  skipCustomConfigThatExtends,
} from '../../test-helpers/config-lint-test-utils.js';
import type { Project } from 'fixturify-project';

describe('Task: config-lint', () => {
  let project: Project;
  let output = '';
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  let explorerSync;

  beforeEach(async () => {
    output = '';
    project = prepareProject('initialization');
    await project.write();
  });

  afterEach(() => {
    vi.clearAllMocks();
    explorerSync = null;
    project.dispose();
  });

  test('create .eslintrc.js if not existed', async () => {
    await createLintConfig(project.baseDir);
    expect(readdirSync(project.baseDir)).toContain('.eslintrc.js');
    expect(readdirSync(project.baseDir)).toContain('.rehearsal-eslintrc.js');
    expect(output).matchSnapshot();
  });

  test('extends .eslintrc.js if existed', async () => {
    const oldConfig = `
    module.exports = {extends: []};
  `;
    await extendLintConfig(oldConfig, project.baseDir, '.eslintrc.js');

    expect(readdirSync(project.baseDir)).toContain('.eslintrc.js');
    expect(readdirSync(project.baseDir)).toContain('.rehearsal-eslintrc.js');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending rehearsal default eslint-related config');

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const newConfig = require(resolve(project.baseDir, '.eslintrc.js')) as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.js']);
  });

  test('skip if .eslintrc.js exists with valid extends', async () => {
    const oldConfig = `
    module.exports = {extends: ["./.rehearsal-eslintrc.js"]};
  `;
    await skipConfigThatExtends(oldConfig, project.baseDir, '.eslintrc.js');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc if existed', async () => {
    const oldConfig = `
    {"extends": []}
  `;
    await extendLintConfig(oldConfig, project.baseDir, '.eslintrc');

    expect(readdirSync(project.baseDir)).toContain('.eslintrc');
    expect(readdirSync(project.baseDir)).toContain('.rehearsal-eslintrc');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(project.baseDir, '.eslintrc'));
    const newConfig = loaded?.config as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc']);
  });

  test('skip if .eslintrc exists with valid extends', async () => {
    const oldConfig = `
    {extends: ["./.rehearsal-eslintrc.js"]}
  `;
    await skipConfigThatExtends(oldConfig, project.baseDir, '.eslintrc');

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.json if existed', async () => {
    const oldConfig = `
    {"extends": []}
  `;
    await extendLintConfig(oldConfig, project.baseDir, '.eslintrc.json');

    expect(readdirSync(project.baseDir)).toContain('.eslintrc.json');
    expect(readdirSync(project.baseDir)).toContain('.rehearsal-eslintrc.json');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(project.baseDir, '.eslintrc.json'));
    const newConfig = loaded?.config as { extends: string[] };
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.json']);
  });

  test('skip if .eslintrc.json exists with valid extends', async () => {
    const oldConfig = `
    {"extends": ["./.rehearsal-eslintrc.js"]}
  `;
    await skipConfigThatExtends(oldConfig, project.baseDir, '.eslintrc.json');

    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.yml if existed', async () => {
    const oldConfig = `
    extends: []
  `;
    await extendLintConfig(oldConfig, project.baseDir, '.eslintrc.yml');

    expect(readdirSync(project.baseDir)).toContain('.eslintrc.yml');
    expect(readdirSync(project.baseDir)).toContain('.rehearsal-eslintrc.yml');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(project.baseDir, '.eslintrc.yml'));
    const config = loaded?.config as { extends: string[] };

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    expect(config.extends).toStrictEqual(['./.rehearsal-eslintrc.yml']);
  });

  test('skip if .eslintrc.yml exists with valid extends', async () => {
    const oldConfig = `
    extends: ["./.rehearsal-eslintrc.js"]
  `;
    await skipConfigThatExtends(oldConfig, project.baseDir, '.eslintrc.yml');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });

  test('extends .eslintrc.yaml if existed', async () => {
    const oldConfig = `
    extends: []
  `;
    await extendLintConfig(oldConfig, project.baseDir, '.eslintrc.yaml');

    expect(readdirSync(project.baseDir)).toContain('.eslintrc.yaml');
    expect(readdirSync(project.baseDir)).toContain('.rehearsal-eslintrc.yaml');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending rehearsal default eslint-related config');

    explorerSync = cosmiconfigSync('');
    const loaded = explorerSync.load(resolve(project.baseDir, '.eslintrc.yaml'));
    const config = loaded?.config as { extends: string[] };

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    expect(config.extends).toStrictEqual(['./.rehearsal-eslintrc.yaml']);
  });

  test('skip if .eslintrc.yaml exists with valid extends', async () => {
    const oldConfig = `
    extends: ["./.rehearsal-eslintrc.js"]
  `;
    await skipConfigThatExtends(oldConfig, project.baseDir, '.eslintrc.yaml');

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
    await createCustomLintConfig(project.baseDir, customConfig);

    expect(readdirSync(project.baseDir)).toContain('custom-lint-config-script');
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

    await createCustomLintConfig(project.baseDir, customConfig);

    expect(readdirSync(project.baseDir)).toContain('foo');
    expect(readdirSync(project.baseDir)).not.toContain('custom-lint-config-script');
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
    await skipCustomConfigThatExtends(project.baseDir, customConfig);

    expect(readdirSync(project.baseDir)).not.toContain('custom-lint-config-script');
    expect(output).toContain('[SKIPPED] Create eslint config');
  });
});
