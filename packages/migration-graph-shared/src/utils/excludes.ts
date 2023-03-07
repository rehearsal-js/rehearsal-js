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
