import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { writeJSONSync } from 'fs-extra';
import { Project } from 'fixturify-project';
import {
  getEmber4AppProject,
  getEmberAppProject,
  getEmberAppWithInRepoAddonProject,
  getEmberAppWithInRepoEngineProject,
} from '@rehearsal/test-support';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { cleanOutput } from '../../test-helpers/index.js';
import {
  CUSTOM_CONFIG,
  runDefault,
  runTwoTimes,
  runWithUserConfig,
} from '../../test-helpers/init-command-test-utils.js';
import { CustomConfig } from '../../../src/types.js';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

const projects = {
  emberApp: getEmberAppProject(),
  emberAppWithInRepoAddon: getEmberAppWithInRepoAddonProject(),
  emberAppWithInRepoEngine: getEmberAppWithInRepoEngineProject(),
  ember4App: getEmber4AppProject(),
};

describe('migrate init for ember app variant', () => {
  for (const [name, originalProject] of Object.entries(projects)) {
    describe(name, () => {
      let project: Project;

      beforeEach(async () => {
        project = originalProject.clone();
        await project.write();
      });
      afterEach(() => {
        project.dispose();
      });

      afterAll(() => {
        originalProject.dispose();
      });

      test(`default run --${name}`, async () => {
        const {
          stdout,
          devDeps,
          fileList,
          lintConfig,
          lintConfigDefault,
          tsConfig,
          tscLintScript,
        } = await runDefault(project.baseDir);

        expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();

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

      test(`pass user config ${name}`, async () => {
        createUserConfig(project.baseDir, CUSTOM_CONFIG);

        const { stdout, devDeps, deps, tscLintScript } = await runWithUserConfig(project.baseDir);

        expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();

        expect(Object.keys(devDeps!)).includes('tmp');
        expect(deps).toHaveProperty('fs-extra');

        expect(readdirSync(project.baseDir)).toContain('custom-ts-config-script');
        expect(readdirSync(project.baseDir)).toContain('custom-lint-config-script');

        expect(tscLintScript).toBe('tsc --noEmit');
      });

      test('skip dep install, ts config, and lint config if exists', async () => {
        const { stdout } = await runTwoTimes(project.baseDir);

        expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();
      });
    });
  }
});
