'use strict';

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    browser: true,
  },
  'rules': {
    'no-unused-vars': 'off'
  },
  'ignorePatterns': [
    'dist/',
    'node_modules/',
    '!.*'
  ],
  overrides: [
    {
      'files': [
        '.babelrc.js',
        'testem.js',
        'webpack.config.js'
      ],
      'env': {
        'node': true
      }
    }
  ]
};
