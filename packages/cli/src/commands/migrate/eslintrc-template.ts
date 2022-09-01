module.exports = {
  parser: '',
  plugins: [
    '@typescript-eslint',
    'import',
    'simple-import-sort',
    'prettier',
    'filenames',
    'eslint-plugin-tsdoc',
    '@linkedin/typescript',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: ['classProperty', 'method', 'accessor'],
        format: ['camelCase'],
      },
      {
        selector: 'variableLike',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: ['enumMember'],
        format: ['PascalCase', 'UPPER_CASE'],
      },
      {
        selector: ['property'],
        format: ['UPPER_CASE'],
        modifiers: ['readonly', 'static'],
      },
    ],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'tsdoc/syntax': 'error',
    '@linkedin/typescript/consistent-alias-convention': 'error',
    '@typescript-eslint/no-unused-vars': 'error',

    '@typescript-eslint/no-parameter-properties': 'error',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      },
    ],
    'sort-imports': 'off',
    'node/no-missing-import': 'off',
    'import/no-extraneous-dependencies': 'error',
    'import/no-unassigned-import': 'error',
    'import/no-duplicates': 'error',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/no-mutable-exports': 'error',
    'no-new-wrappers': 'error',
    'no-new-object': 'error',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.tsm', '*.tsc'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      settings: {
        'import/external-module-folders': ['node_modules', 'node_modules/@types'],
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
          node: {
            extensions: ['.ts', '.tsx', '.tsm', '.tsc', '.json'],
          },
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
};
