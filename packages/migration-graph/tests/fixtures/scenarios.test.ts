import { PreparedApp, Scenario } from 'scenario-tester';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { addonScenarios, appScenarios, clean, setup } from './scenarios';
const TEST_TIMEOUT = 500000;

describe('scenarios', () => {
  beforeAll(() => {
    setup();
  });

  describe('app-variants', () => {
    appScenarios.forEachScenario((scenario: Scenario) => {
      describe(scenario.name, () => {
        let app: PreparedApp;

        beforeEach(async () => {
          app = await scenario.prepare();
          clean(app.dir); // Remove node_modules to ensure it's regenerated between scenarios
        });

        test(
          'should pass tests',
          async () => {
            // Setup
            let result = await app.execute('npm install');
            expect(result.exitCode, result.output).toBe(0);
            // Should pass acceptance tests
            result = await app.execute('npm test');
            expect(result.exitCode, result.output).toBe(0);
          },
          TEST_TIMEOUT
        );
      });
    });
  });

  describe('addon-variants', () => {
    addonScenarios.forEachScenario((scenario: Scenario) => {
      describe(scenario.name, () => {
        let app: PreparedApp;

        beforeEach(async () => {
          app = await scenario.prepare();
          clean(app.dir); // Remove node_modules to ensure it's regenerated between scenarios
        });

        test(
          'should pass tests',
          async () => {
            // Setup
            let result = await app.execute('npm install');
            expect(result.exitCode, result.output).toBe(0);
            // Should pass acceptance tests
            result = await app.execute('npm test');
            expect(result.exitCode, result.output).toBe(0);
          },
          TEST_TIMEOUT
        );
      });
    });
  });
});
