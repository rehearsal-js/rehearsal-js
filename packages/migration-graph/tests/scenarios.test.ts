import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import { PreparedApp, Scenario } from 'scenario-tester';
import { appScenarios, addonScenarios } from './fixtures/scenarios';
import { execSync } from 'child_process';

const TIMEOUT_FOR_BUILD = 500000;

describe('app-variants', () => {
  beforeAll(() => {
    // The app-template needs a node_modules directory for scenario-tester to craete a Project.fromDir()
    execSync(`cd ${__dirname}/fixtures/ember/app-template && volta run npm install`);
  });

  appScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;

      beforeEach(async () => {
        app = await scenario.prepare();
      });

      test(
        'should pass tests',
        async () => {
          // Setup
          let result = await app.execute('volta run npm install');
          expect(result.exitCode, result.output).toBe(0);
          // Should pass acceptance tests
          result = await app.execute('volta run npm -- run test');
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
    execSync(`cd ${__dirname}/fixtures/ember/addon-template && volta run npm install`);
  });

  addonScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;

      beforeEach(async () => {
        app = await scenario.prepare();
      });

      test(
        'should pass tests',
        async () => {
          // Setup
          let result = await app.execute('volta run npm install');
          expect(result.exitCode, result.output).toBe(0);
          // Should pass acceptance tests
          result = await app.execute('volta run npm -- run test');
          expect(result.exitCode, result.output).toBe(0);
        },
        TIMEOUT_FOR_BUILD
      );
    });
  });
});
