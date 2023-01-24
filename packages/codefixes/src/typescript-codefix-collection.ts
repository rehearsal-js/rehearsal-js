import { dirname, resolve } from 'path';
import {
  type CodeFixAction,
  type FormatCodeSettings,
  getDefaultFormatCodeSettings,
  SemicolonPreference,
  type UserPreferences,
} from 'typescript';
import type { Options as PrettierOptions } from 'prettier';
import type { CodeFixCollection, DiagnosticWithContext } from './types';

/**
 * Provides code fixes based on the Typescript's codefix collection.
 * @see https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
 */
export class TypescriptCodeFixCollection implements CodeFixCollection {
  hasPrettier: boolean | undefined;
  prettierConfigs: PrettierOptions | undefined;

  // List of safe to apply code fix names
  // @see ./helpers/available-fix-names.ts for the list of available fixNames
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
    onlySafeFixes = true,
    strictTyping = true
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
      /*
      includeInlayFunctionParameterTypeHints: true,
      includeInlayVariableTypeHints: true,
      includeInlayPropertyDeclarationTypeHints: true,
      includeInlayFunctionLikeReturnTypeHints: true,
      includeInlayEnumMemberValueHints: true,
      */
    };

    const fixes = languageService.getCodeFixesAtPosition(
      diagnostic.file.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [diagnostic.code],
      this.getFormatCodeSettingsForFile(diagnostic.file.fileName),
      userPreferences
    );

    if (fixes.length === 0) {
      return [];
    }

    const safeCodeFixes: CodeFixAction[] = [];
    for (const fix of fixes) {
      if (onlySafeFixes && !this.isSafeFix(fix, strictTyping)) {
        continue;
      }

      safeCodeFixes.push(fix);
    }

    return safeCodeFixes.length ? safeCodeFixes : [];
  }

  private isSafeFix(fix: CodeFixAction, strictTyping: boolean): boolean {
    /*
      Hack :(
      We are filtering out codefixes based on fixName,
      because `fixId` is not exists when there is only one/last error of a certain type in the file
     */
    if (!this.safeCodeFixNames.includes(fix.fixName)) {
      return false;
    }

    for (const changes of fix.changes) {
      for (const textChanges of changes.textChanges) {
        // Don't return dummy function declarations
        if (textChanges.newText.includes('throw new Error')) {
          return false;
        }

        if (strictTyping) {
          // Don't deal (for now) with :any in index signatures (`[key: string]: any` or `[key: any]: string`)
          const anyInIndexSignatureTypeRegex = /[a-zA-Z0-9_$]]: any/;
          if (anyInIndexSignatureTypeRegex.test(textChanges.newText)) {
            return false;
          }

          // Cleaning out `: any` types
          const anyTypeRegex = /[a-zA-Z0-9_$?]: any/;
          if (anyTypeRegex.test(textChanges.newText)) {
            textChanges.newText = textChanges.newText.replace(': any', '');

            // Don't return fix if there is no more types added in new text
            // Example: removing any from `var: any` will equal to its original (diagnosed code) `var`
            const otherTypeRegex = /[a-zA-Z0-9_$?]: [a-zA-Z0-9_]/;
            if (!otherTypeRegex.test(textChanges.newText)) {
              return false;
            }
          }
        }
      }
    }

    return true;
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
