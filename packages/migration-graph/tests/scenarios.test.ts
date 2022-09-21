import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import { PreparedApp, Scenario } from 'scenario-tester';
import { appScenarios, addonScenarios } from './fixtures/scenarios';
import { execSync } from 'child_process';
import rimraf from 'rimraf';
import { join } from 'path';
const TIMEOUT_FOR_BUILD = 500000;

function nukeNodeModules(dir) {
  rimraf.sync(join(dir, 'node_modules'));
}

function setup(cwd: string) {
  nukeNodeModules(cwd);
  execSync(`volta run yarn --version && volta run yarn install`, {
    cwd,
  });
}

describe('app-variants', () => {
  beforeAll(() => {
    // The app-template needs a node_modules directory for scenario-tester to craete a Project.fromDir()
    setup(`${__dirname}/fixtures/ember/app-template`);
  });

  appScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;

      beforeEach(async () => {
        app = await scenario.prepare();
        nukeNodeModules(app.dir);
      });

      test(
        'should pass tests',
        async () => {
          // Setup
          let result = await app.execute('volta run yarn install');
          expect(result.exitCode, result.output).toBe(0);
          // Should pass acceptance tests
          result = await app.execute('volta run yarn test');
          expect(result.exitCode, result.output).toBe(0);
        },
        TIMEOUT_FOR_BUILD
      );
    });
  });
});

describe('addon-variants', () => {
  beforeAll(() => {
    // The addon-template needs a node_modules directory for scenario-tester to craete a Project.fromDir()
    setup(`${__dirname}/fixtures/ember/addon-template`);
  });

  addonScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;

      beforeEach(async () => {
        app = await scenario.prepare();
        nukeNodeModules(app.dir);
      });

      test(
        'should pass tests',
        async () => {
          // Setup
          let result = await app.execute('volta run yarn install');
          expect(result.exitCode, result.output).toBe(0);
          // Should pass acceptance tests
          result = await app.execute('volta run yarn test');
          expect(result.exitCode, result.output).toBe(0);
        },
        TIMEOUT_FOR_BUILD
      );
    });
  });
});
