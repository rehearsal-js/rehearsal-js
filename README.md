# Rehearsal

[![Build Status](https://github.com/rehearsal-js/rehearsal-js/workflows/CI/badge.svg)](https://github.com/rehearsal-js/rehearsal-js/actions?workflow=CI)
[![Version](https://img.shields.io/npm/v/@rehearsal/cli.svg)](https://www.npmjs.com/package/@rehearsal/cli)

Rehearsal is a CLI tool which helps to improve the experience of both migrating to TypeScript and once migrated, upgrading your repo to future versions of TypeScript.

## How does Rehearsal help with migration?

Rehearsal is capable of maintaining proper migration order from leaf to trunk. It is generic enough to allow for the migration of JS to TS for all web applications. It allows for both multi-pass and single-pass migration processes. It provides industry standard, type inference wherever possible and provides the ability to monitor micro migration steps with macro insights.

Once your source code is moved to TypeScript, Rehearsal will fix as many errors as possible. Unresolved errors will be annotated and surpressed with with a [Rehearsal TODO](#what-is-a-rehearsal-todo). This allows for safe iteration, to a strictly typed project.

## How does Rehearsal help with upgrading versions of TypeScript?

Rehearsal can be executed both manually and automated. Rehearsal creates a system which is capable of testing nightly and beta releases of TypeScript so that you can receive early signals on potential breaking changes in the TypeScript compiler. Additionally, Rehearsal can autofix type errors flagged by the compiler. It tests your TypeScript project against a newer version of TypeScript, transforms the code to align it with the new TypeScript version and provides Rehearsal tasks which enable a manual type tighten for strictness.

# Setup / Pre-Reqs

Ensure your project has the following [pre-reqs](https://github.com/rehearsal-js/rehearsal-js/blob/master/packages/cli/src/prereqs.ts) for dependencies and configurations:

## Dependencies
These deps are the bare minimum versions and config required for rehearsal to work with type inference. All deps listed are >= the version specified.

### Base For All Projects
```
  typescript: '4.9.0',
  prettier: '2.0.0',
  eslint: '8.0.0',
  'eslint-import-resolver-typescript': '2.5.0',
  'eslint-plugin-import': '2.0.0',
  'eslint-plugin-node': '11.0.0',
  'eslint-plugin-unicorn': '40.0.0',
  '@typescript-eslint/eslint-plugin': '5.0.0',
  '@typescript-eslint/parser': '5.0.0'
```
### Base + Ember
```
  '@glint/core': '1.0.0',
  '@glint/environment-ember-loose': '1.0.0',
  '@glint/environment-ember-template-imports': '1.0.0',
  '@glint/template': '1.0.0',
  'eslint-plugin-ember': '11.0.0',
  'prettier-plugin-ember-template-tag': '0.3.0'
```
### Base + Glimmer
```
  '@glint/core': '1.0.0',
  '@glint/environment-glimmerx': '1.0.0',
  '@glint/template': '1.0.0',
  'eslint-plugin-ember': '11.0.0',
  '@glimmerx/prettier-plugin-component-templates': '0.6.0'
```

## ESLint Config
ESlint Config file must set the parser to `@typescript-eslint/parser`

## TSConfig
The root tsconfig.json must have the following keys set.

### Base For All Projects
```
compilerOptions: {
  strict: true,
  skipLibCheck: true,
}
```
### Base + Ember
```
glint: {
  environment: 'ember-loose',
}
```
### Base + Glimmer
```
glint: {
  environment: 'glimmerx',
}
```


# Installation

Add `@rehearsal/cli` to your project as a **devDependency**.

```bash
yarn add -D @rehearsal/cli
# or
pnpm add -D @rehearsal/cli
```

Note: `@rehearsal/cli` must be installed as a devDependency as it requires your project's version of TypeScript to run.

# Usage
Once installed, invoke using your package manager:

```bash
yarn rehearsal
# or
pnpm rehearsal
```

## Available Commands

### `rehearal graph` (optional)

The graph command produces a package and file import graph for a project. This is useful for seeing what files will be migrated and moved.

If your project is very large (a monorepo or workspace) you can use the rehearsal graph command to find what is the leaf-most package and migrate it first.

Using the leaf-most file or package, will ensure any settled types, will propagate to dependents, improving the overall migration experience.

```bash
yarn rehearsal graph
```

Given a project:
```
src
├──index.js
└── lib
    ├── a-file.js
    ├── b-file.js
    └── nested
        ├── aa-file.js
        └── bb-file.js
```

## `rehearsal move`
```
yarn rehearsal move
```

This command performs a file rename (e.g. `.ts`, `.tsx`, `.gts`) and git move against the targeted files in your project.

# Workflow

For a given project like:

```
src
├──index.js
└── lib
    ├── a-file.js
    ├── b-file.js
    └── nested
        ├── aa-file.js
        └── bb-file.js
```

Optioanl, look at the graph of files, and determine which files should be migrated.

```
yarn rehearsal graph
TBD

yarn rehearsal graph -e src/lib/a-file.js
TBD
```

Use  `rehearsal move` to move files to TypeScript.
```
yarn rehearsal move -e src/lib/a-file.js
files renamed to:
TBD
```

Run **rehearsal fix** to fix and report any issues.
```
yarn rehearsal fix
TBD
```



# Rehearsal Reports

Rehearsal will generate a report file in the process.cwd() directory.

```
rehearsal-report.json
rehearsal-report.sarif
```

- The `rehearsal-report.*` file contains all of the information that Rehearsal has gathered during the fix process. It also contains the list of errors that need to be fixed manually.

- The report is available with multiple [formatters](https://github.com/rehearsal-js/rehearsal-js/tree/master/packages/reporter/src/formatters) in JSON, MD, SARIF and SONARQUBE.

- You can [view the SARIF report in VSCode](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer) and easily navigate to the errors from the report directly into your code.

- Additionally Rehearsal will inline `@ts-expect-error @rehearsal TODO` comments in the code for each error.

## What is a `@rehearsal TODO`

A Rehearsal TODO is a comment which provides insight to a developer on exactly what and where the TypeScript compiler has flagged an issue.

An example of a @rehearsal TODO:
```typescript
/* @ts-expect-error @rehearsal TODO TS2339: Property 'id' does not exist on type 'object'. */
let id = entityInfo.id;
```

- `@ts-expect-error` is an assertion that the following line will have a type error and the TypeScript compiler should ignore it.
The TypeScript error that we need to address is: TS2339: Property 'id' does not exist on type 'object'.

[View the list of rehearsal's supported fixes](https://github.com/rehearsal-js/rehearsal-js/blob/master/Supported-Fixes.md)

## How to fix a `@rehearsal TODO`
```typescript
/* @ts-expect-error @rehearsal TODO TS2339: Property 'id' does not exist on type 'object'. */
let id = entityInfo.id;
```
- In this case the entityInfo object would need to declare that it has a property called id through a type or interface.
- Once fixed, if you open your IDE (VSCode for example) you should notice a **red squiggly** underline to the `@ts-expect-error` annotation. The red squiggle underline, is TypeScript communicating that expected error will no longer occure if this were to compile.


## Improve Typing
You can improve typing by adding additional typed packages to the project. For example:

```
@types/node
@types/jest
@types/mocha
```

You will find out which types packages to add after you run rehearsal migrate and when you inspect the rehearsal TODOS. Once you add these packages, run `rehearsal fix --report`


## Known Limitations

Rehearsal will do its best to infer types, via a series of plugins. Type inference is a complex problem, and Rehearsal is not perfect. Under the hood Rehearsal will infer types from JSDoc, ESLint, TypeScript Compiler and Rehearsal Plugins. Many times there are multiple possible types Rehearsal can infer, and it will choose the first one. This is not always the correct type, and you will need to manually fix these errors. Rehearsal will report these errors in the report file in the "./rehearsal/" directory and with inline "`@ts-expect-error @rehearsal TODO`" comments in the code.
