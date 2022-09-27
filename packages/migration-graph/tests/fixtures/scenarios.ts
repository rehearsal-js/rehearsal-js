import { Scenarios, Project, Scenario, PreparedApp } from 'scenario-tester';
import { dirname } from 'path';
import merge from 'lodash.merge';
import { execSync } from 'child_process';
import { join } from 'path';
import rimraf from 'rimraf';

const DIR_FIXTURE_EMBER_APP_TEMPLATE = `${__dirname}/ember/app-template`;
const DIR_FIXTURE_EMBER_ADDON_TEMPLATE = `${__dirname}/ember/addon-template`;

export function clean(dir: string): void {
  rimraf.sync(join(dir, 'node_modules'));
}

function prepare(dir: string): void {
  clean(dir);
  // The (app|addon)-template needs a node_modules directory for
  // scenario - tester to craete a Project.fromDir()
  execSync(`volta run npm --version && volta run npm install`, {
    cwd: dir,
    stdio: 'ignore', // Otherwise this will output warning from install command
  });
}

// this scenario represents the last Ember 3.x release
async function ember3(_project: Project) {}

function supportMatrix(scenarios: Scenarios) {
  return scenarios.expand({
    // lts,
    ember3,
    // release,
    // beta,
    // canary,
  });
}

const EMBER_ADDON_CONFIG_EMBER_TRY = `
'use strict';

const { embroiderSafe, embroiderOptimized } = require('@embroider/test-setup');

module.exports = async function () {
  return {
    scenarios: [
      {
        name: 'ember-lts-3.24',
        npm: {
          devDependencies: {
            'ember-source': '~3.24.3',
          },
        },
      },
      {
        name: 'ember-lts-3.28',
        npm: {
          devDependencies: {
            'ember-source': '~3.28.0',
          },
        },
      },
      {
        name: 'ember-default-with-jquery',
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            'jquery-integration': true,
          }),
        },
        npm: {
          devDependencies: {
            '@ember/jquery': '^1.1.0',
          },
        },
      },
      {
        name: 'ember-classic',
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            'application-template-wrapper': true,
            'default-async-observers': false,
            'template-only-glimmer-components': false,
          }),
        },
        npm: {
          devDependencies: {
            'ember-source': '~3.28.0',
          },
          ember: {
            edition: 'classic',
          },
        },
      },
      embroiderSafe(),
      embroiderOptimized(),
    ],
  };
};
`;

function app(project: Project) {
  merge(project.files, {
    'ember-cli-build.js': `
      const EmberApp = require('ember-cli/lib/broccoli/ember-app');
      module.exports = function (defaults) {
        let app = new EmberApp(defaults, {
          autoImport: {
            forbidEval: true
          }
        });
        return app.toTree();
      };
    `,
    app: {
      components: {
        'salutation.js': `
          import Component from '@glimmer/component';

          export default class Salutation extends Component {
            get name() {
              return 'Bob';
            }
          }
        `,
        'salutation.hbs': `Hello {{this.name}}`,
      },
      templates: {
        'application.hbs': `
          <div id='app-container'>
            {{outlet}}
          </div>
        `,
        'index.hbs': `<Salutation/>`,
      },
    },
    tests: {
      acceptance: {
        'index-test.js': `
          import { module, test } from 'qunit';
          import { visit, currentURL } from '@ember/test-helpers';
          import { setupApplicationTest } from 'ember-qunit';

          module('Acceptance | Index', function (hooks) {
            setupApplicationTest(hooks);

            test('visiting /', async function (assert) {
              await visit('/');

              assert.equal(currentURL(), '/');

              assert
                .dom('#app-container')
                .hasText(
                  'Hello Bob',
                  'The user can see usage of the Salutation component'
                );
            });
          });
        `,
      },
    },
  });
}

/**
 * Augments the project to have an in-repo addon with an acceptance test to evalute the composition.
 * @param {Project} project
 * @param {string} [addonName='some-addon']
 */
