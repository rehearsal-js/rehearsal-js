// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const glob = require('glob');

const packages = glob
  .sync('./packages/*/')
  .map((p) => {
    const moduleName = p.replace('packages', '@rehearsal');
    return {
      name: moduleName,
      message: `Do not import from "${moduleName}" in the top-level of the cli package. It may pull in TypeScript eagerly and it may not be installed into the application being migrated. If you need to use "${moduleName}" please use dynamic import e.g. \`await import('${moduleName}')\` within an 'action' of a command. If you're 100% positive the module will not pull in TypeScript eagerly, please update the .eslint.cjs file to enable it's usage in the cli package.`,
    };
  })
  .filter((p) => p.name !== '@rehearsal/utils');

// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  plugins: ['@typescript-eslint', 'import', 'prettier', 'filenames'],
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'prettier',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:import/recommended',
  ],
  overrides: [
    {
      files: ['./packages/cli/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          ...packages,
          {
            name: 'typescript',
            message: `Do not import 'typescript' into this package. This will result in a 'module not found' error in app that is being migrated. If you are creating a typescript util, put it in 'ts-utils'.`,
          },
        ],
      },
    },

    {
      files: ['./packages/utils/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            name: 'typescript',
            message: `Do not import 'typescript' into this package as it's used in the cli package which installs TypeScript into the app being migrated. This will result in a 'module not found' error in app that is being migrated. If you are creating a typescript util, put it in 'ts-utils'.`,
          },
        ],
      },
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
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'fixtures',
    '*.config.*',
    'release.js',
    'processDiagnosticMessages.mjs',
    'packages/codefixes/src/diagnosticInformationMap.generated.ts',
  ],
};
