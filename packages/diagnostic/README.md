# @rehearsal/diagnostic

Rehearsal Diagnostic tool helps to test your source code against any TypeScript version (including beta and nightly build) and get a list of compiler diagnostic messages as @ts-ignore comments.

## Usage

```shell
yarn add -D @rehearsal/diagnose 
```

```ts
import diagnose from '@rehearsal/diagnostic';

const result = await diagnose(
  basePath,           // path to a project source directory
  configName,         // tsconfig file name, default: 'tsconfig.json',
  reportName,         // report file name, default: '.rehearsal-diagnostics.json',
  modifySourceFiles,  // add @ts-ignore comments, default: true
  logger,             // winston.Logger, default: undefined
);

console.log(result);
```

```
Usage: diagnose [options] <basePath>

Compiles TypeScript project and provides diagnostic reports and comments.

Arguments:
basePath             Path to the source directory.

Options:
-c, --config <name>  Name of the tsconfig file. (default: "tsconfig.json")
-r, --report <name>  Report file name. (default: ".rehearsal-diagnostics.json")
-m, --modify         Add diagnostic @ts-ignore comments to source files
-v, --verbose        Display diagnostic progress
-h, --help           display help for command
```
