import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { cosmiconfigSync } from 'cosmiconfig';

import { appScenarios, clean } from '@rehearsal/test-support';
import { Scenario, PreparedApp } from 'scenario-tester';
import { describe, beforeEach, afterEach, test, vi, expect } from 'vitest';
import {
  createCustomLintConfig,
  createLintConfig,
  extendLintConfig,
  skipConfigThatExtends,
  skipCustomConfigThatExtends,
} from '../../test-helpers/config-lint-test-utils.js';

describe('Task: config-lint -- ember-app-matrix', () => {
  appScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;
      let output = '';
      let explorerSync;

      beforeEach(async () => {
        app = await scenario.prepare();
        clean(app.dir);
        output = '';
        vi.spyOn(console, 'info').mockImplementation((chunk) => {
          output += `${chunk}\n`;
        });

        vi.spyOn(console, 'log').mockImplementation((chunk) => {
          output += `${chunk}\n`;
        });
      });

      afterEach(() => {
        vi.clearAllMocks();
        explorerSync = null;
        output = '';
      });

      test('create .eslintrc.js if not existed', async () => {
        await createLintConfig(app.dir);
        expect(readdirSync(app.dir)).toContain('.eslintrc.js');
        expect(readdirSync(app.dir)).toContain('.rehearsal-eslintrc.js');
        expect(output).matchSnapshot();
      });

      test('extends .eslintrc.js if existed', async () => {
        const oldConfig = `
        module.exports = {extends: []};
      `;
        await extendLintConfig(oldConfig, app.dir, '.eslintrc.js');

        expect(readdirSync(app.dir)).toContain('.eslintrc.js');
        expect(readdirSync(app.dir)).toContain('.rehearsal-eslintrc.js');
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('extending Rehearsal default eslint-related config');

        /* eslint-disable-next-line @typescript-eslint/no-var-requires */
        const newConfig = require(resolve(app.dir, '.eslintrc.js')) as { extends: string[] };
        expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.js']);
      });

      test('skip if .eslintrc.js exists with valid extends', async () => {
        const oldConfig = `
        module.exports = {extends: ["./.rehearsal-eslintrc.js"]};
      `;
        await skipConfigThatExtends(oldConfig, app.dir, '.eslintrc.js');
        expect(output).toContain('[SKIPPED] Create eslint config');
      });

      test('extends .eslintrc if existed', async () => {
        const oldConfig = `
        {"extends": []}
      `;
        await extendLintConfig(oldConfig, app.dir, '.eslintrc');

        expect(readdirSync(app.dir)).toContain('.eslintrc');
        expect(readdirSync(app.dir)).toContain('.rehearsal-eslintrc');
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('extending Rehearsal default eslint-related config');

        explorerSync = cosmiconfigSync('');
        const loaded = explorerSync.load(resolve(app.dir, '.eslintrc'));
        const newConfig = loaded?.config as { extends: string[] };
        expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc']);
      });

      test('skip if .eslintrc exists with valid extends', async () => {
        const oldConfig = `
        {extends: ["./.rehearsal-eslintrc.js"]}
      `;
        await skipConfigThatExtends(oldConfig, app.dir, '.eslintrc');

        expect(output).toContain('[SKIPPED] Create eslint config');
      });

      test('extends .eslintrc.json if existed', async () => {
        const oldConfig = `
        {"extends": []}
      `;
        await extendLintConfig(oldConfig, app.dir, '.eslintrc.json');

        expect(readdirSync(app.dir)).toContain('.eslintrc.json');
        expect(readdirSync(app.dir)).toContain('.rehearsal-eslintrc.json');
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('extending Rehearsal default eslint-related config');

        explorerSync = cosmiconfigSync('');
        const loaded = explorerSync.load(resolve(app.dir, '.eslintrc.json'));
        const newConfig = loaded?.config as { extends: string[] };
        expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.json']);
      });

      test('skip if .eslintrc.json exists with valid extends', async () => {
        const oldConfig = `
        {"extends": ["./.rehearsal-eslintrc.js"]}
      `;
        await skipConfigThatExtends(oldConfig, app.dir, '.eslintrc.json');

        expect(output).toContain('[SKIPPED] Create eslint config');
      });

      test('extends .eslintrc.yml if existed', async () => {
        const oldConfig = `
        extends: []
      `;
        await extendLintConfig(oldConfig, app.dir, '.eslintrc.yml');

        expect(readdirSync(app.dir)).toContain('.eslintrc.yml');
        expect(readdirSync(app.dir)).toContain('.rehearsal-eslintrc.yml');
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('extending Rehearsal default eslint-related config');

        explorerSync = cosmiconfigSync('');
        const loaded = explorerSync.load(resolve(app.dir, '.eslintrc.yml'));
        const config = loaded?.config as { extends: string[] };

        /* eslint-disable-next-line @typescript-eslint/no-var-requires */
        expect(config.extends).toStrictEqual(['./.rehearsal-eslintrc.yml']);
      });

      test('skip if .eslintrc.yml exists with valid extends', async () => {
        const oldConfig = `
        extends: ["./.rehearsal-eslintrc.js"]
      `;
        await skipConfigThatExtends(oldConfig, app.dir, '.eslintrc.yml');
        expect(output).toContain('[SKIPPED] Create eslint config');
      });

      test('extends .eslintrc.yaml if existed', async () => {
        const oldConfig = `
        extends: []
      `;
        await extendLintConfig(oldConfig, app.dir, '.eslintrc.yaml');

        expect(readdirSync(app.dir)).toContain('.eslintrc.yaml');
        expect(readdirSync(app.dir)).toContain('.rehearsal-eslintrc.yaml');
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('extending Rehearsal default eslint-related config');

        explorerSync = cosmiconfigSync('');
        const loaded = explorerSync.load(resolve(app.dir, '.eslintrc.yaml'));
        const config = loaded?.config as { extends: string[] };

        /* eslint-disable-next-line @typescript-eslint/no-var-requires */
        expect(config.extends).toStrictEqual(['./.rehearsal-eslintrc.yaml']);
      });

      test('skip if .eslintrc.yaml exists with valid extends', async () => {
        const oldConfig = `
        extends: ["./.rehearsal-eslintrc.js"]
      `;
        await skipConfigThatExtends(oldConfig, app.dir, '.eslintrc.yaml');

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
        await createCustomLintConfig(app.dir, customConfig);

        expect(readdirSync(app.dir)).toContain('custom-lint-config-script');
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

        await createCustomLintConfig(app.dir, customConfig);

        expect(readdirSync(app.dir)).toContain('foo');
        expect(readdirSync(app.dir)).not.toContain('custom-lint-config-script');
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
        await skipCustomConfigThatExtends(app.dir, customConfig);

        expect(readdirSync(app.dir)).not.toContain('custom-lint-config-script');
        expect(output).toContain('[SKIPPED] Create eslint config');
      });
    });
  });
});