function appWithInRepoAddon(project: Project, addonName = 'some-addon') {
  app(project);

  // augment package.json with
  project.pkg['ember-addon'] = {
    paths: [`lib/${addonName}`],
  };

  let files: Record<string, any> = {
    app: {
      components: {
        'salutation.hbs': `<h1><Greet/></h1>`,
      },
    },
    lib: {},
    tests: {
      acceptance: {
        'index-test.js': `
          import { module, test } from 'qunit';
          import { visit, currentURL } from '@ember/test-helpers';
          import { setupApplicationTest } from 'ember-qunit';

          module('Acceptance | Index', function (hooks) {
            setupApplicationTest(hooks);

            test('visiting /', async function (assert) {
              await visit('/');

              assert.equal(currentURL(), '/');

              assert
                .dom('#app-container')
                .hasText(
                  'Hello Sue, from an in-repo-addon!',
                  'The in-repo-addon is being used to render'
                );
            });
          });
          `,
      },
    },
  };

  const addon = {
    addon: {
      components: {
        'greet.js': `
          import Component from '@glimmer/component';

          export default class Greet extends Component {
            get name() {
              return 'Sue';
            }
          }
        `,
        'greet.hbs': 'Hello {{this.name}}, from an in-repo-addon!',
      },
    },
    app: {
      components: {
        'greet.js': `export { default } from '${addonName}/components/greet';`,
      },
    },
    'index.js': `
      'use strict';

      module.exports = {
        name: require('./package').name,

        isDevelopingAddon() {
          return true;
        },
      };
      `,
    'package.json': `
      {
        "name": "${addonName}",
        "keywords": [
          "ember-addon"
        ],
        "dependencies": {
          "ember-cli-babel": "*",
          "ember-cli-htmlbars": "*",
          "@glimmer/component": "*"
        }
      }
    `,
  };

  files.lib[addonName] = addon;

  merge(project.files, files);
}

function appWithInRepoEngine(project: Project, engineName = 'some-engine') {
  app(project);

  project.pkg['ember-addon'] = {
    paths: [`lib/${engineName}`],
  };
  project.addDevDependency('ember-engines', '0.8.23');

  let files: Record<string, any> = {
    app: {
      'router.js': `
        import EmberRouter from '@ember/routing/router';
        import config from 'app-template/config/environment';

        export default class Router extends EmberRouter {
          location = config.locationType;
          rootURL = config.rootURL;
        }

        Router.map(function () {
          this.mount('${engineName}');
        });
      `,
    },
    lib: {},
    tests: {
      acceptance: {},
    },
  };
  // Add acceptance test for validating that our engine is mounted and routable
  files.tests.acceptance[`${engineName}-test.js`] = `
    import { module, test } from 'qunit';
    import { visit, currentURL } from '@ember/test-helpers';
    import { setupApplicationTest } from 'ember-qunit';

    module('Acceptance | some-engine', function (hooks) {
      setupApplicationTest(hooks);

      test('visiting /', async function (assert) {
        await visit('/some-engine');

        assert.equal(currentURL(), '/some-engine');

        assert
          .dom('#app-container')
          .hasText('Hello from some-engine/index', 'The user can see Hello World');
      });
    });
  `;

  const engine = {
    addon: {
      'engine.js': `
        import Engine from 'ember-engines/engine';
        import loadInitializers from 'ember-load-initializers';
        import Resolver from './resolver';
        import config from './config/environment';

        const { modulePrefix } = config;

        const Eng = Engine.extend({
          modulePrefix,
          Resolver,
        });

        loadInitializers(Eng, modulePrefix);

        export default Eng;
      `,
      'resolver.js': `import Resolver from 'ember-resolver';

        export default Resolver;
      `,
      'routes.js': `import buildRoutes from 'ember-engines/routes';

        export default buildRoutes(function () {
          // Define your engine's route map here
          this.route('some-page');
        });
      `,
      templates: {
        'application.hbs': `{{outlet}}`,
        'some-page.hbs': `Hello from some-engine/some-page`,
        'index.hbs': `Hello from some-engine/index`,
      },
    },
    config: {
      'environment.js': `
        /* eslint-env node */
        'use strict';

        module.exports = function (environment) {
          let ENV = {
            modulePrefix: '${engineName}',
            environment,
          };

          return ENV;
        };
      `,
    },
    'index.js': `
      /* eslint-env node */
      'use strict';
      // Need to add this disable rule because it's blocking lint.
      // eslint-disable-next-line node/no-extraneous-require
      const EngineAddon = require('ember-engines/lib/engine-addon');

      module.exports = EngineAddon.extend({
        name: '${engineName}',

        lazyLoading: Object.freeze({
          enabled: false,
        }),

        isDevelopingAddon() {
          return true;
        },
      });
    `,
    'package.json': `
      {
        "name": "${engineName}",
        "keywords": [
          "ember-addon",
          "ember-engine"
        ],
        "dependencies": {
          "ember-cli-babel": "*",
          "ember-cli-htmlbars": "*"
        }
      }
    `,
  };

  // Add the
  files.lib[engineName] = engine;

  merge(project.files, files);
}

