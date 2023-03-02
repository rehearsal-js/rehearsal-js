import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function json(jsonObj = {}) {
  return JSON.stringify(jsonObj, null, 2);
}

const EMBER_FIXTURE_NAMES = {
  PLAIN_PACKAGE: 'plain-package',
  SIMPLE_APP: 'simple-app',
  SIMPLE_ADDON: 'simple-addon',
  SIMPLE_ENGINE: 'simple-engine',
  ADDON_WITH_MODULE_NAME: 'addon-with-module-name',
  ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN: 'addon-with-simple-custom-module-name',
  ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN: 'addon-with-complex-custom-module-name',
  WORKSPACE_CONTAINER: 'workspace-container',
  NON_WORKSPACE_IN_WORKSPACE_CONTAINER: 'non-workspace',
  SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER: 'simple-workspace-addon',
  MULTIPLE_EXPORTS_FROM_ADDON_MAIN: 'multiple-exports-from-addon-main',
};

const EMBER_FIXTURES: { [key: string]: any } = {};

// Stub this with a package.json becuase this directory of FIXTURES is use for genearting module mappings.
EMBER_FIXTURES['package.json'] = json({
  name: 'some-root',
  version: '0.0.0',
});

// a non-ember package
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.PLAIN_PACKAGE] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
  }),
};

// a simple app
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.SIMPLE_APP] = {
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.SIMPLE_APP,
    version: '1.0.0',
    dependencies: {},
    devDependencies: {
      'ember-source': '^3.28.0',
    },
  }),
};

// a simple addon
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.SIMPLE_ADDON] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.SIMPLE_ADDON,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// a simple engine
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.SIMPLE_ENGINE] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.SIMPLE_ENGINE,
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
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME] = {
  'index.js': `'use strict';

    const { name } = require('./package');

    module.exports = {
      name,
      moduleName: () => '${EMBER_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME}-SPECIFIED-IN-MODULENAME',
      isDevelopingAddon: () => true,
      includeTestsInHost: true,
    };
  `,
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.ADDON_WITH_MODULE_NAME,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// an addon with a more complex addon-main
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN] = {
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
    name: EMBER_FIXTURE_NAMES.MULTIPLE_EXPORTS_FROM_ADDON_MAIN,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// an addon with a simple custom package main file
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
  'ember-addon-main.js': `'use strict';

    const { name } = require('./package');

    module.exports = {
      name,
      moduleName: () => '${EMBER_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN}',
      fileName: __filename.split(/[\\/]/).pop(),
      isDevelopingAddon: () => true,
      includeTestsInHost: true,
    };
    `,
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.ADDON_WITH_SIMPLE_CUSTOM_PACKAGE_MAIN,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      main: 'ember-addon-main.js',
      paths: [],
    },
  }),
};

// an addon with a complex custom package main file
EMBER_FIXTURES[EMBER_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
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
      name: '${EMBER_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN}',
      moduleName: () => '${EMBER_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN}',
      lazyLoading: { enabled: true },
      includeTestsInHost: true,
      isDevelopingAddon: () => true,
    })
  );
  `,
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.ADDON_WITH_COMPLEX_CUSTOM_PACKAGE_MAIN,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      main: 'ember-addon-main.js',
      paths: [],
    },
  }),
};

EMBER_FIXTURES[EMBER_FIXTURE_NAMES.WORKSPACE_CONTAINER] = {
  'package.json': json({
    name: 'workspace-container',
    private: true,
    workspaces: ['packages/*'],
  }),
  packages: {},
};

EMBER_FIXTURES[EMBER_FIXTURE_NAMES.WORKSPACE_CONTAINER][
  EMBER_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER
] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};

EMBER_FIXTURES[EMBER_FIXTURE_NAMES.WORKSPACE_CONTAINER].packages[
  EMBER_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER
] = {
  'index.js': readFileSync(join(__dirname, 'simple-addon', 'index.js'), 'utf-8'),
  'package.json': json({
    name: EMBER_FIXTURE_NAMES.SIMPLE_ADDON_IN_WORSKAPCE_CONTAINER,
    version: '1.0.0',
    keywords: ['ember-addon'],
    'ember-addon': {
      paths: [],
    },
  }),
};
// export the fixture and names for easier mapping
export { EMBER_FIXTURES as FIXTURES, EMBER_FIXTURE_NAMES as FIXTURE_NAMES };
