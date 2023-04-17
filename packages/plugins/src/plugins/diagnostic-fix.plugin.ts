import { createRequire } from 'node:module';
import debug from 'debug';
import hash from 'object-hash';
import ts from 'typescript';
import {
  codefixes,
  getDiagnosticOrder,
  isInstallPackageCommand,
  type DiagnosticWithContext,
} from '@rehearsal/codefixes';
import { PluginOptions, PluginsRunnerContext, Service, Plugin } from '@rehearsal/service';
import { findNodeAtPosition } from '@rehearsal/ts-utils';
import type MS from 'magic-string';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-fix');

export interface DiagnosticFixPluginOptions extends PluginOptions {
  safeFixes?: boolean;
  strictTyping?: boolean;
}

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticFixPlugin extends Plugin<DiagnosticFixPluginOptions> {
  attemptedToFix: string[] = [];
  appliedAtOffset: { [file: string]: number[] } = {};
  changeTrackers: Map<string, MS.default> = new Map();
  allFixedFiles: Set<string> = new Set();

  async run(): Promise<string[]> {
    const { fileName, context, options } = this;

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    // First attempt to fix all the errors
    await this.applyFixes(context, fileName, ts.DiagnosticCategory.Error, options);

    // Then attempt to run the suggestions
    await this.applyFixes(context, fileName, ts.DiagnosticCategory.Suggestion, options);

    this.changeTrackers.forEach((tracker, file) => {
      context.service.setFileText(file, tracker.toString());
    });

    return Array.from(this.allFixedFiles);
  }

  async applyFixes(
    context: PluginsRunnerContext,
    fileName: string,
    diagnosticCategory: ts.DiagnosticCategory,
    options: DiagnosticFixPluginOptions
  ): Promise<void> {
    const diagnostics = this.getDiagnostics(context.service, fileName, diagnosticCategory);

    for (const diagnostic of diagnostics) {
      if (!diagnostic.node) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t node not found`);
        continue;
      }

      const fix = this.getCodeFix(diagnostic, options);

      if (!fix) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t didn't fix`);
        continue;
      }

      if (isInstallPackageCommand(fix)) {
        await this.applyCommandAction(fix.commands, context);
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
            this.appliedAtOffset[fileTextChange.fileName].push(change.span.start);
          }

          changeTracker.appendLeft(change.span.start, change.newText);
          this.allFixedFiles.add(fileTextChange.fileName);
        }
      }

      context.reporter.incrementRunFixedItemCount();
    }
  }

  /**
   * Returns the list of diagnostics with location and additional context of the application
   */
  getDiagnostics(
    service: Service,
    fileName: string,
    diagnosticFilterCategory: ts.DiagnosticCategory
  ): DiagnosticWithContext[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = getDiagnosticOrder(service.getDiagnostics(fileName));

    return (
      diagnostics
        .filter((diagnostic) => {
          return diagnostic.category === diagnosticFilterCategory;
        })
        // Convert DiagnosticWithLocation to DiagnosticWithContext
        .map<DiagnosticWithContext>((diagnostic) => {
          return {
            ...diagnostic,
            ...{
              service: languageService,
              program,
              checker,
              node: findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length),
            },
          };
        })
    );
  }

  private async applyCommandAction(
    command: ts.CodeActionCommand[],
    context: PluginsRunnerContext
  ): Promise<boolean> {
    try {
      await context.service.getLanguageService().applyCodeActionCommand(command);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns a code fix that expected to fix provided diagnostic
   */
  getCodeFix(
    diagnostic: DiagnosticWithContext,
    options: DiagnosticFixPluginOptions
  ): ts.CodeFixAction | undefined {
    const fixes = codefixes.getCodeFixes(diagnostic, {
      safeFixes: options.safeFixes,
      strictTyping: options.strictTyping,
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
      DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t fixes didn't work`);
    }

    return fix;
  }

  private wasAttemptedToFix(diagnostic: DiagnosticWithContext, fix: ts.CodeFixAction): boolean {
    const diagnosticFixHash = hash([diagnostic.code, diagnostic.start, fix]);

    if (!this.attemptedToFix.includes(diagnosticFixHash)) {
      this.attemptedToFix.push(diagnosticFixHash);

      return false;
    }

    return true;
  }
}
