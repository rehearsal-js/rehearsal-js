import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts, {
  type CodeActionCommand,
  type CodeFixAction,
  FileTextChanges,
  type FormatCodeSettings,
  TextChange,
  type UserPreferences,
} from 'typescript';
import type { CodeFixCollectionFilter, CodeFixCollection, DiagnosticWithContext } from './types.js';
import type { Options as PrettierOptions } from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = Module.createRequire(import.meta.url);

const { SemicolonPreference, getDefaultFormatCodeSettings } = ts;

/**
 * Provides code fixes based on the Typescript's codefix collection.
 * @see https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
 */
export class TypescriptCodeFixCollection implements CodeFixCollection {
  hasPrettier: boolean | undefined;
  prettierConfigs: PrettierOptions | undefined;

  // List of safe to apply code fix names
  // @see available-fix-names.md for the list of available fixNames
  safeCodeFixNames = [
    'addMissingAsync', // addMissingAsync.ts
    'addMissingAwait', // addMissingAwait.ts
    'addMissingAwaitToInitializer', // addMissingAwait.ts
    'addMissingConst', // addMissingConst.ts
    'addMissingConstraint', // fixAddMissingConstraint.ts
    'addMissingDeclareProperty', // addMissingDeclareProperty.ts
    'addMissingInvocationForDecorator', // addMissingInvocationForDecorator.ts
    'addMissingNewOperator', // fixAddMissingNewOperator.ts
    'addOptionalPropertyUndefined', // addOptionalPropertyUndefined.ts
    'addVoidToPromise', // fixAddVoidToPromise.ts
    'annotateWithTypeFromJSDoc', // annotateWithTypeFromJSDoc.ts
    'constructorForDerivedNeedSuperCall', // fixConstructorForDerivedNeedSuperCall.ts
    'convertFunctionToEs6Class', // convertFunctionToEs6Class.ts
    'convertToTypeOnlyExport', // convertToTypeOnlyExport.ts
    'convertToTypeOnlyImport', // convertToTypeOnlyImport.ts
    'deleteUnmatchedParameter', // fixUnmatchedParameter.ts
    'disableJsDiagnostics', // disableJsDiagnostics.ts
    'extendsInterfaceBecomesImplements', // fixExtendsInterfaceBecomesImplements.ts
    'fixAwaitInSyncFunction', // fixAwaitInSyncFunction.ts
    'fixCannotFindModule', // fixCannotFindModule.js
    'fixEnableJsxFlag', // fixEnableJsxFlag.ts
    'fixImportNonExportedMember', // fixImportNonExportedMember.ts
    'fixMissingAttributes', // fixAddMissingMember.ts
    'fixMissingMember', // fixAddMissingMember.ts
    'fixMissingProperties', // fixAddMissingMember.ts
    'fixOverrideModifier', // fixOverrideModifier.ts
    'fixReturnTypeInAsyncFunction', // fixReturnTypeInAsyncFunction.ts
    'import', // importFixes.ts
    'inferFromUsage', // inferFromUsage.ts
    'invalidImportSyntax', // fixInvalidImportSyntax.ts
    'jdocTypes', // fixJSDocTypes.ts
    'removeUnnecessaryAwait', // removeUnnecessaryAwait.ts
    'requireInTs', // requireInTs.ts
    'strictClassInitialization', // fixStrictClassInitialization.ts
    'unusedIdentifier', // fixUnusedIdentifier.ts
    'useDefaultImport', // useDefaultImport.ts
  ];

  getFixesForDiagnostic(
    diagnostic: DiagnosticWithContext,
    filter: CodeFixCollectionFilter
  ): CodeFixAction[] {
    const languageService = diagnostic.service;

    const userPreferences: UserPreferences = {
      disableSuggestions: false,
      quotePreference: 'auto',
      includeCompletionsForModuleExports: true,
      includeCompletionsForImportStatements: true,
      includeAutomaticOptionalChainCompletions: true,
      importModuleSpecifierEnding: 'minimal',
      includePackageJsonAutoImports: 'auto',
      jsxAttributeCompletionStyle: 'auto',
    };

    const fixes = languageService.getCodeFixesAtPosition(
      diagnostic.file.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [diagnostic.code],
      this.getFormatCodeSettingsForFile(diagnostic.file.fileName),
      userPreferences
    );

    const filteredCodeFixes: CodeFixAction[] = [];

    for (let fix of fixes) {
      if (filter.safeFixes && !this.isCodeFixSafe(fix)) {
        continue;
      }

      if (filter.strictTyping) {
        let strictCodeFix = this.makeCodeFixStrict(fix);

        if (strictCodeFix === undefined && isInstallPackageCommand(fix)) {
          strictCodeFix = fix;
        }

        if (!strictCodeFix) {
          continue;
        }

        fix = strictCodeFix;
      }

      filteredCodeFixes.push(fix);
    }

    return filteredCodeFixes;
  }

