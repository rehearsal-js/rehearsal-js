import { execSync } from 'child_process';
import { join } from 'path';
import { sync } from 'rimraf';
import { PreparedApp, Scenario } from 'scenario-tester';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { addonScenarios, appScenarios } from './fixtures/scenarios';
const TIMEOUT_FOR_BUILD = 500000;

function nukeNodeModules(dir: string): void {
  sync(join(dir, 'node_modules'));
}
function setup(cwd: string): void {
  nukeNodeModules(cwd);
  execSync(`volta run pnpm --version && volta run pnpm install`, {
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
          let result = await app.execute('volta run pnpm install');
          expect(result.exitCode, result.output).toBe(0);
          // Should pass acceptance tests
          result = await app.execute('volta run pnpm test');
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
          let result = await app.execute('volta run pnpm install');
          expect(result.exitCode, result.output).toBe(0);
          // Should pass acceptance tests
          result = await app.execute('volta run pnpm test');
          expect(result.exitCode, result.output).toBe(0);
        },
        TIMEOUT_FOR_BUILD
      );
    });
  });
});
