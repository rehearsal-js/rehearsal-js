import { CodeActionCommand, type DiagnosticWithLocation } from 'typescript';
import { debug } from 'debug';

import {
  codefixes,
  isInstallPackageCommand,
  type DiagnosticWithContext,
} from '@rehearsal/codefixes';
import { Plugin, PluginOptions, type PluginResult, RehearsalService } from '@rehearsal/service';
import { applyTextChange, findNodeAtPosition, normalizeTextChanges } from '@rehearsal/utils';

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-fix');

export interface DiagnosticFixPluginOptions extends PluginOptions {
  safeFixes?: boolean;
  strictTyping?: boolean;
}

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticFixPlugin implements Plugin<DiagnosticFixPluginOptions> {
  /** @see https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json for more codes */
  prioritizedCodes = [
    80002, // convertFunctionToEs6Class
    80005, // requireInTs
    80004, // annotateWithTypeFromJSDoc
    7005, // inferFromUsage
    7006, // inferFromUsage
    7008, // inferFromUsage
    7010, // inferFromUsa
    7043, // inferFromUsage
    7044, // inferFromUsage
    7045, // inferFromUsage
    7046, // inferFromUsage
    7050, // inferFromUsage
    2612, // addMissingDeclareProperty
  ];

  async run(fileName: string, options: DiagnosticFixPluginOptions): PluginResult {
    let diagnostics = this.getDiagnostics(options.service, fileName);

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();

    while (diagnostics.length > 0) {
      const diagnostic = diagnostics.shift()!;

      if (!diagnostic.node) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t node not found`);
        continue;
      }

      const fixes = codefixes.getCodeFixes(diagnostic, {
        safeFixes: true,
        strictTyping: true,
      });

      if (fixes.length === 0) {
        continue;
      }

      // Use the first available codefix in automatic mode,
      // TODO: User should be able to choose one of the fixes form this list in interactive mode
      const fix = fixes.shift()!;

      if (isInstallPackageCommand(fix)) {
        await this.applyCommandAction(fix.commands, options);
      }

      for (const fileTextChange of fix.changes) {
        let text = options.service.getFileText(fileTextChange.fileName);

        const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
        for (const textChange of textChanges) {
          DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t ${textChange.newText}`);

          text = applyTextChange(text, textChange);
        }

        options.service.setFileText(fileTextChange.fileName, text);
        allFixedFiles.add(fileTextChange.fileName);

        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
      }

      options.reporter.incrementFixedItemCount();

      // Get updated list of diagnostics
      diagnostics = this.getDiagnostics(options.service, fileName);
    }

    return Array.from(allFixedFiles);
  }

  /**
   * Returns the list of diagnostics with location and additional context of the application
   */
  getDiagnostics(rehearsalService: RehearsalService, fileName: string): DiagnosticWithContext[] {
    const service = rehearsalService.getLanguageService();
    const program = service.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = [
      ...rehearsalService.getSemanticDiagnosticsWithLocation(fileName),
      ...rehearsalService.getSuggestionDiagnostics(fileName),
    ];

    this.sort(diagnostics, this.prioritizedCodes);

    return (
      diagnostics
        // Convert DiagnosticWithLocation to DiagnosticWithContext
        .map<DiagnosticWithContext>((diagnostic) => ({
          ...diagnostic,
          ...{
            service,
            program,
            checker,
            node: findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length),
          },
        }))
    );
  }

  private async applyCommandAction(
    command: CodeActionCommand[],
    options: DiagnosticFixPluginOptions
  ): Promise<boolean> {
    const result = await options.service.getLanguageService().applyCodeActionCommand(command);
    const ls = options.service.getLanguageService();

    if (result) {
      ls.cleanupSemanticCache();
      ls.dispose();
      return true;
    }

    ls.dispose();

    return false;
  }

  /**
   * Sorts diagnostics by the `start` position with prioritization of diagnostic have codes in `prioritizedCodes`.
   * If the diagnostic has the code mentioned in the `prioritizedCodes` list, it will be moved to the start and will
   * be ordered against other prioritized codes in the order codes provided in the `prioritizedCodes`.
   */
  sort(diagnostics: DiagnosticWithLocation[], prioritizedCodes: number[]): void {
    diagnostics.sort((left, right) => {
      if (left.code != right.code) {
        const leftIndex = prioritizedCodes.indexOf(left.code);
        const rightIndex = prioritizedCodes.indexOf(right.code);

        // Sort prioritized codes by how they ordered in `prioritizedCodes`
        if (leftIndex >= 0 && rightIndex >= 0) {
          return leftIndex - rightIndex;
        }

        if (leftIndex >= 0) {
          return -1;
        }

        if (rightIndex >= 0) {
          return 1;
        }
      }

      return left.start - right.start;
    });
  }
}
