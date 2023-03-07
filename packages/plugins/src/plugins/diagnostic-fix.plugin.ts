import debug from 'debug';
import hash from 'object-hash';
import { CodeActionCommand, CodeFixAction, type DiagnosticWithLocation } from 'typescript';

import {
  applyCodeFix,
  codefixes,
  getDiagnosticOrder,
  isInstallPackageCommand,
  type DiagnosticWithContext,
} from '@rehearsal/codefixes';
import {
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  Service,
  type PluginResult,
} from '@rehearsal/service';
import { findNodeAtPosition } from '@rehearsal/ts-utils';

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-fix');

export interface DiagnosticFixPluginOptions extends PluginOptions {
  safeFixes?: boolean;
  strictTyping?: boolean;
}

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticFixPlugin implements Plugin<DiagnosticFixPluginOptions> {
  attemptedToFix: string[] = [];

  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: DiagnosticFixPluginOptions
  ): PluginResult {
    options.safeFixes ??= true;
    options.strictTyping ??= true;

    let diagnostics = this.getDiagnostics(context.service, fileName);

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();

    this.resetAttemptedToFix();

    while (diagnostics.length > 0) {
      const diagnostic = diagnostics.shift()!;

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

      applyCodeFix(fix, {
        getText(filename: string) {
          return context.service.getFileText(filename);
        },

        applyText(newText: string) {
          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t ${newText}`);
        },

        setText(filename: string, text: string) {
          context.service.setFileText(filename, text);
          allFixedFiles.add(filename);
          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
        },
      });

      context.reporter.incrementRunFixedItemCount();

      // Get updated list of diagnostics
      diagnostics = this.getDiagnostics(context.service, fileName);
    }

    return Array.from(allFixedFiles);
  }

  /**
   * Returns the list of diagnostics with location and additional context of the application
   */
  getDiagnostics(service: Service, fileName: string): DiagnosticWithContext[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = getDiagnosticOrder(service.getDiagnostics(fileName));

    return (
      diagnostics
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
    command: CodeActionCommand[],
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
  ): CodeFixAction | undefined {
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

  private resetAttemptedToFix(): void {
    this.attemptedToFix = [];
  }

  private wasAttemptedToFix(diagnostic: DiagnosticWithContext, fix: CodeFixAction): boolean {
    const diagnosticFixHash = hash([diagnostic.code, diagnostic.start, fix]);

    if (!this.attemptedToFix.includes(diagnosticFixHash)) {
      this.attemptedToFix.push(diagnosticFixHash);

      return false;
    }

    return true;
  }
}
