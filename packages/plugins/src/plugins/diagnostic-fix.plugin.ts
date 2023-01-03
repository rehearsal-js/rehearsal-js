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
    80005, // 'require' call may be converted to an import
    7005, // Variable implicitly has an ___ type
    2339, // Property does not exist on type
    7006, // Parameter implicitly has an ___ type
    7008, // Member implicitly has an ___ type
    80004, // JSDoc types may be moved to TypeScript types
    90016, // Declare property
    90035, // Declare private property
    90053, // Declare a private field named
    2525, // Initializer provides no value for this binding element and the binding element has no default value
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

      const fix = codefixes.getCodeFixes(diagnostic);
      if (!fix) {
        continue;
      } else {
        for (const fileTextChange of fix.changes) {
          let text = this.service.getFileText(fileTextChange.fileName);

          const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
          for (const textChange of textChanges) {
            text = applyTextChange(text, textChange);
          }

          this.service.setFileText(fileTextChange.fileName, text);
          allFixedFiles.add(fileTextChange.fileName);

          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
        }
      }

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
