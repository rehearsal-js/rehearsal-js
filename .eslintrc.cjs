

// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    project: [
      './packages/*/tsconfig.json',
      './packages/*/test/tsconfig.json',
      './tsconfig.eslint.json',
    ],
  },
  plugins: ['@typescript-eslint', 'import', 'prettier', 'filenames'],
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'prettier',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:import/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  overrides: [
    {
      files: ['./packages/*/test/**/*.ts'],
      rules: {
        "import/no-extraneous-dependencies": ['off']
      }
    },
  ],
  rules: {
    curly: 'error',
    'import/no-default-export': 'error',
    'import/no-duplicates': 'error',
    'import/no-extraneous-dependencies': 'error',
    'import/no-unassigned-import': 'error',
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
    'import/named': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
      },
    ],
    'prettier/prettier': [
      'error',
      {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'es5',
      },
      {
        usePrettierrc: false,
      },
    ],
    '@typescript-eslint/restrict-template-expressions': ['off'],
    '@typescript-eslint/no-use-before-define': [
      'error',
      {
        functions: false,
      },
    ],
    '@typescript-eslint/interface-name-prefix': ['off'],
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
    '@typescript-eslint/no-non-null-assertion': ['off'],
    '@typescript-eslint/no-inferrable-types': ['off'],
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '_' }],
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'fixtures',
    '*.config.*',
    'release.js',
    '.eslintrc.cjs',
    'packages/test-support/scripts/setup-fixtures.js',
    'packages/migrate/scripts/*.js',
    'scripts/*.mjs',
    'packages/codefixes/src/*.generated.ts',
  ],
};
