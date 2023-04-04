import { describe, expect, test } from 'vitest';
import { clean, getEmberAppScenario } from '../src/scenarios.js';

// Enable these tests to validate if our scenarios fixtures build a function all
describe('scenarios - validate scenarios for npm install + test', () => {
  test.skip('debug scenario test', async () => {
    const app = await getEmberAppScenario('app'); // Choose a scenario to debug
    clean(app.dir); // Remove node_modules to ensure it's regenerated between scenarios
    console.log(app.dir);

    // Setup
    let result = await app.execute('npm install');
    expect(result.exitCode, result.output).toBe(0);
    // Should pass acceptance tests
    result = await app.execute('npm test');
    expect(result.exitCode, result.output).toBe(0);
  });
});
