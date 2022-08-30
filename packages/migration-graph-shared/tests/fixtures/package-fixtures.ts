import fs from 'fs';
import path from 'path';

function json(jsonObj = {}) {
  return JSON.stringify(jsonObj, null, 2);
}

const PACKAGE_FIXTURE_NAMES = {
  PLAIN_PACKAGE: 'plain-package',
  PLAIN_PACKAGE_WITH_DEPENDENCIES: 'plain-package-with-dependencies',
  WORKSPACE_CONTAINER: 'workspace-container',
  NON_WORKSPACE_IN_WORKSPACE_CONTAINER: 'non-workspace',
  PACKAGE_IN_WORKSPACE_CONTAINER: 'package-in-workspace',
};

const PACKAGE_FIXTURES: { [key: string]: any } = {};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE] = {
  'index.js': fs.readFileSync(path.join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
    keywords: ['super', 'simple'],
    'some-package-key': {
      paths: ['index.js'],
    },
  }),
};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE_WITH_DEPENDENCIES] = {
  'index.js': fs.readFileSync(path.join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
    keywords: ['super', 'simple'],
    'some-package-key': {
      paths: ['index.js'],
    },
    dependencies: {
      bar: '0.0.0',
    },
    devDependencies: {
      bar: '0.0.0',
    },
  }),
};

// export the fixture and names for easier mapping
export { PACKAGE_FIXTURES as FIXTURES, PACKAGE_FIXTURE_NAMES as FIXTURE_NAMES };
