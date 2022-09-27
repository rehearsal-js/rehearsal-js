# @rehearsal/cli

Terminal and File reporter for @rehearsal/cli

## Installation

Based on your tooling/package manager choice:

```
volta install @rehearsal/cli
```

Or

```
yarn global add  @rehearsal/cli
```

Or

```
pnpm install -g @rehearsal/cli
```

## Usage

### rehearsal CLI

Simply run `rehearsal` after installing. Currently there are two subcommands (`migrate`, `upgrade`), and a lot of options/flag. Run any command with flag `-h` to check the detailed information.

### Custom configuration in `rehearsal migrate`

There are default tasks in `rehearsal migrate` command to help install dependencies, create `tsconfig.json` and setup `eslint` for `typescript`. You can also pass a path to a custom user config file with `-u`, to install additional dependencies and run any custom command you need to help config ts and lint.

Assuming we have a `rehearsal-config.json`:

```
{
  "upgradeConfig": {},
  "migrateConfig": {
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
      },
    }
  }
}
```

You can run:

```
rehearsal migrate -p <project root> -e <entrypoint file> -u ./rehearsal-config.json
```

## Dev Guide

### CLI and sub-command structure

This CLI uses [`Commander Stand-alone executable (sub)commands`](https://github.com/tj/commander.js#stand-alone-executable-subcommands), while `src/index.ts` represents the top level CLI and each file in `src/commands` represents a single sub command. The executable is located in `bin/rehearsal.js`.

### Testing

We are using [`vitest`](https://vitest.dev/) as the test framework, and the main test helper to run command during test is the `run` function in `test/test-helper.ts`, which is an `execa` wrapper using `ts-node` to run corresponding files located in `src/commands/`. You can also grab the `stdout` and `stderr` via the returned value of the `run` helper function.

One current limitation is that we are not able to use watch mode in `vitest`, since there would be some commands (e.g. `git checkout`) triggering endless re-run during test.
