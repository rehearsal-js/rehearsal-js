import { join } from 'node:path';
import { Scenarios, Scenario, PreparedApp } from 'scenario-tester';
import { rimraf } from 'rimraf';

import {
  getEmberAppProject,
  emberAppTemplate,
  emberAddonTemplate,
  getEmberAddonProject,
  getEmberAppWithInRepoAddonProject,
  getEmberAppWithInRepoEngineProject,
} from './project.js';

export function clean(dir: string): void {
  rimraf.sync(join(dir, 'node_modules'));
}

function supportMatrix(scenarios: Scenarios): Scenarios {
  // Future place for adding different versions of ember to test.
  return scenarios.expand({
    // lts,
    //eslint-disable-next-line @typescript-eslint/no-empty-function
    ember3: () => {},
    // release,
    // beta,
    // canary,
  });
}

function appVariants(scenarios: Scenarios): Scenarios {
  return scenarios.expand({
    app: (project) => {
      getEmberAppProject(project);
    },
    appWithInRepoAddon: (project) => {
      getEmberAppWithInRepoAddonProject(project);
    },
    appWithInRepoEngine: (project) => {
      getEmberAppWithInRepoEngineProject(project);
    },
  });
}

export const appScenarios = appVariants(supportMatrix(Scenarios.fromProject(emberAppTemplate)));

function addonVariants(scenarios: Scenarios): Scenarios {
  return scenarios.expand({
    addon: (project) => {
      getEmberAddonProject(project);
    },
  });
}

export const addonScenarios = addonVariants(
  supportMatrix(Scenarios.fromProject(() => emberAddonTemplate('dummy-app')))
);

function pluck(scenarios: Scenarios, variantName: string): Promise<Scenario> {
  return new Promise<Scenario>((resolve) => {
    scenarios.only(variantName).forEachScenario((scenario) => {
      resolve(scenario);
    });
  });
}

const preparedAppCache = new WeakMap<Scenario, PreparedApp>();

async function getPreparedApp(scenario: Scenario, cache = false): Promise<PreparedApp> {
  // if the cache flag is set, we will attempt to retrieve the prepared app from the cache.
  // this should only be used idempotent tests
  if (cache && preparedAppCache.has(scenario)) {
    const maybeApp = preparedAppCache.get(scenario);

    if (!maybeApp) {
      throw new Error(`Unable to retrieve parepared app for ${scenario.name}`);
    }

    return maybeApp;
  }

  const app: PreparedApp = await scenario.prepare();

  // Remove node_modules to ensure changes package.json result in a
  // fresh node_modules directory after install
  clean(app.dir);

  const cmd = 'npm install';

  const result = await app.execute(cmd);

  if (result.exitCode !== 0) {
    throw new Error(
      `Test support failure for scenario: ${scenario.name}\nTried to executed command: ${cmd}\nOutput:\n\n${result.output}`
    );
  }

  if (cache) {
    // Add to scenario cache
    preparedAppCache.set(scenario, app);
  }

  return app;
}

export async function getEmberAppScenario(
  variantName: string,
  cache = false
): Promise<PreparedApp> {
  const scenario = await pluck(appScenarios, variantName);
  return await getPreparedApp(scenario, cache);
}

export async function getEmberAddonScenario(
  variantName: string,
  cache = false
): Promise<PreparedApp> {
  const scenario = await pluck(addonScenarios, variantName);
  return await getPreparedApp(scenario, cache);
}
