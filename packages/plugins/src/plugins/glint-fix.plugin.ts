import { createRequire } from 'node:module';
import {
  glintCodeFixes,
  applyCodeFix,
  getDiagnosticOrder,
  DiagnosticWithContext,
} from '@rehearsal/codefixes';
import debug from 'debug';
import ts, { DiagnosticWithLocation } from 'typescript';
import { Plugin, GlintService, PluginsRunnerContext } from '@rehearsal/service';
import hash from 'object-hash';
import { isSameChange, normalizeTextChanges } from '@rehearsal/ts-utils';
import type { Diagnostic } from 'vscode-languageserver';
import type MS from 'magic-string';
import type { TextChange } from 'typescript';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

const DEBUG_CALLBACK = debug('rehearsal:plugins:glint-fix');

const { DiagnosticCategory } = ts;
export interface GlintFixPluginOptions {
  mode: 'single-pass' | 'drain';
}

// Helper methods for finding a node, for glint AST nodes ts-util methods do not work here.
function findNodeAtPosition(
  sourceFile: ts.SourceFile,
  start: number,
  length: number
): ts.Node | undefined {
  const visitor = (node: ts.Node): ts.Node | undefined => {
    if (isNodeAtPosition(node, start, length)) {
      return node;
    }

    if (node.pos <= start && node.end >= start + length) {
      return ts.forEachChild(node, visitor);
    }

    return undefined;
  };

  return visitor(sourceFile);
}

function isNodeAtPosition(node: ts.Node, start: number, length: number): boolean {
  return node.pos === start && node.end === start + length;
}

export class GlintFixPlugin extends Plugin<GlintFixPluginOptions> {
  attemptedToFix: string[] = [];
  appliedTextChanges: { [file: string]: TextChange[] } = {};
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

    let diagnostics: Diagnostic[] = this.getDiagnostics(service, fileName, [
      DiagnosticCategory.Error,
      DiagnosticCategory.Suggestion,
    ]);

    // In the drain mode diagnostics list is getting refreshed in every cycle which might have end up
    // with more error need to be fixed then was originally. The limit based on original amount of diagnostics
    // helps to avoid an infinitive loop in some edge cases when new errors keep coming when previous fixed.
    let limit = diagnostics.length * 10;

    while (limit-- && diagnostics.length) {
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
          context.reporter.incrementRunFixedItemCount();
          this.allFixedFiles.add(filename);
          DEBUG_CALLBACK(
            `- TS${diagnostic.code} at ${diagnostic.range.start.line}:${diagnostic.range.start.character}:\t codefix applied`
          );
        },
      });

      context.reporter.incrementRunFixedItemCount();

      diagnostics = this.getDiagnostics(service, fileName, [
        DiagnosticCategory.Error,
        DiagnosticCategory.Suggestion,
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
          const targetFileName = fileTextChange.fileName;

          // Track the applied changes so we can dedupe as we go
          if (this.hasAppliedChange(targetFileName, change)) {
            continue; // Skip if a duplicate change
          } else {
            // Init if undefined
            this.appliedTextChanges[targetFileName] ??= [];

            // Append and normalize
            this.appliedTextChanges[targetFileName].push(change);
            this.appliedTextChanges[targetFileName] = normalizeTextChanges(
              this.appliedTextChanges[targetFileName]
            );
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

  hasAppliedChange(fileName: string, change: TextChange): boolean {
    if (!this.appliedTextChanges[fileName]) {
      return false;
    }
    return !!this.appliedTextChanges[fileName].find((existing) => isSameChange(existing, change));
  }

  getDiagnostics(
    service: GlintService,
    fileName: string,
    diagnosticCategories: ts.DiagnosticCategory[]
  ): Diagnostic[] {
    const unordered = service.getDiagnostics(fileName);

    const diagnostics = getDiagnosticOrder(unordered);

    return diagnostics
      .filter((d) => diagnosticCategories.some((category) => category === d.category))
      .map((d) => service.convertTsDiagnosticToLSP(d));
  }

  getCodeFix(
    fileName: string,
    diagnostic: Diagnostic,
    service: GlintService
  ): ts.CodeFixAction | undefined {
    const diagnosticWithContext = this.getDiagnosticsWithContext(fileName, diagnostic, service);

    const fixes = glintCodeFixes.getCodeFixes(diagnosticWithContext, {
      safeFixes: true,
      strictTyping: true,
    });

    if (fixes.length === 0) {
      return undefined;
    }

    // Use the first available codefix in automatic mode
    let fix = fixes.shift();

    while (fix && this.wasAttemptedToFix(diagnostic, fix)) {
      // Try the next fix if we already tried the first one
      fix = fixes.shift();
    }

    if (fix === undefined) {
      DEBUG_CALLBACK(
        ` - TS${diagnostic.code} at ${diagnosticWithContext.start}:\t fixes didn't work`
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

  getDiagnosticsWithContext(
    fileName: string,
    diagnostic: Diagnostic,
    service: GlintService
  ): DiagnosticWithContext {
    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    const diagnosticWithLocation: DiagnosticWithLocation = service.convertLSPDiagnosticToTs(
      fileName,
      diagnostic
    );

    return {
      ...diagnosticWithLocation,
      ...{
        glintService: service,
        glintDiagnostic: diagnostic,
        service: service.getLanguageService(),
        program,
        checker,
        node: findNodeAtPosition(
          diagnosticWithLocation.file,
          diagnosticWithLocation.start,
          diagnosticWithLocation.start + diagnosticWithLocation.length
        ),
      },
    };
  }
}
