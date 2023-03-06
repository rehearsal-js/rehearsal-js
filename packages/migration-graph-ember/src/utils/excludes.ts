import { getExcludePatterns } from '@rehearsal/migration-graph-shared';

const EMBER_FILES = [
  '.ember-cli.js',
  '.template-lint.js', // ember-template-lint
  'ember-cli-build.js',
  'ember-config.js',
  'index.js', // Ignore index.js because it's a CJS use to interact with the build pipeline.
  'testem.js',
];
const EMBER_DIRS = ['config', 'ember-config', 'public'];
const EMBER_PACKAGE_NAMESPACE = ['@ember/*'];

export function getEmberExcludePatterns(): string[] {
  return [...getExcludePatterns(), ...EMBER_DIRS, ...EMBER_FILES, ...EMBER_PACKAGE_NAMESPACE];
}
