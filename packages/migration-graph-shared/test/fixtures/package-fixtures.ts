import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function json(jsonObj = {}) {
  return JSON.stringify(jsonObj, null, 2);
}

const PACKAGE_FIXTURE_NAMES = {
  PLAIN_PACKAGE: 'plain-package',
  PLAIN_PACKAGE_WITH_DEPENDENCIES: 'plain-package-with-dependencies',
  WORKSPACE_CONTAINER: 'workspace-container',
  NON_WORKSPACE_IN_WORKSPACE_CONTAINER: 'non-workspace',
  PACKAGE_IN_WORKSPACE_CONTAINER: 'package-in-workspace',
  PACKAGE_CONTAINS_TYPESCRIPT: 'package-with-typescript',
  PACKAGE_TSCONFIG_BUT_NO_FILES: 'package-tsconfig-but-no-ts-files',
};

const PACKAGE_FIXTURES: { [key: string]: any } = {};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE] = {
  'index.js': readFileSync(join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
    keywords: ['super', 'simple'],
    'some-package-key': {
      paths: ['index.js'],
    },
  }),
};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PACKAGE_CONTAINS_TYPESCRIPT] = {
  'index.ts': readFileSync(join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
    keywords: ['super', 'simple'],
    'some-package-key': {
      paths: ['index.js'],
    },
  }),
  'tsconfig.json': json({
    compilerOptions: {
      module: 'commonjs',
      noImplicitAny: true,
      removeComments: true,
      preserveConstEnums: true,
      sourceMap: true,
    },
    files: ['index.ts'],
  }),
};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PACKAGE_TSCONFIG_BUT_NO_FILES] = {
  'index.js': readFileSync(join(__dirname, 'test-package', 'index.js'), 'utf-8'),
  'package.json': json({
    name: PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE,
    version: '1.0.0',
    keywords: ['super', 'simple'],
    'some-package-key': {
      paths: ['index.js'],
    },
  }),
  'tsconfig.json': json({
    compilerOptions: {
      module: 'commonjs',
      noImplicitAny: true,
      removeComments: true,
      preserveConstEnums: true,
      sourceMap: true,
    },
    files: ['index.ts'],
  }),
};

PACKAGE_FIXTURES[PACKAGE_FIXTURE_NAMES.PLAIN_PACKAGE_WITH_DEPENDENCIES] = {
  'index.js': readFileSync(join(__dirname, 'test-package', 'index.js'), 'utf-8'),
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
