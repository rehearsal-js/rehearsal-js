import { type DiagnosticWithLocation } from 'typescript';
import { debug } from 'debug';

import { codefixes, type DiagnosticWithContext } from '@rehearsal/codefixes';
import { Plugin, type PluginResult } from '@rehearsal/service';
import { applyTextChange, findNodeAtPosition, normalizeTextChanges } from '@rehearsal/utils';

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-fix');

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticFixPlugin extends Plugin {
  // TODO: Move next 1 line to constructor options
  commentTag = '@rehearsal';

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

  async run(fileName: string): PluginResult {
    let diagnostics = this.getDiagnostics(fileName);
    let tries = diagnostics.length + 1;

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();
    while (diagnostics.length > 0 && tries-- > 0) {
      const diagnostic = diagnostics.shift()!;

      if (!diagnostic.node) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t node not found`);
        continue;
      }

      const fixes = codefixes.getCodeFixes(diagnostic, true, false);

      if (fixes.length === 0) {
        continue;
      }

      // Use the first available codefix in automatic mode,
      // TODO: User should be able to choose one of the fixes form this list in interactive mode
      const fix = fixes.shift()!;

      for (const fileTextChange of fix.changes) {
        let text = this.service.getFileText(fileTextChange.fileName);

        const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
        for (const textChange of textChanges) {
          DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t ${textChange.newText}`);
          text = applyTextChange(text, textChange);
        }

        this.service.setFileText(fileTextChange.fileName, text);
        allFixedFiles.add(fileTextChange.fileName);

        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
      }

      this.reporter.incrementFixedItemCount();

      // Get updated list of diagnostics
      diagnostics = this.getDiagnostics(fileName);
    }

    return Array.from(allFixedFiles);
  }

  /**
   * Returns the list of diagnostics with location and additional context of the application
   */
  getDiagnostics(fileName: string): DiagnosticWithContext[] {
    const service = this.service.getLanguageService();
    const program = service.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = [
      ...this.service.getSemanticDiagnosticsWithLocation(fileName),
      ...this.service.getSuggestionDiagnostics(fileName),
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
