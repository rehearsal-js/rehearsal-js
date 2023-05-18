const FILE_PATTERNS = [
  // ESLint
  '.eslintrc.*',

  // Babel
  '.babelrc.*',
  'babel.config.*',

  // Broccolijs
  'Brocfile.js',

  // Prettier
  '.prettierrc.*',
  'prettier.config.*',

  // Karma
  'karma.config.*',

  // rehearsal
  '.rehearsal-eslintrc.js',

  // webpack
  'webpack.config.js',

  // vite
  'vite.config.ts',

  // testem
  '**/testem.js',

  // ember
  '**/ember-cli-build.js',
];

const DIRECTORY_PATTERNS = [
  // yarn3
  '.yarn',

  // build output
  'dist',
];

export function getExcludePatterns(): string[] {
  return [...FILE_PATTERNS, ...DIRECTORY_PATTERNS];
}
