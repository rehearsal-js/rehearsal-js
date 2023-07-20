'use strict';

module.exports = {
  overrides: [
    {
      files: '*.{js,ts}',
      options: {
        singleQuote: true,
      },
    },
    {
      files: '*.hbs',
      options: {
        parser: 'glimmer',
      },
    },
    {
      files: '*.gjs, *.gts',
      options: {
        parser: 'glimmer',
        singleQuote: true,
      },
    },
  ],
  plugins: ['prettier-plugin-ember-template-tag'],
};
