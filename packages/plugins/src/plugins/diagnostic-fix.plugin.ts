import { CodeActionCommand, CodeFixAction, type DiagnosticWithLocation } from 'typescript';
import debug from 'debug';
import hash from 'object-hash';

import {
  codefixes,
  type DiagnosticWithContext,
  Diagnostics,
  isInstallPackageCommand,
  isDiagnosticSupported,
  eligiableDiagnostics,
} from '@rehearsal/codefixes';
import {
  Plugin,
  PluginOptions,
  type PluginResult,
  PluginsRunnerContext,
  RehearsalService,
} from '@rehearsal/service';
import { applyTextChange, findNodeAtPosition, normalizeTextChanges } from '@rehearsal/ts-utils';

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
    Diagnostics.This_constructor_function_may_be_converted_to_a_class_declaration.code,
    Diagnostics.require_call_may_be_converted_to_an_import.code,
    Diagnostics.JSDoc_types_may_be_moved_to_TypeScript_types.code,
    Diagnostics.Variable_0_implicitly_has_an_1_type.code,
    Diagnostics.Parameter_0_implicitly_has_an_1_type.code,
    Diagnostics.Member_0_implicitly_has_an_1_type.code,
    Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code,
    Diagnostics.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
      .code,
    Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
      .code,
    Diagnostics.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code,
    Diagnostics
      .Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage
      .code,
    Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage
      .code,
    Diagnostics
      .Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initializer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration
      .code,
  ];

  attemptedToFix: string[] = [];

  async *run(
    fileName: string,
    context: PluginsRunnerContext,
    options: DiagnosticFixPluginOptions
  ): PluginResult {
    const diagnostics = this.getDiagnostics(context.rehearsal, fileName);
    const allFixedFiles: Set<string> = new Set();

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    for await (const diagnostic of diagnostics) {
      yield;
    }

    return Array.from(allFixedFiles);

    // options.safeFixes ??= true;
    // options.strictTyping ??= true;

    // let diagnostics = this.getDiagnostics(context.rehearsal, fileName);

    // DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    // const allFixedFiles: Set<string> = new Set();

    // this.resetAttemptedToFix();

    // while (diagnostics.length > 0) {
    //   const diagnostic = diagnostics.shift()!;

    //   if (!diagnostic.node) {
    //     DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t node not found`);
    //     continue;
    //   }

    //   const fix = this.getCodeFix(diagnostic, options);

    //   if (!fix) {
    //     DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t didn't fix`);
    //     continue;
    //   }

    //   if (isInstallPackageCommand(fix)) {
    //     await this.applyCommandAction(fix.commands, context);
    //   }

    //   for (const fileTextChange of fix.changes) {
    //     let text = context.rehearsal.getFileText(fileTextChange.fileName);

    //     const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
    //     for (const textChange of textChanges) {
    //       DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t ${textChange.newText}`);

    //       text = applyTextChange(text, textChange);
    //     }

    //     context.rehearsal.setFileText(fileTextChange.fileName, text);
    //     allFixedFiles.add(fileTextChange.fileName);

    //     DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
    //   }

    //   context.reporter.incrementRunFixedItemCount();

    //   // Get updated list of diagnostics
    //   diagnostics = this.getDiagnostics(context.rehearsal, fileName);
    // }

    // return Array.from(allFixedFiles);
  }

  /**
   * Returns the list of diagnostics with location and additional context of the application
   */
  getDiagnostics(rehearsalService: RehearsalService, fileName: string): DiagnosticWithContext[] {
    const service = rehearsalService.getLanguageService();
    const program = service.getProgram()!;
    const checker = program.getTypeChecker();
    const diagnostics = rehearsalService.getDiagnostics(fileName);

    return eligiableDiagnostics(diagnostics).map<DiagnosticWithContext>((diagnostic) => ({
      ...diagnostic,
      ...{
        service,
        program,
        checker,
        node: findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length),
      },
    }));
  }

  private async applyCommandAction(
    command: CodeActionCommand[],
    context: PluginsRunnerContext
  ): Promise<boolean> {
    try {
      await context.rehearsal.getLanguageService().applyCodeActionCommand(command);
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
  // sort(diagnostics: DiagnosticWithLocation[], prioritizedCodes: number[]): void {
  //   diagnostics.sort((left, right) => {
  //     if (left.code != right.code) {
  //       const leftIndex = prioritizedCodes.indexOf(left.code);
  //       const rightIndex = prioritizedCodes.indexOf(right.code);

  //       // Sort prioritized codes by how they ordered in `prioritizedCodes`
  //       if (leftIndex >= 0 && rightIndex >= 0) {
  //         return leftIndex - rightIndex;
  //       }

  //       if (leftIndex >= 0) {
  //         return -1;
  //       }

  //       if (rightIndex >= 0) {
  //         return 1;
  //       }
  //     }

  //     return left.start - right.start;
  //   });
  // }

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
