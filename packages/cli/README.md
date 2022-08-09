# @rehearsal/cli

Terminal and File reporter for @rehearsal/cli

## Dev Guide

### CLI and sub-command structure

This CLI uses [`Commander Stand-alone executable (sub)commands`](https://github.com/tj/commander.js#stand-alone-executable-subcommands), while `src/index.ts` represents the top level CLI and each file in `src/commands` represents a single sub command. The executable is located in `bin/rehearsal.js`.


### Testing

We are using [`vitest`](https://vitest.dev/) as the test framework, and the main test helper to run command during test is the `run` function in `test/test-helper.ts`, which is an `execa` wrapper using `ts-node` to run corresponding files located in `src/commands/`.

## TODO
- Currently every time when running the test, `package.json` and `../../yarn.lock` would be modified, since it would install a test version of `tsc` BEFORE switching to the `rehearsal-bot` branch. So as a result, `rehearsal-bot` clean up process won't clean the dirty files in your current working branch. We need to fix it. 
