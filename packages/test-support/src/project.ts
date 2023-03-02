import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import findupSync from 'findup-sync';
import tmp from 'tmp';
import { Project } from 'fixturify-project';
import {
  getEmberAppFiles,
  getEmberAppWithInRepoAddonFiles,
  getEmberAddonFiles,
  getEmberAppWithInRepoEngine,
} from './files.js';

tmp.setGracefulCleanup();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const maybePackageJson = findupSync('./package.json', { cwd: __dirname });

if (!maybePackageJson) {
  throw new Error('Unable to dermien rooDir for @rehearsal/test-support');
}

const ROOT_DIR = dirname(maybePackageJson);
const EMBER_APP_TEMPLATE_DIR = join(ROOT_DIR, 'fixtures/ember/app-template/');
const EMBER_ADDON_TEMPLATE_DIR = join(ROOT_DIR, 'fixtures/ember/addon-template/');

export function getEmberAppProject(project: Project = emberAppTemplate()): Project {
  project.mergeFiles(getEmberAppFiles());
  return project;
}

function addUtilDirectory(project: Project): Project {
  const appName = 'app-template';

  project.mergeFiles({
    app: {
      utils: {
        'math.js': `
          export function add(a, b) {
            assert(
              'arguments must be numbers',
              typeof a === number && typeof b === number
            );

            return a + b;
          }
        `,
        'entry.js': `import impl from './lib/impl';`,
        lib: {
          'impl.js': `
            import base from './base';
            export default base;
            `,
          'base.js': `export default function () { console.log(1); }`,
        },
      },
    },
    tests: {
      unit: {
        utils: {
          'math-test.js': `
          import { module, test } from 'qunit';
          import { add } from '${appName}/utils/math';

          module('the \`add\` function', function(hooks) {
            test('adds numbers correctly', function(assert) {
              assert.equal('2 + 2 is 4', add(2, 2), 4);
              assert.notEqual('2 + 2 is a number', add(2, 2), NaN);
              assert.notEqual('2 + 2 is not infinity', add(2, 2), Infinity);
            });

            test('throws an error with strings', function(assert) {
              assert.throws(
                'when the first is a string and the second is a number',
                () => add('hello', 1)
              );
              assert.throws(
                'when the first is a number and the second is a string',
                () => add(0, 'hello')
              );
              assert.throws(
                'when both are strings',
                () => add('hello', 'goodbye')
              );
            })
          });
          `,
        },
      },
    },
  });

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

  project.mergeFiles(getEmberAppWithInRepoAddonFiles(addonName));

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

  project.mergeFiles({
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

  project.mergeFiles(getEmberAppWithInRepoEngine(engineName));

  return project;
}

export function getEmberAddonProject(project: Project = emberAddonTemplate()): Project {
  // For now we are only making compat tests for ember-source >=3.24 and < 4.0
  // Add acceptance test for validating that our engine is mounted and routable;
  project.mergeFiles(getEmberAddonFiles());
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

type EmberProjectFixture =
  | 'app'
  | 'app-with-utils'
  | 'app-with-in-repo-addon'
  | 'app-with-in-repo-engine'
  | 'addon';
export function getEmberProject(variant: EmberProjectFixture): Project {
  let project;

  switch (variant) {
    case 'app':
      project = getEmberAppProject();
      break;
    case 'app-with-utils':
      project = addUtilDirectory(getEmberAppProject());
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
