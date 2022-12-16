import { CodeFixAction, getDefaultFormatCodeSettings, type UserPreferences } from 'typescript';
import { CodeFixCollection, type DiagnosticWithContext } from './types';

/**
 * Provides code fixes based on the Typescript's codefix collection.
 * @see https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
 */
export class TypescriptCodeFixCollection implements CodeFixCollection {
  getFixForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const languageService = diagnostic.service;

    const formatOptions = getDefaultFormatCodeSettings();
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
      formatOptions,
      userPreferences
    );

    if (fixes.length === 0) {
      return undefined;
    }

    // TODO Implement the logic to decide on which CodeAction to prioritize
    return [...fixes].shift();
  }
}
