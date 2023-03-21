import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readJSONSync, writeJSONSync } from 'fs-extra/esm';
import { tsConfigTask } from '../../../src/commands/migrate/tasks/index.js';
import { listrTaskRunner, createMigrateOptions } from '../../test-helpers/index.js';
import { runTsConfig, createUserConfig } from '../../test-helpers/config-ts-test-utils.js';
import { TSConfig } from '../../../src/types.js';
import { UserConfig } from '../../../src/user-config.js';
import { setGracefulCleanup } from 'tmp';
import { addonScenarios, clean } from '@rehearsal/test-support';
import { Scenario, PreparedApp } from 'scenario-tester';

setGracefulCleanup();

describe('Task: config-ts ember app', () => {
  addonScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;
      let output = '';

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
        output = '';
      });

      test('create tsconfig if not existed', async () => {
        await runTsConfig(app.dir);
    
        expect(readJSONSync(resolve(app.dir, 'tsconfig.json'))).matchSnapshot();
        expect(output).matchSnapshot();
      });
    
      test('update tsconfig if exists', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { compilerOptions: { strict: false } };
        writeJSONSync(resolve(app.dir, 'tsconfig.json'), oldTsConfig);
    
        await runTsConfig(app.dir);
    
        const tsConfig = readJSONSync(resolve(app.dir, 'tsconfig.json')) as TSConfig;
    
        expect(tsConfig.compilerOptions.strict).toBeTruthy();
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('ensuring strict mode is enabled');
      });
    
      test('update tsconfig if invalid extends exist', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { extends: 'invalid-tsconfig.json' };
        writeJSONSync(resolve(app.dir, 'tsconfig.json'), oldTsConfig);
    
        await runTsConfig(app.dir);
    
        const tsConfig = readJSONSync(resolve(app.dir, 'tsconfig.json')) as TSConfig;
    
        expect(tsConfig.compilerOptions.strict).toBeTruthy();
        // Do not use snapshot here since there is absolute path in output
        expect(output).toContain('ensuring strict mode is enabled');
      });
    
      test('skip if tsconfig.json exists with strict on', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { compilerOptions: { strict: true } };
        writeJSONSync(resolve(app.dir, 'tsconfig.json'), oldTsConfig);
    
        await runTsConfig(app.dir);
        await runTsConfig(app.dir); //should be skipped
    
        expect(output).toMatchSnapshot();
      });
    
      test('run custom config command with user config provided', async () => {
        createUserConfig(app.dir, {
          migrate: {
            setup: {
              ts: { command: 'touch', args: ['custom-ts-config-script'] },
            },
          },
        });
    
        const options = createMigrateOptions(app.dir, { userConfig: 'rehearsal-config.json' });
        const userConfig = new UserConfig(app.dir, 'rehearsal-config.json', 'migrate');
        const tasks = [tsConfigTask(options, { userConfig })];
        await listrTaskRunner(tasks);
    
        // This proves the custom command works
        expect(readdirSync(app.dir)).toContain('custom-ts-config-script');
        expect(output).toMatchSnapshot();
      });
    
      test('skip custom config command', async () => {
        // Prepare old tsconfig
        const oldTsConfig = { compilerOptions: { strict: true } };
        writeJSONSync(resolve(app.dir, 'tsconfig.json'), oldTsConfig);
    
        createUserConfig(app.dir, {
          migrate: {
            setup: {
              ts: { command: 'touch', args: ['custom-ts-config-script'] },
            },
          },
        });
    
        await runTsConfig(app.dir, { userConfig: 'rehearsal-config.json' });
    
        // This proves the custom command works not triggered
        expect(readdirSync(app.dir)).not.toContain('custom-ts-config-script');
        expect(output).toMatchSnapshot();
      });
    
      test('postTsSetup hook from user config', async () => {
        createUserConfig(app.dir, {
          migrate: {
            setup: {
              ts: { command: 'touch', args: ['custom-ts-config-script'] },
              postTsSetup: { command: 'mv', args: ['custom-ts-config-script', 'foo'] },
            },
          },
        });
    
        const options = createMigrateOptions(app.dir, { userConfig: 'rehearsal-config.json' });
        const userConfig = new UserConfig(app.dir, 'rehearsal-config.json', 'migrate');
        const tasks = [tsConfigTask(options, { userConfig })];
        await listrTaskRunner(tasks);
    
        // This proves the custom command and hook works
        expect(readdirSync(app.dir)).toContain('foo');
        expect(readdirSync(app.dir)).not.toContain('custom-ts-config-script');
        expect(output).toMatchSnapshot();
      });

    });
  });
});