import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { RehearsalService } from '@rehearsal/service';
import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  ImportsNotUsedAsValues,
  JsxEmit,
} from 'typescript';
import { format } from 'prettier';
import { TypescriptCodeFixCollection } from '../src/typescript-codefix-collection.js';
import { getDiagnosticOrder } from '../src/get-diagnostics.js';
import { applyCodeFix } from '../src/codefixes.js';
import { CodeFixes } from '../src/codefixInformationMap.generated.js';

describe('ts-codefixes', () => {
  const tsCollection = new TypescriptCodeFixCollection();

  test('has test for all codefixes', async () => {
    await Promise.all(
      Object.entries(CodeFixes).map(async ([key, value]) => {
        if (!value.builtIn) {
          try {
            expect(
              (await fs.stat(resolve(`./test/fixtures/ts-codefixes/${key}`))).isDirectory()
            ).toBe(true);
          } catch (e) {
            expect(`Missing test for ${key}.`).toBe('Not Missing');
          }
        }
      })
    );
  });

  async function runTest(
    failingPath: string,
    passingPath: string,
    sidecarFiles: string[] = []
  ): Promise<void> {
    const input = resolve(`./test/fixtures/ts-codefixes/${failingPath}`);
    const expectation = resolve(`./test/fixtures/ts-codefixes/${passingPath}`);
    const service = new RehearsalService(
      {
        strict: true,
        module: ModuleKind.NodeNext,
        target: ScriptTarget.ESNext,
        moduleResolution: ModuleResolutionKind.NodeNext,
        importsNotUsedAsValues: ImportsNotUsedAsValues.Error,
        useUnknownInCatchVariables: true,
        allowUnusedLabels: false,
        experimentalDecorators: true,
        isolatedModules: true,
        noImplicitOverride: true,
        jsx: JsxEmit.ReactJSX,
      },
      [input, ...sidecarFiles.map((file) => resolve(`./test/fixtures/ts-codefixes/${file}`))]
    );
    const ls = service.getLanguageService();
    const program = ls.getProgram()!;
    const checker = program.getTypeChecker();
    const diagnostics = getDiagnosticOrder(service.getDiagnostics(input));

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);

    for (const diagnostic of diagnostics) {
      const fixes = tsCollection.getFixesForDiagnostic(
        {
          ...diagnostic,
          service: ls,
          program,
          checker,
        },
        { safeFixes: true, strictTyping: true }
      );

      for (const fix of fixes) {
        applyCodeFix(fix, {
          getText(filename: string): string {
            return service.getFileText(filename);
          },
          setText(filename: string, text: string) {
            service.setFileText(filename, text);
          },
        });
      }
    }

    expect(format(service.getFileText(input).trim(), { filepath: expectation })).toEqual(
      format(await fs.readFile(expectation, 'utf-8'), { filepath: expectation })
    );
  }

  test('addMissingAync', async () => {
    await runTest('addMissingAsync/failing/fail-1.ts', 'addMissingAsync/passing/pass-1.ts');
  });

  test('addMissingAwait', async () => {
    await runTest('addMissingAwait/failing/fail-1.ts', 'addMissingAwait/passing/pass-1.ts');
  });

  test('addMissingConst', async () => {
    await runTest('addMissingConst/failing/fail-1.ts', 'addMissingConst/passing/pass-1.ts');
  });

  test('addMissingConstraint', async () => {
    await runTest(
      'addMissingConstraint/failing/fail-1.ts',
      'addMissingConstraint/passing/pass-1.ts'
    );
  });

  test('addMissingDeclareProperty', async () => {
    await runTest(
      'addMissingDeclareProperty/failing/fail-1.ts',
      'addMissingDeclareProperty/passing/pass-1.ts'
    );
  });

  test('addMissingInvocationForDecorator', async () => {
    await runTest(
      'addMissingInvocationForDecorator/failing/fail-1.ts',
      'addMissingInvocationForDecorator/passing/pass-1.ts'
    );
  });

  test('addMissingNewOperator', async () => {
    await runTest(
      'addMissingNewOperator/failing/fail-1.ts',
      'addMissingNewOperator/passing/pass-1.ts'
    );
  });

  test('addVoidToPromise', async () => {
    await runTest('addVoidToPromise/failing/fail-1.ts', 'addVoidToPromise/passing/pass-1.ts');
  });

  test('annotateWithTypeFromJSDoc', async () => {
    await runTest(
      'annotateWithTypeFromJSDoc/failing/fail-1.ts',
      'annotateWithTypeFromJSDoc/passing/pass-1.ts'
    );
  });

  test('constructorForDerivedNeedSuperCall', async () => {
    await runTest(
      'constructorForDerivedNeedSuperCall/failing/fail-1.ts',
      'constructorForDerivedNeedSuperCall/passing/pass-1.ts'
    );
  });

  test('convertToTypeOnlyExport', async () => {
    await runTest(
      'convertToTypeOnlyExport/failing/fail-1.ts',
      'convertToTypeOnlyExport/passing/pass-1.ts',
      ['convertToTypeOnlyExport/sample-1.ts']
    );
  });

  test('convertToTypeOnlyImport', async () => {
    await runTest(
      'convertToTypeOnlyImport/failing/fail-1.ts',
      'convertToTypeOnlyImport/passing/pass-1.ts',
      ['convertToTypeOnlyImport/sample-1.ts']
    );
  });

  test('deleteUnmatchedParameter', async () => {
    await runTest(
      'deleteUnmatchedParameter/failing/fail-1.ts',
      'deleteUnmatchedParameter/passing/pass-1.ts'
    );
  });

  test('extendsInterfaceBecomesImplements', async () => {
    await runTest(
      'extendsInterfaceBecomesImplements/failing/fail-1.ts',
      'extendsInterfaceBecomesImplements/passing/pass-1.ts'
    );
  });

  test('fixAwaitInSyncFunction', async () => {
    await runTest(
      'fixAwaitInSyncFunction/failing/fail-1.ts',
      'fixAwaitInSyncFunction/passing/pass-1.ts'
    );
  });

  test('fixMissingAttributes', async () => {
    await runTest(
      'fixMissingAttributes/failing/fail-1.tsx',
      'fixMissingAttributes/passing/pass-1.tsx'
    );
  });

  test('fixMissingMember', async () => {
    await runTest('fixMissingMember/failing/fail-1.ts', 'fixMissingMember/passing/pass-1.ts');
  });

  test('fixMissingProperties', async () => {
    await runTest(
      'fixMissingProperties/failing/fail-1.ts',
      'fixMissingProperties/passing/pass-1.ts'
    );
  });

  test('fixOverrideModifier', async () => {
    await runTest('fixOverrideModifier/failing/fail-1.ts', 'fixOverrideModifier/passing/pass-1.ts');
  });

  test('fixReturnTypeInAsyncFunction', async () => {
    await runTest(
      'fixReturnTypeInAsyncFunction/failing/fail-1.ts',
      'fixReturnTypeInAsyncFunction/passing/pass-1.ts'
    );
  });

  test('inferFromUsage', async () => {
    await runTest('inferFromUsage/failing/fail-1.ts', 'inferFromUsage/passing/pass-1.ts');
  });

  test('removeUnnecessaryAwait', async () => {
    await runTest(
      'removeUnnecessaryAwait/failing/fail-1.ts',
      'removeUnnecessaryAwait/passing/pass-1.ts'
    );
  });

  test('requireInTs', async () => {
    await runTest('requireInTs/failing/fail-1.ts', 'requireInTs/passing/pass-1.ts', [
      'requireInTs/a.ts',
    ]);
  });

  test('unusedIdentifier', async () => {
    await runTest('unusedIdentifier/failing/fail-1.ts', 'unusedIdentifier/passing/pass-1.ts');
  });
});
