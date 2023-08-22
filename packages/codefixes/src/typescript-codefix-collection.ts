import debug from 'debug';
import ts, {
  type CodeActionCommand,
  type CodeFixAction,
  type FormatCodeSettings,
  type FileTextChanges,
  type TextChange,
  type UserPreferences,
} from 'typescript';
import { findNodeAtPosition } from '@rehearsal/ts-utils';
import { isCodeFixSupported } from './safe-codefixes.js';
import { Diagnostics } from './diagnosticInformationMap.generated.js';
import type { CodeFixCollection, CodeFixCollectionFilter, DiagnosticWithContext } from './types.js';

const DEBUG_CALLBACK = debug('rehearsal:codefixes:TypeScriptCodeFixCollection');

const { getDefaultFormatCodeSettings } = ts;

type SuppressedError = { code: number; message: string };

const SUPPRESSED_ERRORS: SuppressedError[] = [
  {
    code: Diagnostics.TS2339.code,
    message: 'False expression: Token end is child end',
  },
  {
    code: Diagnostics.TS2345.code,
    message: `Cannot read properties of undefined (reading 'flags')`,
  },
  {
    code: Diagnostics.TS7006.code,
    message: `Debug Failure`,
  },
];

/**
 * Provides code fixes based on the Typescript's codefix collection.
 * @see https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
 */
export class TypescriptCodeFixCollection implements CodeFixCollection {
  getFixesForDiagnostic(
    diagnostic: DiagnosticWithContext,
    filter: CodeFixCollectionFilter,
    formatCodeSettings?: FormatCodeSettings
  ): CodeFixAction[] {
    const languageService = diagnostic.service;

    let fixes: readonly CodeFixAction[] = [];

    try {
      fixes = languageService.getCodeFixesAtPosition(
        diagnostic.file.fileName.replace('.gts', '.ts'),
        diagnostic.start,
        diagnostic.start + diagnostic.length,
        [diagnostic.code],
        formatCodeSettings ?? getDefaultFormatCodeSettings(),
        this.getUserPreferences()
      );
    } catch (e) {
      this.suppressError(e, diagnostic);
    }

    return this.filterCodeFixes(fixes, filter, diagnostic);
  }

  protected getUserPreferences(): UserPreferences {
    return {
      disableSuggestions: false,
      quotePreference: 'auto',
      includeCompletionsForModuleExports: true,
      includeCompletionsForImportStatements: true,
      includeAutomaticOptionalChainCompletions: true,
      importModuleSpecifierEnding: 'minimal',
      includePackageJsonAutoImports: 'auto',
      jsxAttributeCompletionStyle: 'auto',
    };
  }

  protected suppressError(e: unknown, diagnostic: DiagnosticWithContext): void {
    if (e instanceof Error && this.isErrorSuppressed(diagnostic.code, e.message)) {
      DEBUG_CALLBACK(
        `getCodeFixesAtPosition threw an exception: ${diagnostic.code} ${diagnostic.file.fileName}\n ${e}`
      );
    } else {
      throw new Error(
        `An unknown error occurred when attempting to getCodeFixesAtPosition for file: ${diagnostic.file.fileName} due to TS${diagnostic.code} ${diagnostic.messageText}`
      );
    }
  }

  protected isErrorSuppressed(diagnosticCode: number, errorMessage: string): boolean {
    const suppressedFound = SUPPRESSED_ERRORS.find((d) => d.code == diagnosticCode);

    return !!suppressedFound && errorMessage.includes(suppressedFound?.message);
  }

  protected makeCodeFixStrict(fix: CodeFixAction): CodeFixAction | undefined {
    // Filtering out all text changes contain `any`
    const safeChanges: FileTextChanges[] = [];
    for (const changes of fix.changes) {
      const safeTextChanges: TextChange[] = [];
      for (const textChanges of changes.textChanges) {
        // Don't return dummy function declarations
        if (textChanges.newText.includes('throw new Error')) {
          continue;
        }

        const neverTypeUsageRegex = /(=>|[:<|])\s*never|never(\[])*\s*[|>]/i;
        if (neverTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers: `: any`, `| any`, `<any`, `any>`, `any |`, `=> any`, and same cases with `any[]`
        const anyTypeUsageRegex = /(=>|[:<|])\s*any|any(\[])*\s*[|>]/i;
        if (anyTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers: `: object`, `| object`, `<object`, `object>`, `object |`, `=> object`, and same cases with `object[]`
        const objectTypeUsageRegex = /(=>|[:<|])\s*object|object(\[])*\s*[|>]/i;
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

  protected makeCodeFixSafe(fix: CodeFixAction, diagnostic: DiagnosticWithContext): CodeFixAction {
    // Filter type from @typedefs if they are generated outside the root of the source file
    if (fix.description.startsWith('Convert typedef')) {
      const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length, true);

      // Parents are: node.{jsdoc_containing_typedef}.{node_jsdoc_is_for}.{node_where_type_is_expected_to_be_generated}
      const targetNode = node?.parent?.parent?.parent;

      if (node && (!targetNode || !ts.isSourceFile(targetNode))) {
        fix.changes = [];
      }
    }

    return fix;
  }

  protected filterCodeFixes(
    fixes: readonly CodeFixAction[],
    filter: CodeFixCollectionFilter,
    diagnostic: DiagnosticWithContext
  ): CodeFixAction[] {
    const filteredFixes: CodeFixAction[] = [];

    for (let fix of fixes) {
      if (filter.safeFixes && !this.isCodeFixSupported(fix)) {
        continue;
      }

      if (filter.safeFixes) {
        fix = this.makeCodeFixSafe(fix, diagnostic);
      }

      if (filter.strictTyping) {
        let strictCodeFix = this.makeCodeFixStrict(fix);

        if (!strictCodeFix && isInstallPackageCommand(fix)) {
          strictCodeFix = fix;
        }

        if (!strictCodeFix) {
          continue;
        }

        fix = strictCodeFix;
      }

      if (!fix.changes.length && !fix.commands) {
        continue;
      }

      filteredFixes.push(fix);
    }

    return filteredFixes;
  }

  protected isCodeFixSupported(fix: CodeFixAction): boolean {
    return isCodeFixSupported(fix.fixName);
  }
}

export function isInstallPackageCommand(
  fix: CodeFixAction
): fix is CodeFixAction & { commands: CodeActionCommand } {
  return fix.fixId === 'installTypesPackage' && !!fix.commands;
}