function addon(project: Project) {
  // For now we are only making compat tests for ember-source >=3.24 and < 4.0
  merge(project.files, {
    config: {
      'ember-try.js': EMBER_ADDON_CONFIG_EMBER_TRY,
    },
    addon: {
      components: {
        'greet.js': `
            import Component from '@glimmer/component';
  
            export default class Greet extends Component {
              get name() {
                return 'Sue';
              }
            }
          `,
        'greet.hbs': 'Hello {{this.name}}, from an addon!',
      },
    },
    app: {
      components: {
        'greet.js': `export { default } from 'addon-template/components/greet';`,
      },
    },
    tests: {
      dummy: {
        app: {
          templates: {
            'application.hbs': `
              <div id='app-container'>
                {{outlet}}
              </div>
            `,
            'index.hbs': `<Greet/>`,
          },
        },
      },
      acceptance: {
        'addon-template-test.js': `
          import { module, test } from 'qunit';
          import { visit, currentURL } from '@ember/test-helpers';
          import { setupApplicationTest } from 'ember-qunit';
      
          module('Acceptance | addon-template', function (hooks) {
            setupApplicationTest(hooks);
      
            test('visiting /', async function (assert) {
              await visit('/');
      
              assert.equal(currentURL(), '/');
      
              assert
                .dom('#app-container')
                .hasText('Hello Sue, from an addon!', 'The user can see Hello World');
            });
          });
        `,
      },
    },
  });

  // Add acceptance test for validating that our engine is mounted and routable;
}

function appVariants(scenarios: Scenarios) {
  return scenarios.expand({
    app,
    appWithInRepoAddon,
    appWithInRepoEngine,
  });
}

function baseApp() {
  return Project.fromDir(dirname(require.resolve('./ember/app-template/package.json')), {
    linkDevDeps: true,
  });
}

export const appScenarios = appVariants(supportMatrix(Scenarios.fromProject(baseApp)));

function baseAddon(as: 'addon' | 'dummy-app' = 'addon') {
  return Project.fromDir(dirname(require.resolve('./ember/addon-template/package.json')), {
    linkDeps: true,
    linkDevDeps: as === 'dummy-app',
  });
}

function addonVariants(scenarios: Scenarios) {
  return scenarios.expand({
    addon,
  });
}

export const addonScenarios = addonVariants(
  supportMatrix(Scenarios.fromProject(() => baseAddon('dummy-app')))
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

  const cmd = 'volta run npm install';

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

export async function getEmberApp(variantName: string): Promise<PreparedApp> {
  const scenario = await pluck(appScenarios, variantName);
  return await getPreparedApp(scenario);
}

export async function getEmberAddon(variantName: string): Promise<PreparedApp> {
  const scenario = await pluck(addonScenarios, variantName);
  return await getPreparedApp(scenario);
}
