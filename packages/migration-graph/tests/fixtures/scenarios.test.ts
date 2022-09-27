import { PreparedApp, Scenario, Scenarios } from 'scenario-tester';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { addonScenarios, appScenarios, clean, getEmberApp, setup } from './scenarios';
const TEST_TIMEOUT = 500000;

// Enable these tests to validate if our scenarios fixtures build a funciton all
describe.skip('scenarios [internal] validate file fixture projects with acceptance tests', () => {
  beforeAll(() => {
    setup();
  });

  test.skip(
    'debug scenario test',
    async () => {
      const app = await getEmberApp('app'); // Choose a scenario to debug
      clean(app.dir); // Remove node_modules to ensure it's regenerated between scenarios
      console.log(app.dir);

      // Setup
      let result = await app.execute('volta run yarn install');
      expect(result.exitCode, result.output).toBe(0);
      // Should pass acceptance tests
      result = await app.execute('volta run yarn test');
      expect(result.exitCode, result.output).toBe(0);
    },
    TEST_TIMEOUT
  );

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
