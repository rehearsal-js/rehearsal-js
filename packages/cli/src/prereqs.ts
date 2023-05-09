// ! these should be the bare minimum versions and config required for rehearsal to work with type inference
// ! deps are >= the version specified

import type { PreReqs, ProjectType, PreReqTSConfig } from './types.js';

// node package.json config must be gte 14
const nodeBasePrereq = '14';

// eslint
const eslintBasePrereq = '@typescript-eslint/parser';

// tsconfig
const tsconfigBasePrereq: PreReqTSConfig = {
  compilerOptions: {
    strict: true,
    skipLibCheck: true,
  },
};

// tsconfig ember app/addon
const tsconfigEmberPrereq: PreReqTSConfig = {
  ...tsconfigBasePrereq,
  glint: {
    environment: 'ember-loose',
  },
};

// tsconfig glimmer
const tsconfigGlimmerPrereq: PreReqTSConfig = {
  ...tsconfigBasePrereq,
  glint: {
    environment: 'glimmerx',
  },
};

// pre-req dependencies for rehearsal. doesn't matter if they are deps or devDeps
const depsBasePreReq = {
  typescript: '4.9.0',
  prettier: '2.0.0',
  eslint: '8.0.0',
  'eslint-import-resolver-typescript': '2.5.0',
  'eslint-plugin-import': '2.0.0',
  'eslint-plugin-node': '11.0.0',
  'eslint-plugin-unicorn': '6.0.0',
  '@typescript-eslint/eslint-plugin': '5.0.0',
  '@typescript-eslint/parser': '5.0.0',
};

// pre-req dependencies for ember app/addon
const depsEmberPreReq = {
  ...depsBasePreReq,
  '@glint/core': '1.0.0',
  '@glint/environment-ember-loose': '1.0.0',
  '@glint/environment-ember-template-imports': '1.0.0',
  '@glint/template': '1.0.0',
  'eslint-plugin-ember': '11.0.0',
  'prettier-plugin-ember-template-tag': '0.3.0',
};

// pre-req dependencies for glimmer
const depsGlimmerPreReq = {
  ...depsBasePreReq,
  '@glint/core': '1.0.0',
  '@glint/environment-glimmerx': '1.0.0',
  '@glint/template': '1.0.0',
  'eslint-plugin-ember': '11.0.0',
  '@glimmerx/prettier-plugin-component-templates': '0.6.0',
};

const preReqs: Record<string, PreReqs> = {
  'base-ts': {
    node: nodeBasePrereq,
    eslint: eslintBasePrereq,
    tsconfig: {
      ...tsconfigBasePrereq,
    },
    deps: {
      ...depsBasePreReq,
    },
  },
  ember: {
    node: nodeBasePrereq,
    eslint: eslintBasePrereq,
    tsconfig: {
      ...tsconfigEmberPrereq,
    },
    deps: {
      ...depsEmberPreReq,
    },
  },
  glimmer: {
    node: nodeBasePrereq,
    eslint: eslintBasePrereq,
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
