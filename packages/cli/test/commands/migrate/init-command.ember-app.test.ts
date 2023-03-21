import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { beforeEach, describe, test, expect } from 'vitest';
import { Scenario, PreparedApp } from 'scenario-tester';
import { setGracefulCleanup } from 'tmp';
import { writeJSONSync } from 'fs-extra';
import { appScenarios, clean } from '@rehearsal/test-support';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { cleanOutput } from '../../test-helpers/index.js';
import {
  runDefault,
  runWithUserConfig,
  runTwoTimes,
  CUSTOM_CONFIG,
} from '../../test-helpers/init-command-test-utils.js';
import { CustomConfig } from '../../../src/types.js';

setGracefulCleanup();

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('migrate init for ember app variant', () => {
  appScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;

      beforeEach(async () => {
        app = await scenario.prepare();
        clean(app.dir);
      });

      test(`default run --${scenario.name}`, async () => {
        const {
          stdout,
          devDeps,
          fileList,
          lintConfig,
          lintConfigDefault,
          tsConfig,
          tscLintScript,
        } = await runDefault(app.dir);

        expect(cleanOutput(stdout, app.dir)).toMatchSnapshot();

        for (const devDep of REQUIRED_DEPENDENCIES) {
          expect(Object.keys(devDeps!).includes(devDep));
        }

        expect(fileList).toContain('.eslintrc.js');
        expect(fileList).toContain('.rehearsal-eslintrc.js');

        expect(lintConfig).toMatchSnapshot();
        expect(lintConfigDefault).toMatchSnapshot();
        expect(tsConfig).matchSnapshot();
        expect(tscLintScript).toBe('tsc --noEmit');
      });

      test(`pass user config ${scenario.name}`, async () => {
        createUserConfig(app.dir, CUSTOM_CONFIG);

        const { stdout, devDeps, deps, tscLintScript } = await runWithUserConfig(app.dir);

        expect(cleanOutput(stdout, app.dir)).toMatchSnapshot();

        expect(Object.keys(devDeps!)).includes('tmp');
        expect(deps).toHaveProperty('fs-extra');

        expect(readdirSync(app.dir)).toContain('custom-ts-config-script');
        expect(readdirSync(app.dir)).toContain('custom-lint-config-script');

        expect(tscLintScript).toBe('tsc --noEmit');
      });

      test('skip dep install, ts config, and lint config if exists', async () => {
        const { stdout } = await runTwoTimes(app.dir);

        expect(cleanOutput(stdout, app.dir)).toMatchSnapshot();
      });
    });
  });
});
