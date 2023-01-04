import { dirname, resolve } from 'path';
import {
  getDefaultFormatCodeSettings,
  SemicolonPreference,
  type CodeFixAction,
  type UserPreferences,
  type FormatCodeSettings,
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
  getFixForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
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
      return undefined;
    }

    // TODO Implement the logic to decide on which CodeAction to prioritize
    return [...fixes].shift();
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
    let indentSize = tsFormatCodeOptions.tabSize !== undefined ? tsFormatCodeOptions.tabSize : 2;
    let convertTabsToSpaces = true;

    if (this.prettierConfigs) {
      useSemicolons = this.prettierConfigs.semi === false ? false : true;
      indentSize =
        (typeof this.prettierConfigs.tabWidth === 'number'
          ? this.prettierConfigs.tabWidth
          : indentSize) ?? indentSize;
      convertTabsToSpaces = this.prettierConfigs.useTabs === true ? false : true;
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
