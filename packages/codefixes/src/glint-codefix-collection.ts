import { DiagnosticSeverity } from 'vscode-languageserver';
import ts, { type FormatCodeSettings, type CodeFixAction } from 'typescript';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection.js';
import { isCodeFixSupportedByDescription } from './safe-codefixes.js';
import type { GlintService } from '@rehearsal/service';
import type { CodeFixCollectionFilter, DiagnosticWithContext } from './types.js';

const { getDefaultFormatCodeSettings } = ts;

interface GlintDiagnosticWithContext extends DiagnosticWithContext {
  glintService: GlintService;
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
      const gs = diagnostic.glintService;

      fixes = gs
        .getLanguageService()
        .getCodeFixesAtPosition(
          diagnostic.file.fileName,
          diagnostic.start,
          diagnostic.start + diagnostic.length,
          [diagnostic.code],
          formatCodeSettings ?? getDefaultFormatCodeSettings(),
          this.getUserPreferences()
        );

      /*
      const gs = diagnostic.glintService;
      const or = gs.transformManager.getOriginalRange(
        diagnostic.file.fileName,
        diagnostic.start,
        diagnostic.start + diagnostic.length
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
      const text: string = gs.getOriginalFileText(or.originalFileName);

      const a = ts.getLineAndCharacterOfPosition(
        gs.getOriginalSourceFile(diagnostic.file.fileName),
        or.originalStart
      );
      a;
      const d = {
        source: diagnostic.source,
        severity: severityForDiagnostic(gs.ts, diagnostic.category),
        code: diagnostic.code,
        message: diagnostic.messageText as string,
        range: {
          start: gs.pathUtils.offsetToPosition(text, or.originalStart),
          end: gs.pathUtils.offsetToPosition(text, or.originalEnd),
        },
      };

      const rawActions = diagnostic.glintService
        .getGlintService()
        .getCodeActions(
          or.originalFileName,
          CodeActionKind.QuickFix,
          d.range,
          [d],
          formatCodeSettings ?? getDefaultFormatCodeSettings(),
          this.getUserPreferences()
        );

      fixes = diagnostic.glintService.transformCodeActionToCodeFixAction(rawActions);
       */
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

type TS = typeof import('typescript');

export function severityForDiagnostic(ts: TS, categoty: ts.DiagnosticCategory): DiagnosticSeverity {
  switch (categoty) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Message:
      return DiagnosticSeverity.Information;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
  }
}