  /**
   * Checks if the codefix is safe to apply
   *
   * Filtering out codefixes based on fixName,
   * because `fixId` is not exists when there is only one/last error of a certain type in the file
   */
  private isCodeFixSafe(fix: CodeFixAction): boolean {
    return this.safeCodeFixNames.includes(fix.fixName);
  }

  /**
   * Remove text changes contains loose typing (like usage of `any` type)
   */
  private makeCodeFixStrict(fix: CodeFixAction): CodeFixAction | undefined {
    // Filtering out all text changes contain `any`
    const safeChanges: FileTextChanges[] = [];
    for (const changes of fix.changes) {
      const safeTextChanges: TextChange[] = [];
      for (const textChanges of changes.textChanges) {
        // Don't return dummy function declarations
        if (textChanges.newText.includes('throw new Error')) {
          continue;
        }

        // Covers: `: any`, `| any`, `<any`, `any>`, `any |`, and same cases with `any[]`
        const anyTypeUsageRegex = /[:<|]\s*any|any(\[])*\s*[|>]/i;
        if (anyTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers: `: object`, `| object`, `<object`, `object>`, `object |`, and same cases with `object[]`
        const objectTypeUsageRegex = /[:<|]\s*object|object(\[])*\s*[|>]/i;
        if (objectTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers cases with broken type signatures, like: `() =>`
        const brokenTypeSignatures = /\(\) =>\s*$/i;
        if (brokenTypeSignatures.test(textChanges.newText)) {
          continue;
        }

        safeTextChanges.push(textChanges);
      }

      if (safeTextChanges.length) {
        safeChanges.push({ ...changes, textChanges: safeTextChanges });
      }
    }

    if (safeChanges.length) {
      return { ...fix, changes: safeChanges };
    }

    return undefined;
  }

  private getFormatCodeSettingsForFile(filePath: string): FormatCodeSettings {
    if (this.hasPrettier === undefined) {
      let prettierConfig: PrettierOptions | null = null;

      try {
        prettierConfig = importPrettier(filePath).resolveConfig.sync(filePath, {
          editorconfig: true,
        });
      } catch (e) {
        // swallow the error. Prettier is not installed
      }

      if (prettierConfig) {
        this.hasPrettier = true;
        this.prettierConfigs = prettierConfig;
      }
    }

    const tsFormatCodeOptions = getDefaultFormatCodeSettings();

    let useSemicolons = true;
    let indentSize = tsFormatCodeOptions.tabSize ?? 2;
    let convertTabsToSpaces = true;

    if (this.prettierConfigs) {
      useSemicolons = this.prettierConfigs.semi !== false;
      indentSize = this.prettierConfigs.tabWidth ?? indentSize;
      convertTabsToSpaces = this.prettierConfigs.useTabs !== true;
    }

    return {
      ...tsFormatCodeOptions,
      baseIndentSize: indentSize,
      convertTabsToSpaces,
      indentSize,
      semicolons: useSemicolons ? SemicolonPreference.Insert : SemicolonPreference.Remove,
    };
  }
}

function importPrettier(fromPath: string): typeof import('prettier') {
  const pkg = getPackageInfo('prettier', fromPath);
  const main = resolve(pkg.path);
  return require(main);
}

function getPackageInfo(packageName: string, fromPath: string): { path: string } {
  const paths = [__dirname];

  paths.unshift(fromPath);

  const packageJSONPath = require.resolve(`${packageName}/package.json`, {
    paths,
  });

  return {
    path: dirname(packageJSONPath),
  };
}

export function isInstallPackageCommand(
  fix: CodeFixAction
): fix is CodeFixAction & { commands: CodeActionCommand } {
  return fix.fixId === 'installTypesPackage' && !!fix.commands;
}
