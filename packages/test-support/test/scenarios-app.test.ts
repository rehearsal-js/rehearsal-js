import { PreparedApp, Scenario } from 'scenario-tester';
import { beforeEach, describe, expect, test } from 'vitest';
import { appScenarios, clean } from '../src/scenarios.js';

// Enable these tests to validate if our scenarios fixtures build a function all
describe('scenarios - app-variants', () => {
  appScenarios.forEachScenario((scenario: Scenario) => {
    describe(scenario.name, () => {
      let app: PreparedApp;

      beforeEach(async () => {
        app = await scenario.prepare();
        clean(app.dir); // Remove node_modules to ensure it's regenerated between scenarios
      });

      test('should pass tests', async () => {
        // Setup
        let result = await app.execute('npm install');
        expect(result.exitCode, result.output).toBe(0);
        // Should pass acceptance tests
        result = await app.execute('npm test');
        expect(result.exitCode, result.output).toBe(0);
      });
    });
  });
});
