import { Scenarios, Project, Scenario, PreparedApp } from 'scenario-tester';
import { execSync } from 'child_process';
import { join } from 'path';
import rimraf from 'rimraf';

import {
  ember3,
  getEmberAppProject,
  emberAppTemplate,
  emberAddonTemplate,
  getEmberAddonProject,
  getEmberAppWithInRepoAddonProject,
  getEmberAppWithInRepoEngineProject,
} from './project';

const DIR_FIXTURE_EMBER_APP_TEMPLATE = `${__dirname}/ember/app-template`;
const DIR_FIXTURE_EMBER_ADDON_TEMPLATE = `${__dirname}/ember/addon-template`;

export function clean(dir: string): void {
  rimraf.sync(join(dir, 'node_modules'));
}

function prepare(dir: string): void {
  clean(dir);
  // The (app|addon)-template needs a node_modules directory for
  // scenario - tester to craete a Project.fromDir()
  execSync(`npm --version && npm install`, {
    cwd: dir,
    stdio: 'ignore', // Otherwise this will output warning from install command
  });
}

function supportMatrix(scenarios: Scenarios) {
  return scenarios.expand({
    // lts,
    ember3,
    // release,
    // beta,
    // canary,
  });
}

function appVariants(scenarios: Scenarios) {
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

function addonVariants(scenarios: Scenarios) {
  return scenarios.expand({
    addon: getEmberAddonProject,
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

async function getPreparedApp(scenario: Scenario): Promise<PreparedApp> {
  const app = await scenario.prepare();

  // Remove node_modules to ensure changes package.json result in a
  // fresh node_modules directory after install
  clean(app.dir);

  const cmd = 'npm install';

  let result = await app.execute(cmd);

  if (result.exitCode !== 0) {
    throw new Error(
      `Test support failure for scenario: ${scenario.name}\nTried to executed command: ${cmd}\nOutput:\n\n${result.output}`
    );
  }

  return app;
}

export function prepareAppTemplate() {
  prepare(DIR_FIXTURE_EMBER_APP_TEMPLATE);
}
export function prepareAddonTemplate() {
  prepare(DIR_FIXTURE_EMBER_ADDON_TEMPLATE);
}

export function setup() {
  prepareAppTemplate();
  prepareAddonTemplate();
}

export async function getEmberAppScenario(variantName: string): Promise<PreparedApp> {
  const scenario = await pluck(appScenarios, variantName);
  return await getPreparedApp(scenario);
}

export async function getEmberAddonScenario(variantName: string): Promise<PreparedApp> {
  const scenario = await pluck(addonScenarios, variantName);
  return await getPreparedApp(scenario);
}
