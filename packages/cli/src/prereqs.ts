// ! these should be the bare minimum versions and config required for rehearsal to work with type inference
// ! deps are >= the version specified

import type { PreReqs, ProjectType } from './types.js';
// node package.json config must be gte 14
const nodeBasePrereq = '14';

// eslint
const eslintBasePrereq = {
  parser: '@typescript-eslint/parser',
};

// tsconfig
const tsconfigBasePrereq = {
  compilerOptions: {
    strict: true,
    skipLibCheck: true,
  },
};

// tsconfig ember app/addon
const tsconfigEmberPrereq = {
  ...tsconfigBasePrereq,
  glint: {
    environment: ['ember-loose', 'ember-template-imports'],
    checkStandaloneTemplates: true,
  },
};

// tsconfig glimmer
const tsconfigGlimmerPrereq = {
  ...tsconfigBasePrereq,
  glint: {
    environment: ['glimmerx'],
    checkStandaloneTemplates: true,
  },
};

// pre-req dependencies for rehearsal. doesn't matter if they are deps or devDeps
const depsBasePreReq = {
  typescript: '5.0.0',
  prettier: '2.8.0',
  eslint: '8.0.0',
  'eslint-plugin-prettier': '4.0.0',
  'eslint-config-prettier': '8.0.0',
  'eslint-import-resolver-typescript': '3.0.0',
  'eslint-plugin-import': '2.0.0',
  'eslint-plugin-node': '11.0.0',
  'eslint-plugin-unicorn': '6.0.0',
  '@typescript-eslint/eslint-plugin': '5.0.0',
  '@typescript-eslint/parser': '5.0.0',
};

// pre-req dependencies for ember app/addon
const depsEmberPreReq = {
  ...depsBasePreReq,
  '@glint/core': '1.0.1',
  '@glint/environment-ember-loose': '1.0.1',
  '@glint/environment-ember-template-imports': '1.0.1',
  '@glint/template': '1.0.1',
  'ember-cli-typescript': '5.0.0',
  'ember-template-imports': '3.0.0',
  'eslint-plugin-ember': '11.0.0',
  'prettier-plugin-ember-template-tag': '0.3.0',
};

// pre-req dependencies for glimmer
const depsGlimmerPreReq = {
  ...depsBasePreReq,
  '@glint/core': '1.0.1',
  '@glint/environment-glimmerx': '1.0.1',
  '@glint/template': '1.0.1',
  'eslint-plugin-ember': '11.0.0',
  '@glimmerx/prettier-plugin-component-templates': '0.6.0',
};

const preReqs: Record<string, PreReqs> = {
  base: {
    node: nodeBasePrereq,
    eslint: {
      ...eslintBasePrereq,
    },
    tsconfig: {
      ...tsconfigBasePrereq,
    },
    deps: {
      ...depsBasePreReq,
    },
  },
  ember: {
    node: nodeBasePrereq,
    eslint: {
      ...eslintBasePrereq,
    },
    tsconfig: {
      ...tsconfigEmberPrereq,
    },
    deps: {
      ...depsEmberPreReq,
    },
  },
  glimmer: {
    node: nodeBasePrereq,
    eslint: {
      ...eslintBasePrereq,
    },
    tsconfig: {
      ...tsconfigGlimmerPrereq,
    },
    deps: {
      ...depsGlimmerPreReq,
    },
  },
};

export function getPreReqs(type: ProjectType): PreReqs {
  return preReqs[type];
}
