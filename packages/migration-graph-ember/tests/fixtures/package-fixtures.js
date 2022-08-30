'use strict';

const fs = require('fs');
const path = require('path');

function json(jsonObj = {}) {
  return JSON.stringify(jsonObj, null, 2);
}

const PACKAGE_FIXTURE_NAMES = {
  PLAIN_PACKAGE: 'plain-package',
  SIMPLE_ADDON: 'simple-addon',
  SIMPLE_ENGINE: 'simple-engine',
  ADDON_WITH_MODULE_NAME: 'addon-with-module-name',
  ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN: 'addon-with-simple-custom-module-name',
  ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN:
    'addon-with-complex-custom-module-name',
  WORKSPACE_CONTAINER: 'workspace-container',
  NON_WORKSPACE_IN_WORKSPACE_CONTAINER: 'non-workspace',
  SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER: 'simple-workspace-addon',
  MULTIPLE_EXPORTS_FROM_ADDON_MAIN: 'multiple-exports-from-addon-main',
};

const PACKAGE_FIXTURES = {};
// a non-ember package
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE] = {
  'index.js': fs.readFileSync(
    path.join(__dirname, 'simple-addon', 'index.js'),
    'utf-8'
  ),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
  }),
};
// a simple addon
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON] = {
  'index.js': fs.readFileSync(
    path.join(__dirname, 'simple-addon', 'index.js'),
    'utf-8'
  ),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// a simple engine
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE] = {
  'index.js': fs.readFileSync(
    path.join(__dirname, 'simple-addon', 'index.js'),
    'utf-8'
  ),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.SIMPLE_ENGINE,
    version: '1.0.0',
    keywords: ['ember-addon', 'ember-engine'],
    dependencies: {
      foo: '1.0.0',
    },
    devDependencies: {
      bar: '0.0.1',
    },
    'ember-addon': {
      paths: ['../simple-addon'],
    },
  }),
};
// an addon with a custom module name
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME] = {
  'index.js': `'use strict';

    const { name } = require('./package');

    module.exports = {
      name,
      moduleName: () => '${PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME',
      isDevelopingAddon: () => true,
      includeTestsInHost: true,
    };
  `,
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// an addon with a more complex addon-main
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN] = {
  'index.js': `'use strict';

    const { name } = require('./package');

    module.foo = 'taco';

    module.exports = {
      name,
      isDevelopingAddon: () => true,
      includeTestsInHost: true,
    };
  `,
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// an addon with a simple custom package main file
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN] =
  {
    'index.js': fs.readFileSync(
      path.join(__dirname, 'simple-addon', 'index.js'),
      'utf-8'
    ),
    'ember-addon-main.js': `'use strict';

    const { name } = require('./package');

    module.exports = {
      name,
      moduleName: () => '${PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN}',
      fileName: __filename.split(/[\\/]/).pop(),
      isDevelopingAddon: () => true,
      includeTestsInHost: true,
    };
    `,
    'package.json': json({
      name: PACKAGE_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN,
      version: '1.0.0',
      keywords: ['ember-addon'],
      'ember-addon': {
        main: 'ember-addon-main.js',
        paths: [],
      },
    }),
  };

// an addon with a complex custom package main file
PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN] =
  {
    'index.js': fs.readFileSync(
      path.join(__dirname, 'simple-addon', 'index.js'),
      'utf-8'
    ),
    'ember-addon-main.js': `'use strict';

  const { name } = require('./package.json');

  const voyagerAddon = (string, obj) => obj;
  class BPREngineAddon {
    static extend = (obj) => obj;
    name = 'taco';
  };

  module.exports = voyagerAddon(
    __dirname,
    BPREngineAddon.extend({
      name: '${PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN}',
      moduleName: () => '${PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN}',
      lazyLoading: { enabled: true },
      includeTestsInHost: true,
      isDevelopingAddon: () => true,
    })
  );
  `,
    'package.json': json({
      name: PACKAGE_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN,
      version: '1.0.0',
      keywords: ['ember-addon'],
      'ember-addon': {
        main: 'ember-addon-main.js',
        paths: [],
      },
    }),
  };

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER] = {
  'package.json': json({
    name: 'workspace-container',
    private: true,
    workspaces: ['packages/*'],
  }),
  packages: {},
};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER][
  PACKAGE_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER
] = {
  'index.js': fs.readFileSync(
    path.join(__dirname, 'simple-addon', 'index.js'),
    'utf-8'
  ),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.WORKSPACE_CONTAINER].packages[
  PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER
] = {
  'index.js': fs.readFileSync(
    path.join(__dirname, 'simple-addon', 'index.js'),
    'utf-8'
  ),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// export the fixture and names for easier mapping
module.exports = {
  PACKAGE_FIXTURE_NAMES,
  PACKAGE_FIXTURES,
};
