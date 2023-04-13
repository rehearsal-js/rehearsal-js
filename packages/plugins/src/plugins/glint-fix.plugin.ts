import { createRequire } from 'node:module';
import { makeCodeFixStrict } from '@rehearsal/codefixes';
import debug from 'debug';

import ts from 'typescript';
import { CodeActionKind, Diagnostic } from 'vscode-languageserver';
import type {
  GlintService,
  Plugin,
  PluginOptions,
  PluginResult,
  PluginsRunnerContext,
} from '@rehearsal/service';
import type MS from 'magic-string';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

const DEBUG_CALLBACK = debug('rehearsal:plugins:glint-fix');

export class GlintFixPlugin implements Plugin<PluginOptions> {
  appliedAtOffset: { [file: string]: number[] } = {};
  changeTrackers: Map<string, MS.default> = new Map();
  allFixedFiles: Set<string> = new Set();

  async run(fileName: string, context: PluginsRunnerContext): PluginResult {
    // Todo: we should just recreate the plugin class for each file
    this.resetState();

    this.applyFix(fileName, context, ts.DiagnosticCategory.Error);
    this.applyFix(fileName, context, ts.DiagnosticCategory.Suggestion);

    this.changeTrackers.forEach((tracker, fileName) => {
      context.service.setFileText(fileName, tracker.toString());
    });

    return Promise.resolve(Array.from(this.allFixedFiles));
  }

  applyFix(
    fileName: string,
    context: PluginsRunnerContext,
    diagnosticCategory: ts.DiagnosticCategory
  ): void {
    const service = context.service as GlintService;
    const diagnostics = this.getDiagnostics(service, fileName, diagnosticCategory);

    for (const diagnostic of diagnostics) {
      const fix = this.getCodeFix(fileName, diagnostic, service);

      if (fix === undefined) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.range.start}:\t node not found`);
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
          this.allFixedFiles.add(fileTextChange.fileName);
        }
      }
    }
  }

  getDiagnostics(
    service: GlintService,
    fileName: string,
    diagnosticCategory: ts.DiagnosticCategory
  ): Diagnostic[] {
    return service
      .getDiagnostics(fileName)
      .filter((d) => d.category === diagnosticCategory)
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

    return transformedActions[0];
  }

  private resetState(): void {
    this.appliedAtOffset = {};
    this.changeTrackers = new Map();
    this.allFixedFiles = new Set();
  }
}
