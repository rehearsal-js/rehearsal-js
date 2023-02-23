import fs from 'node:fs';
import path from 'node:path';

function json(jsonObj = {}) {
  return JSON.stringify(jsonObj, null, 2);
}

const WORKSPACE_FIXTURE_NAMES = {
  WORKSPACE_CONTAINER: 'workspace-container',
  NON_WORKSPACE_IN_WORKSPACE_CONTAINER: 'non-workspace',
  PACKAGE_IN_WORKSPACE_CONTAINER: 'package-in-workspace',
};

const WORKSPACE_FIXTURES: { [key: string]: any } = {};

WORKSPACE_FIXTURES[WORKSPACE_FIXTURE_NAMES.WORKSPACE_CONTAINER] = {
  'package.json': json({
    name: 'workspace-container',
    private: true,
    workspaces: ['packages/*'],
  }),
  packages: {},
};

WORKSPACE_FIXTURES[WORKSPACE_FIXTURE_NAMES.WORKSPACE_CONTAINER][
  WORKSPACE_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER
] = {
  'index.js': fs.readFileSync(path.join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: WORKSPACE_FIXTURE_NAMES.NON_WORKSPACE_IN_WORKSPACE_CONTAINER,
    version: '1.0.0',
    keywords: ['yet-another-lib'],
    'some-package-key': {
      paths: [],
    },
  }),
};

WORKSPACE_FIXTURES[WORKSPACE_FIXTURE_NAMES.WORKSPACE_CONTAINER].packages[
  WORKSPACE_FIXTURE_NAMES.PACKAGE_IN_WORKSPACE_CONTAINER
] = {
  'index.js': fs.readFileSync(path.join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: WORKSPACE_FIXTURE_NAMES.PACKAGE_IN_WORKSPACE_CONTAINER,
    version: '1.0.0',
    keywords: ['yet-another-chat-application'],
    'some-package-key': {
      paths: [],
    },
  }),
};
// export the fixture and names for easier mapping
export { WORKSPACE_FIXTURES as FIXTURES, WORKSPACE_FIXTURE_NAMES as FIXTURE_NAMES };
