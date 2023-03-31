import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, afterAll, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { getEmberAddonProject } from '@rehearsal/test-support';
import { Project } from 'fixturify-project';
import { tsConfigTask } from '../../../src/commands/migrate/tasks/index.js';
import { listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { runTsConfig, createUserConfig } from '../../test-helpers/config-ts-test-utils.js';
import { TSConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';

const projects = {
  emberAddon: getEmberAddonProject(),
};

describe('Task: config-ts ember app', () => {
  for (const [name, originalProject] of Object.entries(projects)) {
    describe(name, () => {
      let project: Project;
      let output = '';

      beforeEach(async () => {
        project = originalProject.clone();
        await project.write();

        output = '';
        vi.spyOn(console, 'info').mockImplementation((chunk: string) => {
          chunk = chunk.replace(new RegExp(`${project.baseDir}`, 'g'), '<tmp-path>');
          output += `${chunk}\n`;
        });

        vi.spyOn(console, 'log').mockImplementation((chunk: string) => {
          chunk = chunk.replace(new RegExp(`${project.baseDir}`, 'g'), '<tmp-path>');
          output += `${chunk}\n`;
        });
      });

      afterEach(() => {
        vi.clearAllMocks();
        output = '';
        project.dispose();
      });

      afterAll(() => {
        originalProject.dispose();
      });

      test('create tsconfig if not existed', async () => {
        await runTsConfig(project.baseDir);

        expect(readJSONSync(resolve(project.baseDir, 'tsconfig.json'))).matchSnapshot();
        expect(output).matchSnapshot();
      });

      test('update tsconfig if exists', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { compilerOptions: { strict: false } };
        writeJSONSync(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

        await runTsConfig(project.baseDir);

        const tsConfig = readJSONSync(resolve(project.baseDir, 'tsconfig.json')) as TSConfig;

        expect(tsConfig.compilerOptions.strict).toBeTruthy();
        expect(output).toMatchSnapshot();
      });

      test('update tsconfig if invalid extends exist', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { extends: 'invalid-tsconfig.json' };
        writeJSONSync(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

        await runTsConfig(project.baseDir);

        const tsConfig = readJSONSync(resolve(project.baseDir, 'tsconfig.json')) as TSConfig;

        expect(tsConfig.compilerOptions.strict).toBeTruthy();
        expect(output).toMatchSnapshot();
      });

      test('skip if tsconfig.json exists with strict on', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { compilerOptions: { strict: true } };
        writeJSONSync(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

        await runTsConfig(project.baseDir);
        await runTsConfig(project.baseDir); //should be skipped

        expect(output).toMatchSnapshot();
      });

      test('run custom config command with user config provided', async () => {
        createUserConfig(project.baseDir, {
          migrate: {
            setup: {
              ts: { command: 'touch', args: ['custom-ts-config-script'] },
            },
          },
        });

        const options = createMigrateOptions(project.baseDir, {
          userConfig: 'rehearsal-config.json',
        });
        const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
        const tasks = [tsConfigTask(options, { userConfig })];
        await listrTaskRunner(tasks);

        // This proves the custom command works
        expect(readdirSync(project.baseDir)).toContain('custom-ts-config-script');
        expect(output).toMatchSnapshot();
      });

      test('skip custom config command', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { compilerOptions: { strict: true } };
        writeJSONSync(resolve(project.baseDir, 'tsconfig.json'), oldTsConfig);

        createUserConfig(project.baseDir, {
          migrate: {
            setup: {
              ts: { command: 'touch', args: ['custom-ts-config-script'] },
            },
          },
        });

        await runTsConfig(project.baseDir, { userConfig: 'rehearsal-config.json' });

        // This proves the custom command works not triggered
        expect(readdirSync(project.baseDir)).not.toContain('custom-ts-config-script');
        expect(output).toMatchSnapshot();
      });

      test('postTsSetup hook from user config', async () => {
        createUserConfig(project.baseDir, {
          migrate: {
            setup: {
              ts: { command: 'touch', args: ['custom-ts-config-script'] },
              postTsSetup: { command: 'mv', args: ['custom-ts-config-script', 'foo'] },
            },
          },
        });

        const options = createMigrateOptions(project.baseDir, {
          userConfig: 'rehearsal-config.json',
        });
        const userConfig = new UserConfig(project.baseDir, 'rehearsal-config.json', 'migrate');
        const tasks = [tsConfigTask(options, { userConfig })];
        await listrTaskRunner(tasks);

        expect(readdirSync(project.baseDir)).toContain('foo');
        expect(readdirSync(project.baseDir)).not.toContain('custom-ts-config-script');
        expect(output).toMatchSnapshot();
      });
    });
  }
});
