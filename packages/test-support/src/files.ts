import fixturify from 'fixturify';

export const FILE_EMBER_ADDON_CONFIG_EMBER_TRY = `
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

export const FILES_EMBER_APP = {
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
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service locale;
          get name() {
            if (this.locale.current() == 'en-US') {
              return 'Bob';
            }
            return 'Unknown';
          }
        }
      `,
      'salutation.hbs': `Hello {{this.name}}`,
    },
    services: {
      'locale.js': `
      import Service from '@ember/service';

      export default class LocaleService extends Service {
        current() {
          return 'en-US';
        }
      }
      `,
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
    unit: {
      services: {
        'locale-test.js': `
        import { module, test } from 'qunit';
        import { setupTest } from 'ember-qunit';

        module('Unit | Service | locale', function(hooks) {
          setupTest(hooks);

          test('it exists', function(assert) {
            let service = this.owner.lookup('service:locale');
            assert.ok(service);
            assert.equal(service.current(), 'en-US', 'should match current() locale');
          });
        });
        `,
      },
    },
  },
};

export function getEmberAddonConfigEmberyTryFile(): string {
  return FILE_EMBER_ADDON_CONFIG_EMBER_TRY;
}
export function getEmberAppFiles(): fixturify.DirJSON {
  return FILES_EMBER_APP;
}

export function getEmberAppWithInRepoAddonFiles(addonName = 'some-addon'): fixturify.DirJSON {
  const addon = getEmberAddonWithInRepoAddonFiles(addonName);

  const lib: Record<string, fixturify.DirJSON> = {};

  lib[addonName] = addon;

  const files: fixturify.DirJSON = {
    app: {
      components: {
        'salutation.hbs': `<h1><Greet/></h1>`,
      },
    },
    lib: lib as fixturify.DirJSON,
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

  return files;
}

export function getEmptyInRepoAddonFiles(addonName = 'some-addon'): fixturify.DirJSON {
  return {
    addon: {},
    app: {},
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
}

export function getEmberAddonWithInRepoAddonFiles(addonName = 'some-addon'): fixturify.DirJSON {
  return {
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
}

export function getEmberAddonFiles(): fixturify.DirJSON {
  return {
    config: {
      'ember-try.js': FILE_EMBER_ADDON_CONFIG_EMBER_TRY,
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
  };
}

export function getEmberAppWithInRepoEngine(engineName = 'some-engine'): fixturify.DirJSON {
  const files: Record<string, any> = {
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

  // Add the egine to lib directory
  files.lib[engineName] = engine;

  return files as fixturify.DirJSON;
}
