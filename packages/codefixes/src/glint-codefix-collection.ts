import { type Diagnostic, CodeActionKind } from 'vscode-languageserver';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection.js';
import { isCodeFixSupportedByDescription } from './safe-codefixes.js';
import type { GlintService } from '@rehearsal/service';
import ts, { type FormatCodeSettings, type CodeFixAction } from 'typescript';
import type { CodeFixCollectionFilter, DiagnosticWithContext } from './types.js';

const { getDefaultFormatCodeSettings } = ts;

interface GlintDiagnosticWithContext extends DiagnosticWithContext {
  glintService: GlintService;
  glintDiagnostic: Diagnostic;
}

const glintSupportedFixDescriptions = [`Unused '@glint-expect-error' directive.`];

export class GlintCodeFixCollection extends TypescriptCodeFixCollection {
  override getFixesForDiagnostic(
    diagnostic: GlintDiagnosticWithContext,
    filter: CodeFixCollectionFilter,
    formatCodeSettings: FormatCodeSettings
  ): CodeFixAction[] {
    let fixes: readonly CodeFixAction[] = [];

    try {
      const rawActions = diagnostic.glintService
        .getGlintService()
        .getCodeActions(
          diagnostic.file.fileName.replace('.ts', '.gts'),
          CodeActionKind.QuickFix,
          diagnostic.glintDiagnostic.range,
          [diagnostic.glintDiagnostic],
          formatCodeSettings ?? getDefaultFormatCodeSettings(),
          this.getUserPreferences()
        );

      fixes = diagnostic.glintService.transformCodeActionToCodeFixAction(rawActions);
    } catch (e) {
      this.suppressError(e, diagnostic);
    }

    return this.filterCodeFixes(fixes, filter, diagnostic);
  }

  override suppressError(e: unknown, diagnostic: DiagnosticWithContext): void {
    // Suppress `Internal error: offset out of bounds` on .hbs files
    if (
      diagnostic.file.fileName.endsWith('.hbs') &&
      (e as Error).message?.includes('out of bounds')
    ) {
      return;
    }

    super.suppressError(e, diagnostic);
  }

  override isCodeFixSupported(fix: CodeFixAction): boolean {
    return isCodeFixSupportedByDescription(fix.description) || this.isGlintCodeFix(fix);
  }

  isGlintCodeFix(fix: CodeFixAction): boolean {
    return fix.description in glintSupportedFixDescriptions;
  }
}
