import { dirname, join } from 'path';
import { Project } from 'fixturify-project';
import findupSync from 'findup-sync';
import merge from 'lodash.merge';
import tmp from 'tmp';
import {
  getEmberAppFiles,
  getEmberAppWithInRepoAddonFiles,
  getEmberAddonFiles,
  getEmberAppWithInRepoEngine,
} from './files';

tmp.setGracefulCleanup();

const maybePackageJson = findupSync('./package.json', { cwd: __dirname });

if (!maybePackageJson) {
  throw new Error('Unable to dermien rooDir for @rehearsal/test-support');
}

const ROOT_DIR = dirname(maybePackageJson);
const EMBER_APP_TEMPLATE_DIR = join(ROOT_DIR, 'fixtures/ember/app-template/');
const EMBER_ADDON_TEMPLATE_DIR = join(ROOT_DIR, 'fixtures/ember/addon-template/');

export function getEmberAppProject(project: Project = emberAppTemplate()): Project {
  merge(project.files, getEmberAppFiles());
  return project;
}

/**
 * Augments the project to have an in-repo addon with an acceptance test to evalute the composition.
 * @param {Project} project
 * @param {string} [addonName='some-addon']
 */
export function getEmberAppWithInRepoAddonProject(
  project: Project = emberAppTemplate(),
  addonName = 'some-addon'
): Project {
  getEmberAppProject(project);

  // augment package.json with
  project.pkg['ember-addon'] = {
    paths: [`lib/${addonName}`],
  };

  merge(project.files, getEmberAppWithInRepoAddonFiles(addonName));

  return project;
}

export function getEmberAppWithInRepoEngineProject(
  project: Project = emberAppTemplate(),
  engineName = 'some-engine'
): Project {
  getEmberAppProject(project);

  project.pkg['ember-addon'] = {
    paths: [`lib/${engineName}`],
  };
  project.addDevDependency('ember-engines', '0.8.23');

  // TODO refactor requirePackageMain() to parse the index.js file first, if no name found result to require.

  // This is a workaround because for this test we don't want to have to do a `install`
  // on the fixture
  //
  // We are mocking require(`ember-engines/lib/engine-addon`) for now because
  // in `migration-graph-ember` there is a method called `requirePackageMain` which
  // calls `require()` on the `index.js` of the addon to determine the addon-name.
  // This test fails unless we mock that module.

  project.files = merge(project.files, {
    node_modules: {
      'ember-engines': {
        lib: {
          'engine-addon': `module.exports = {
            extend: function(config) {
              return config;
            }
          }`,
        },
      },
    },
  });

  merge(project.files, getEmberAppWithInRepoEngine(engineName));

  return project;
}

export function getEmberAddonProject(project: Project = emberAddonTemplate()): Project {
  // For now we are only making compat tests for ember-source >=3.24 and < 4.0
  // Add acceptance test for validating that our engine is mounted and routable;
  merge(project.files, getEmberAddonFiles());
  return project;
}

export function emberAddonTemplate(as: 'addon' | 'dummy-app' = 'addon'): Project {
  return Project.fromDir(EMBER_ADDON_TEMPLATE_DIR, {
    linkDeps: true,
    linkDevDeps: as === 'dummy-app',
  });
}

export function emberAppTemplate(): Project {
  return Project.fromDir(EMBER_APP_TEMPLATE_DIR, {
    linkDevDeps: false,
  });
}

export async function setupProject(project: Project): Promise<Project> {
  const { name: tmpDir } = tmp.dirSync();
  project.baseDir = tmpDir;
  await project.write();
  return project;
}

type EmberProjectFixture = 'app' | 'app-with-in-repo-addon' | 'app-with-in-repo-engine' | 'addon';

export function getEmberProject(variant: EmberProjectFixture): Project {
  let project;

  switch (variant) {
    case 'app':
      project = getEmberAppProject();
      break;
    case 'app-with-in-repo-addon':
      project = getEmberAppWithInRepoAddonProject();
      break;
    case 'app-with-in-repo-engine':
      project = getEmberAppWithInRepoEngineProject();
      break;
    case 'addon':
      project = getEmberAddonProject();
      break;
    default:
      throw new Error(`Unable to getProjectVaraint for '${variant}'.`);
  }

  return project;
}

/**
 * Returns a test project variant that has been setup.
 *
 * @param variant
 * @returns Promise<Project>
 */
export async function getEmberProjectFixture(variant: EmberProjectFixture): Promise<Project> {
  return setupProject(getEmberProject(variant));
}