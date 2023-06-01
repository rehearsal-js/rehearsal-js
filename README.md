# Rehearsal

[![Build Status](https://github.com/rehearsal-js/rehearsal-js/workflows/CI/badge.svg)](https://github.com/rehearsal-js/rehearsal-js/actions?workflow=CI)
[![Version](https://img.shields.io/npm/v/@rehearsal/cli.svg)](https://www.npmjs.com/package/@rehearsal/cli)

Rehearsal is a CLI tool with 3 commands (Graph | Move | Fix), which aim to improve the experience of both migrating to TypeScript and once migrated, upgrading your repo to future versions of TypeScript.

## How does Rehearsal help with TypeScript migrations?

Rehearsal is capable of maintaining proper migration order from leaf to trunk. It is generic enough to allow for the migration of JS to TS for all web applications. It allows for both multi-pass and single-pass migration processes. It provides industry standard, type inference wherever possible and provides the ability to monitor micro migration steps with macro insights.

Once your source code is moved to TypeScript, Rehearsal will fix as many errors as possible. Unresolved errors will be annotated and suppressed with a [Rehearsal TODO](#what-is-a-rehearsal-todo). This allows for safe iteration, to a strictly typed project.

The following codefixes are supported by Rehearsal, which resolve over one hundred different TypeScript diagnostics errors. The detailed list is published [here](https://github.com/rehearsal-js/rehearsal-js/blob/master/Supported-Fixes.md)

## How does Rehearsal help with upgrading versions of TypeScript?

Rehearsal also supports the continuous testing of pre-released versions of TypeScript. Essentially this is running the `fix` command with an early-release TypeScript version in a GH Action. For example after you’ve migrated your app to TypeScript with strictness you would run this action daily against the beta version of TypeScript.

Rehearsal `fix` will generate a report showing you exactly what will break, what was auto fixed by Rehearsal and what will need to be fixed manually. With flagged compiler diagnostic errors culled into a multi-format report which can be embedded within a PR. This provides plenty of headroom to mitigate any breaking changes in the TypeScript compiler against the app.

# Setup / Pre-Reqs

Ensure your project has the following [pre-reqs](https://github.com/rehearsal-js/rehearsal-js/blob/master/packages/cli/src/prereqs.ts) for dependencies and configurations:

## Dependencies

These deps are the bare minimum versions and config required for Rehearsal to infer types in your project. All deps listed are >= the version specified:

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

ESlint Config file must have the parser set to `@typescript-eslint/parser`

## TSConfig

The root tsconfig.json must have the following key/values:

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

Once installed with pre-req's complete, invoke using your package manager:

```bash
yarn rehearsal
# or
pnpm rehearsal
```

## Available Commands

Rehearsal CLI exposes 3 commands `graph` | `move` | `fix`. These commands function in isolation and are expected to be run in sequence. This "pause" in execution allows the developer time to handle the output and mutations of each command.

## `rehearsal graph`

```
rehearsal graph

Usage: rehearsal graph [options] [srcPath]

produces the migration order of files given a source path

Arguments:
  srcPath                  path to a directory or file (default:
                           "/Users/malynch/D/rehearsal-js/packages/cli")

Options:
  --ignore [globs...]      comma-delimited list of globs to ignore eg. '--ignore
                           tests/**/*,types/**/*' (default: [])
  -o, --output <filepath>  output path for a JSON or grapviz format of the graph order eg.
                           '--output graph.json' or '--output graph.dot'
  -x, --externals          includes external dependencies in the output. only valid with
                           '--output'.
  -h, --help               display help for command
```

The graph command produces file import graph for a project. This is useful for seeing what files will be migrated and moved.

If your project is very large (a monorepo or workspace) you can use the rehearsal graph command to find what is the leaf-most package and migrate it first.

Using the leaf-most file, will ensure any settled types, will propagate to dependents, improving the overall migration experience and quality of type inference.

## `rehearsal move`

```
rehearsal move

Usage: rehearsal move|mv [options] [srcPath]

graph aware git mv from .js -> .ts

Arguments:
  srcPath              path to a directory or file (default: "")

Options:
  --graph              fixing all file(s) within the graph, which might include files
                       outside of the current directory
  --ignore [globs...]  comma-delimited list of globs to ignore eg. '--ignore
                       tests/**/*,types/**/*' (default: [])
  -d, --dryRun         do nothing; only show what would happen (default: false)
  -h, --help           display help for command
```

This command performs a file rename (e.g. `.ts`, `.tsx`, `.gts`, `.mjs`) and git move against the targeted files in your project and will leverage the migration graph. Once this command has finished running, commit the changes and continue to the `fix` command.

## `rehearsal fix`

```
rehearsal fix

Usage: rehearsal fix|infer [options] [srcPath]

fixes typescript compiler errors by inferring types on .*ts files

Arguments:
  srcPath                path to file or directory to migrate (default:
                         "/Users/malynch/D/rehearsal-js/packages/cli")

Options:
  --graph                fixing all file(s) within the graph, which might include files
                         outside of the current directory
  --ignore [globs...]    comma-delimited list of globs to ignore eg. '--ignore
                         tests/**/*,types/**/*' (default: [])
  -f, --format <format>  report format separated by comma, e.g. -f json,sarif,md,sonarqube
                         (default: ["sarif"])
  -h, --help             display help for command
```

This command will run against a TypeScript project and infer types for you. There's a lot going on under the hood here!

Rehearsal will do its best to infer types, via a series of plugins (rarely will Rehearsal infer a loose type). Type inference is a complex problem, and Rehearsal is not perfect. Under the hood Rehearsal will infer types from JSDoc, ESLint, TypeScript Compiler and Rehearsal Plugins. Rehearsal relies on the projects tsconfig.json being configured correctly, as it pertains to [include](https://www.typescriptlang.org/tsconfig#include), [references](https://www.typescriptlang.org/tsconfig#references) and [paths](https://www.typescriptlang.org/tsconfig#paths).

Many times there are multiple possible types Rehearsal can infer, and it will choose the first one. This is not always the correct type, and you will need to manually fix these errors. Rehearsal will report these errors in the report file and with inline "`@ts-expect-error @rehearsal TODO`" comments in the code.

# Workflow

For a given project like:

```
vitest.config.js
docs
test
├──main.test.js
src
├──app.js
└── lib
    ├── gen-random-grid.js
    └── nested
        ├── apply-rules.js
        └── get-live-neighbor-count.js
```

Some of these files import into each other. We want to infer the types of the outermost leaf first. Have Rehearsal look at the graph of files, and determine the file migration order and ignore some files and directories and output the graph into a .json doc.

```
rehearsal graph --ignore 'vitest.*,docs/*' --output migration-graph.json
...
✔ Analyzing project dependency graph ...
  › Graph order for '.':
    src/lib/gen-random-grid.js
    src/lib/nested/get-live-neighbor-count.js
    src/lib/nested/apply-rules.js
    src/app.js
    test/main.test.js
```

Rehearsal has traversed the import graph in this _trivial_ example and provided the exact order the migration should happen, starting with `src/lib/gen-random-grid.js`. Lets start migrating files. Use `rehearsal move` to move files to TypeScript.

```
rehearsal move . --ignore 'vitest.*,docs/*'
...
✔ Validating source path
✔ Analyzing project dependency graph ...
  › Graph order for '.':
    src/lib/gen-random-grid.js
    src/lib/nested/get-live-neighbor-count.js
    src/lib/nested/apply-rules.js
    src/app.js
    test/main.test.js
✔ Executing git mv
  › renamed:
    /src/lib/gen-random-grid.js -> /src/lib/gen-random-grid.ts
    /src/lib/nested/get-live-neighbor-count.js -> /src/lib/nested/get-live-neighbor-count.ts
    /src/lib/nested/apply-rules.js -> /src/lib/nested/apply-rules.ts
    /src/app.js -> /src/app.ts
    /test/main.test.js -> /test/main.test.ts
```

We've pointed Rehearsal at the root of our project `.`, ignored some files and directories and had Rehearsal `move` while leveraging the import graph. Our project is now partially migrated to TypeScript. Before we can continue to the next step of implementing types, we need to manually configure our project and install missing devDependencies. Let's run Rehearsal `fix` without doing this and see what happens.

```
rehearsal fix . --ignore 'vitest.*,docs/*'
...
✖ /tsconfig.json does not exists. Please run rehearsal inside a project with a valid tsconfig.…
◼ Analyzing project dependency graph
◼ Infer Types
```

Rehearsal has a series of pre-flight checks it will validate against [pre-reqs](https://github.com/rehearsal-js/rehearsal-js/blob/master/packages/cli/src/prereqs.ts) before it can start inferring types. As you can see Rehearsal cannot find the `tsconfig.json` in the root of our project, because we've not added it yet. Follow the "Setup / Pre-Reqs" directions above adding any missing config files (tsconfig.json / .eslintrc.json) and missing devDependencies ... Now lets re-run `fix` against our project and see what we get:

```
rehearsal fix . --ignore 'vitest.*,docs/*'
...
✔ Initialize
✔ Analyzing project dependency graph ...
  › Graph order for '.':
    src/lib/gen-random-grid.ts
    src/lib/nested/get-live-neighbor-count.ts
    src/lib/nested/apply-rules.ts
    src/app.ts
    test/main.test.ts
✔ Types Inferred
  10 errors caught by rehearsal
  6 have been fixed by rehearsal
  4 errors need to be fixed manually
  -- 4 ts errors, marked by @ts-expect-error @rehearsal TODO
  -- 0 eslint errors, with details in the report
```

Our project is now on TypeScript with types! Rehearsal has caught 10 TypeScript compiler errors and auto-fixed 6 of them for us. The next step is commit our changes and review the generated Rehearsal report to manually type tighten wherever Rehearsal has flagged a TODO.

In this example Rehearsal has fixed 60% of the compiler errors. Sometimes however, the types Rehearsal can inference are minimal. Which is why the `fix` command can be run repeatedly ex. `fix` -> manual type tuning -> `fix` -> manual type tuning -> `fix`.

# Rehearsal Reports

Rehearsal will generate a report file in the process.cwd() directory.

```
rehearsal-report.json
rehearsal-report.sarif
```

- The `rehearsal-report.*` file contains all the information that Rehearsal has gathered during the fix process. It also contains the list of errors that need to be fixed manually.

- The report is available with multiple [formatters](https://github.com/rehearsal-js/rehearsal-js/tree/master/packages/reporter/src/formatters) in JSON, MD, SARIF and SONARQUBE.

- You can [view the SARIF report in VSCode](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer) and easily navigate to the errors from the report directly into your code.

- Additionally, Rehearsal will inline `@ts-expect-error @rehearsal TODO` comments in the code for each error.

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
- Once fixed, if you open your IDE (VSCode for example) you should notice a **red squiggly** underline to the `@ts-expect-error` annotation. The red squiggle underline, is TypeScript communicating that expected error will no longer occur if this were to compile.

## Improve Typing

You can improve typing by adding additional typed packages to the project. For example:

```
@types/node
@types/jest
@types/mocha
```

You will find out which types packages to add after you run rehearsal migrate and when you inspect the rehearsal TODOS. Once you add these packages, run `rehearsal fix`

## Known Limitations

Rehearsal will do its best to infer types, via a series of plugins. Type inference is a complex problem, and Rehearsal is not perfect. Under the hood Rehearsal will infer types from JSDoc, ESLint, TypeScript Compiler and Rehearsal Plugins. Many times there are multiple possible types Rehearsal can infer, and it will choose the first one. This is not always the correct type, and you will need to manually fix these errors. Rehearsal will report these errors in the "rehearsal-report" file and with inline "`@ts-expect-error @rehearsal TODO`" comments in the code.
