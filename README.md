### **!NOTE:** _REHEARSAL IS A BETA RELEASE TOOL AND AN ACTIVE WORK IN PROGRESS. THE TOOL IS CURRENTLY BEING AUDITED FOR EARLY ACCESS AND BREAKING OFTEN. GENERAL USE IS NOT YET RECOMMENDED._

<br/>

# Rehearsal

[![Build Status](https://github.com/rehearsal-js/rehearsal-js/workflows/CI/badge.svg)](https://github.com/rehearsal-js/rehearsal-js/actions?workflow=CI)
[![Version](https://img.shields.io/npm/v/@rehearsal/cli.svg)](https://www.npmjs.com/package/@rehearsal/cli)
[![License](https://img.shields.io/npm/l/tracerbench.svg)](https://github.com/TracerBench/tracerbench/blob/master/package.json)

Rehearsal is a CLI tool which helps to improve the experience of both migrating to TypeScript and once migrated, upgrading your repo to future versions of TypeScript.

## Migrate

Rehearsal Migrate can be executed both manually and automated. It is capable of maintaining proper migration order from leaf to trunk. It is generic enough to allow for the migration of JS to TS for all web applications. It allows for both multi-pass and single-pass migration processes with a PR for each step. It provides industry standard, type inference wherever possible and provides the ability to monitor micro migration steps with macro insights. Once migrated to TypeScript, Rehearsal tasks enable a manual type tighten for strictness. After all tasks have been completed, Rehearsal Upgrade takes over. All in all, Rehearsal Migrate will increase your productivity when migrating a given JavaScript project to TypeScript.

## Upgrade

Rehearsal Upgrade can be executed both manually and automated. Rehearsal creates a system which is capable of testing nightly and beta releases of TypeScript so that you can receive early signals on potential breaking changes in the TypeScript compiler. Additionally, Rehearsal can autofix type errors flagged by the compiler. It tests your TypeScript project against a newer version of TypeScript, transforms the code to align it with the new TypeScript version and provides Rehearsal tasks which enable a manual type tighten for strictness.

# CLI

## Installation

Simply run `rehearsal` after installing. Currently there are two subcommands (`migrate`, `upgrade`), and a lot of options/flag. Run any command with flag `-h` to check the detailed information.

```bash
volta install @rehearsal/cli
# or
yarn global add  @rehearsal/cli
# or
pnpm install -g @rehearsal/cli
```

## Quick Start - Migrate

```bash
# install rehearsal cli
pnpm install -g @rehearsal/cli

# cd into your javascript project
cd my-js-project

# run rehearsal migrate with an entrypoint to your source file directory
# entrypiont should be inside your project root directory (where you run rehearsal migrate)
~/my-js-project rehearsal migrate --entrypoint ./src

# ... rehearsal does some magic

# @rehearsal/migrate 1.0.2-beta
# ✔ Initialize
# ✔ Install dependencies
# ✔ Create tsconfig.json
# ✔ Create eslint config
# ✔ Add package scripts
# ✔ Migration Complete
#   85 JS files converted to TS
#   322 errors caught by rehearsal
#   156 have been fixed by rehearsal
#   166 errors need to be fixed manually
#   -- 67 ts errors, marked by @ts-expect-error @rehearsal TODO
#   -- 99 eslint errors, with details in the report
```

Rehearsal Migrate has performed the following tasks:

- Initialize: Rehearsal will scan the project dependency graph and determine the proper migration order, from leaf to root. This is critical for proper type inference. Rehearsal will handle file extension changes from .js to .ts via a git mv command. For partial migrations, Rehearsal will manage the migration state in a generated file which you can checkin for migration handoff.
- Install dev-dependencies: Rehearsal requires the following [dev-dependencies](https://github.com/rehearsal-js/rehearsal-js/blob/1f1b5f9499c9a2b93999dd0da274110c184a104b/packages/cli/src/commands/migrate/tasks/dependency-install.ts#L6-L15) to be installed for proper type inference and will handle this work for you.
- Create tsconfig.json: Rehearsal will create a tsconfig.json file with the proper settings for your project with strictness enabled. If an tsconfig.json file already exists, Rehearsal will add the appropriate settings to it for strictness.
- Create eslint config: Rehearsal will create an eslint config file with the proper settings for your project. If an eslint config file already exists, Rehearsal will extend it into a new file called ".rehearsal-eslintrc.js" in the root directory.
- Add package scripts: Rehearsal will add package.json scripts for tsc build `'build:tsc': 'tsc -b'` and lint `'lint:tsc': 'tsc --noEmit'`.
- Migration Complete: Rehearsal has completed the migration process. It will report the number of files converted to TypeScript, the number of errors caught by Rehearsal, the number of errors fixed by Rehearsal, and the number of errors that need to be fixed manually. All of this information is also available in the report file in the "./rehearsal/" directory.

## Interactive Mode - Migrate

With the interactive mode flag `--interactive` or `-i`, Rehearsal will prompt you to confirm each step of the migration process. This is useful if you want to review the changes before committing.

## Migrate by Directory

With the flag `--entrypoint` or `-e`, Rehearsal will migrate by directory. If you run `migrate -e directoryA` and `migrate -e directoryB` sequentially, Rehearsal will give you a report that merge both runs. 

## Rehearsal Reports

Rehearsal will generate a report file in the "./rehearsal/" directory. This report file contains all of the information that Rehearsal has gathered during the migration process. It also contains the list of errors that need to be fixed manually. The report is available with multiple [formatters](https://github.com/rehearsal-js/rehearsal-js/tree/master/packages/reporter/src/formatters) in JSON, MD, SARIF and SONARQUBE.

In combination with the VSCode SARIF Viewer extension, you can view the SARIF report in VSCode and easily navigate to the errors from the report directly into your code. Additionally Rehearsal will inline `@ts-expect-error @rehearsal TODO` comments in the code for each error.

## Optional Config File

Rehearsal also can read from a custom user config file. This is useful if you want to customize the migration process. For example, you can add additional dependencies to be installed during the migration process. You can also add custom setup tasks to be run during the migration process. The config file is a JSON file with the following structure:

**rehearsal-config.json**
```json
{
  "$schema": "https://raw.githubusercontent.com/rehearsal-js/rehearsal-js/master/packages/cli/rehearsal-config-schema.json",
  "upgrade": {},
  "migrate": {
    "install": {
      "devDependencies": ["foo", "bar"],
      "dependencies": ["baz"]
    },
    "setup": {
      "ts": {
        "command": "echo",
        "args": ["run custom ts setup"]
      },
      "lint": {
        "command": "echo",
        "args": ["run custom lint setup"]
      }
    }
  }
}
```

## Known Limitations

Rehearsal will do its best to infer types, via a series of plugins. Type inference is a complex problem, and Rehearsal is not perfect. Under the hood Rehearsal will infer types from JSDoc, ESLint, TypeScript Compiler and Rehearsal Plugins. Many times there are multiple possible types that Rehearsal can infer, and it will choose the first one. This is not always the correct type, and you will need to manually fix these errors. Rehearsal will report these errors in the report file in the "./rehearsal/" directory and with inline "`@ts-expect-error @rehearsal TODO`" comments in the code.

# Packages

| Folder                                    | Version                                                                                                              | Package                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [packages/cli](./packages/cli/)           | [![npm version](https://badge.fury.io/js/@rehearsal%2Fcli.svg)](https://badge.fury.io/js/@rehearsal%2Fcli)           | [@rehearsal/cli](https://www.npmjs.com/package/@rehearsal/cli)           |
| [packages/migrate](packages/migrate/)     | [![npm version](https://badge.fury.io/js/@rehearsal%2Fmigrate.svg)](https://badge.fury.io/js/@rehearsal%2Fmigrate)   | [@rehearsal/migrate](https://www.npmjs.com/package/@rehearsal/migrate)   |
| [packages/upgrade](packages/upgrade/)     | [![npm version](https://badge.fury.io/js/@rehearsal%2Fupgrade.svg)](https://badge.fury.io/js/@rehearsal%2Fupgrade)   | [@rehearsal/migrate](https://www.npmjs.com/package/@rehearsal/upgrade)   |
| [packages/reporter](./packages/reporter/) | [![npm version](https://badge.fury.io/js/@rehearsal%2Freporter.svg)](https://badge.fury.io/js/@rehearsal%2Freporter) | [@rehearsal/reporter](https://www.npmjs.com/package/@rehearsal/reporter) |
| [packages/service](./packages/service/)   | [![npm version](https://badge.fury.io/js/@rehearsal%2Fservice.svg)](https://badge.fury.io/js/@rehearsal%2Fservice)   | [@rehearsal/service](https://www.npmjs.com/package/@rehearsal/service)   |
| [packages/utils](./packages/utils/)       | [![npm version](https://badge.fury.io/js/@rehearsal%2Futils.svg)](https://badge.fury.io/js/@rehearsal%2Futils)       | [@rehearsal/utils](https://www.npmjs.com/package/@rehearsal/utils)       |

# License

BSD 2-Clause, see [LICENSE.md](LICENSE.md) for details
