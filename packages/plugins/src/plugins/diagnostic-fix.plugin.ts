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
    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const queue = new Queue();

    this.getDiagnostics(options.service, fileName).forEach((d) => {
      queue.enqueue(d);
    });

    let diagnostic: DiagnosticWithContext | undefined;

    while ((diagnostic = queue.dequeue())) {
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
      this.getDiagnostics(options.service, fileName).forEach((d) => queue.enqueue(d));
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
    try {
      await options.service.getLanguageService().applyCodeActionCommand(command);
      return true;
    } catch (e) {
      return false;
    }
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

type StartsAndCodes = [start: number, codes: number[]];

class Queue {
  private diagnostics: DiagnosticWithContext[] = [];
  private codesAndStart: StartsAndCodes = [NaN, []];
  private proccessed: StartsAndCodes = [NaN, []];

  enqueue(diagnostic: DiagnosticWithContext): void {
    const hasDiagnosticAtOffset = this.hasDiagnosticAtOffset(diagnostic);
    const hasProccessed = this.hasProccessed(diagnostic);

    if (hasDiagnosticAtOffset && !hasProccessed) {
      const startOffset = this.codesAndStart.indexOf(diagnostic.start);

      const codes = this.codesAndStart[startOffset + 1];

      if (Array.isArray(codes)) {
        codes.push(diagnostic.code);
        this.diagnostics.push(diagnostic);
      } else {
        throw Error('Invariant reached, diagnostic queue is out of sync. Please create an issue.');
      }
    } else if (!hasDiagnosticAtOffset) {
      this.codesAndStart.push(diagnostic.start, [diagnostic.code]);
    }
  }

  dequeue(): DiagnosticWithContext | undefined {
    const diagnostic = this.diagnostics.shift();

    if (diagnostic) {
      const index = this.codesAndStart.indexOf(diagnostic.start);

      const codes = this.codesAndStart[index + 1];

      if (Array.isArray(codes)) {
        if (codes.length === 0) {
          // remove the tuple
          this.codesAndStart.splice(index, 2);
        } else {
          // just remove the code from the array
          const codeIndex = codes.indexOf(diagnostic.code);
          codes.splice(codeIndex);
        }
      } else {
        throw Error('Invariant reached, diagnostic queue is out of sync. Please create an issue.');
      }

      const proccessedIndex = this.proccessed.indexOf(diagnostic.start);

      if (proccessedIndex === -1) {
        // first time we have processed at this offset
        this.proccessed.push(diagnostic.start, [diagnostic.code]);
      } else {
        // multiple diagnostics at the offset track them so we don't loop forever
        const codes = this.proccessed[proccessedIndex + 1];

        if (Array.isArray(codes)) {
          codes.push(diagnostic.code);
        } else {
          throw Error(
            'Invariant reached, diagnostic queue is out of sync. Please create an issue.'
          );
        }
      }

      return diagnostic;
    }
  }

  private hasProccessed(diagnostic: DiagnosticWithContext): boolean {
    const index = this.proccessed.indexOf(diagnostic.start);
    if (index === -1) {
      return false;
    }

    const codes = this.proccessed[index + 1];

    return Array.isArray(codes) && codes.includes(diagnostic.code);
  }

  private hasDiagnosticAtOffset(diagnostic: DiagnosticWithContext): boolean {
    return this.codesAndStart.includes(diagnostic.start);
  }
}
