# Adding TS Codefixes

Rehearsal leverages the TypeScript Language Service for file transformation. The supported transforms are enumerated in [`./src/codefixesMessages.json`](./src/codefixesMessages.json). This file is used to generate runtime TypeScript code that is leveraged during transformation, tests and generates [documentation](../../Supported-Fixes.md).

## Adding New Codefixes

To enable Rehearsal to use a new codefix TypeScript Language Service. Please follow these instructructions.

1. Find the codefix you want to add from the [list of codefixes](https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes) in TypeScript.
2. Add a new entry to [`./src/codefixesMessages.json`](./src/codefixesMessages.json) with a title, description, and the associated diagnostics. The diagnostics will have the same names as the ones in the TypeScript codebase and should be imported from [diagnosticInformationMap.generated.ts](./src/diagnosticInformationMap.generated.ts) and can be found in the codefix within the TypeScript codebase.
3. Add failing and passing fixtures by creating a new directory in [`./test/fixtures/ts-codefixes`](./test/fixtures/ts-codefixes/).
4. Add a test within [./test/codefixes.test.ts](./test/codefixes.test.ts). If you do not add the test for the codefix the test suite will fail.
5. Run `pnpm generate` to regenerate the documentation and the runtime codefix objects
6. Run `pnpm test` to make sure the codefixes pass
