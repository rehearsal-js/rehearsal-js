import { createRequire } from 'node:module';
import { applyCodeFix, makeCodeFixStrict } from '@rehearsal/codefixes';
import debug from 'debug';

import ts from 'typescript';
import { CodeActionKind, Diagnostic } from 'vscode-languageserver';
import { Plugin, GlintService, PluginsRunnerContext } from '@rehearsal/service';
import hash from 'object-hash';
import type MS from 'magic-string';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

const DEBUG_CALLBACK = debug('rehearsal:plugins:glint-fix');

const { DiagnosticCategory } = ts;
export interface GlintFixPluginOptions {
  mode: 'single-pass' | 'drain';
}

export class GlintFixPlugin extends Plugin<GlintFixPluginOptions> {
  attemptedToFix: string[] = [];
  appliedAtOffset: { [file: string]: number[] } = {};
  changeTrackers: Map<string, MS.default> = new Map();
  allFixedFiles: Set<string> = new Set();

  async run(): Promise<string[]> {
    const { options } = this;
    const { mode } = options;

    switch (mode) {
      case 'drain':
        this.drainMode();
        break;
      case 'single-pass':
      default:
        this.singlePassMode();
    }

    return Promise.resolve(Array.from(this.allFixedFiles));
  }

  private drainMode(): void {
    const { fileName, context } = this;
    const service = context.service as GlintService;

    let diagnostics = this.getDiagnostics(service, fileName, [
      DiagnosticCategory.Error,
      DiagnosticCategory.Warning,
    ]);

    while (diagnostics.length) {
      const diagnostic = diagnostics.shift()!;

      const fix = this.getCodeFix(fileName, diagnostic, service);

      if (fix === undefined) {
        DEBUG_CALLBACK(
          ` - TS${diagnostic.code} at ${diagnostic.range.start.line}:${diagnostic.range.start.character}:\t fix not found`
        );
        continue;
      }

      applyCodeFix(fix, {
        getText(filename: string) {
          return context.service.getFileText(filename);
        },

        applyText(newText: string) {
          DEBUG_CALLBACK(
            `- TS${diagnostic.code} at ${diagnostic.range.start.line}:${diagnostic.range.start.character}:\t ${newText}`
          );
        },

        setText: (filename: string, text: string) => {
          context.service.setFileText(filename, text);
          this.allFixedFiles.add(filename);
          DEBUG_CALLBACK(
            `- TS${diagnostic.code} at ${diagnostic.range.start.line}:${diagnostic.range.start.character}:\t codefix applied`
          );
        },
      });

      context.reporter.incrementRunFixedItemCount();

      diagnostics = this.getDiagnostics(service, fileName, [
        DiagnosticCategory.Error,
        DiagnosticCategory.Warning,
      ]);
    }
  }

  private singlePassMode(): void {
    const { fileName, context } = this;
    this.applyFix(fileName, context, ts.DiagnosticCategory.Error);
    this.applyFix(fileName, context, ts.DiagnosticCategory.Suggestion);

    this.changeTrackers.forEach((tracker, fileName) => {
      context.service.setFileText(fileName, tracker.toString());
    });
  }

  applyFix(
    fileName: string,
    context: PluginsRunnerContext,
    diagnosticCategory: ts.DiagnosticCategory
  ): void {
    const service = context.service as GlintService;
    const diagnostics = this.getDiagnostics(service, fileName, [diagnosticCategory]);

    for (const diagnostic of diagnostics) {
      const fix = this.getCodeFix(fileName, diagnostic, service);

      if (fix === undefined) {
        DEBUG_CALLBACK(
          ` - TS${diagnostic.code} at ${diagnostic.range.start.line}:${diagnostic.range.start.character}:\t fix not found`
        );
        continue;
      }

      for (const fileTextChange of fix.changes) {
        let changeTracker: MS.default;
        if (!this.changeTrackers.has(fileTextChange.fileName)) {
          const originalText = context.service.getFileText(fileTextChange.fileName);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          changeTracker = new MagicString(originalText);

          this.changeTrackers.set(fileTextChange.fileName, changeTracker);
        } else {
          changeTracker = this.changeTrackers.get(fileTextChange.fileName)!;
        }

        for (const change of fileTextChange.textChanges) {
          if (change.span.length > 0) {
            changeTracker.remove(change.span.start, change.span.start + change.span.length);
          }

          if (!this.appliedAtOffset[fileTextChange.fileName]) {
            this.appliedAtOffset[fileTextChange.fileName] = [];
          }

          if (this.appliedAtOffset[fileTextChange.fileName].includes(change.span.start)) {
            continue;
          } else {
            // this.appliedAtOffset[fileTextChange.fileName].push(change.span.start);
          }

          DEBUG_CALLBACK(
            `- TS${diagnostic.code} at ${diagnostic.range.start}:\t ${change.newText}`
          );

          changeTracker.appendLeft(change.span.start, change.newText);
          context.reporter.incrementRunFixedItemCount();
          this.allFixedFiles.add(fileTextChange.fileName);
        }
      }
    }
  }

  getDiagnostics(
    service: GlintService,
    fileName: string,
    diagnosticCategories: ts.DiagnosticCategory[]
  ): Diagnostic[] {
    return service
      .getDiagnostics(fileName)
      .filter((d) => diagnosticCategories.some((category) => category === d.category))
      .map((d) => service.convertTsDiagnosticToLSP(d));
  }

  getCodeFix(
    fileName: string,
    diagnostic: Diagnostic,
    service: GlintService
  ): ts.CodeFixAction | undefined {
    const glintService = service.getGlintService();
    const rawActions = glintService.getCodeActions(
      fileName,
      CodeActionKind.QuickFix,
      diagnostic.range,
      [diagnostic]
    );

    const transformedActions = service
      .transformCodeActionToCodeFixAction(rawActions)
      .reduce<ts.CodeFixAction[]>((acc, fix) => {
        const strictFix = makeCodeFixStrict(fix);

        if (strictFix) {
          acc.push(strictFix);
        }

        return acc;
      }, []);

    // Use the first available codefix in automatic mode
    let fix = transformedActions.shift();

    while (fix && this.wasAttemptedToFix(diagnostic, fix)) {
      // Try the next fix if we already tried the first one
      fix = transformedActions.shift();
    }

    if (fix === undefined) {
      DEBUG_CALLBACK(
        ` - TS${diagnostic.code} at ${diagnostic.range.start.line}:${diagnostic.range.start.character}:\t fixes didn't work`
      );
    }

    return fix;
  }

  private wasAttemptedToFix(diagnostic: Diagnostic, fix: ts.CodeFixAction): boolean {
    const diagnosticFixHash = hash([
      diagnostic.code,
      diagnostic.range.start.line,
      diagnostic.range.start.character,
      fix,
    ]);

    if (!this.attemptedToFix.includes(diagnosticFixHash)) {
      this.attemptedToFix.push(diagnosticFixHash);

      return false;
    }

    return true;
  }
}
