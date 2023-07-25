# @rehearsal/codefixes

Rehearsal Dependency Transforms Collection based on [TSC Diagnostic](https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json)

Rehearsal leverages the TypeScript Language Service for file transformation. The supported transforms are enumerated in [`./src/codefixesMessages.json`](./src/codefixesMessages.json). This file is used to generate runtime TypeScript code that is leveraged during transformation, tests and generates [documentation](../../Supported-Fixes.md).

# Adding New Codefixes in Rehearsal (TypeScript Language Service)

To add a new codefix to Rehearsal, which uses the TypeScript Language Service for file transformation, follow these steps:

1. Identify the codefix you want to add from the [list of codefixes](https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes) in TypeScript.

2. Open the file [./src/codefixesMessages.json](./src/codefixesMessages.json) in Rehearsal and add a new entry with the following information:

- `entry key`: This should be the same as the codefix's `fixName`. You can find it from the values of the first parameter of `createCodeFixAction*` functions related to the codefix file.
- `title` and `description`: These will be used in the generated [Supported-Fixes.md](./Supported-Fixes.md) documentation.
- `messages`: These are the codes of messages related to the codefix. You can find them from the values of the third parameter of `createCodeFixAction*` functions in the codefix file.
- `diagnostics`: These are the diagnostic codes related to the codefix. You can find them from the values of the first parameter of the `registerCodeFix` function in the codefix file.

3. Create new directories in [./test/fixtures/ts-codefixes](./test/fixtures/ts-codefixes/) to add failing and passing fixtures for the newly added codefix.

4. Write a test within [./test/codefixes.test.ts](./test/codefixes.test.ts) to test the functionality of the codefix. It's essential to add the test for the codefix; otherwise, the test suite will fail.

5. Run `pnpm generate` command to regenerate the documentation and the runtime codefix objects.

6. Finally, run `pnpm test` to ensure that the newly added codefix passes all the tests. This step verifies the correctness and reliability of the codefix.

By following these steps, you can successfully add a new codefix to Rehearsal and make it available for use in TypeScript Language Service transformations.
