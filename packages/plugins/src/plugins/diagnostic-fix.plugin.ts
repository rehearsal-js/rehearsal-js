import { CodeActionCommand, CodeFixAction } from 'typescript';
import debug from 'debug';
import hash from 'object-hash';

import {
  codefixes,
  type DiagnosticWithContext,
  Diagnostics,
  isInstallPackageCommand,
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

  async *run(fileName: string, context: PluginsRunnerContext): PluginResult {
    this.resetAttemptedToFix();

    let diagnostics = this.getDiagnostics(context.rehearsal, fileName);
    const allFixedFiles: Set<string> = new Set();

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    for await (const diagnostic of diagnostics) {
      if (!diagnostic.node) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t node not found`);
        continue;
      }

      const fix = this.getCodeFix(diagnostic);

      if (!fix) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t didn't fix`);
        continue;
      }

      if (isInstallPackageCommand(fix)) {
        await this.applyCommandAction(fix.commands, context);
        yield; // placeholder for prompt
      }

      for (const textChange of this.getText(fix, context, diagnostic)) {
        context.rehearsal.setFileText(textChange.file, textChange.text);
        yield; // placeholder for promp;

        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
      }

      diagnostics = this.getDiagnostics(context.rehearsal, fileName);
    }

    context.reporter.incrementRunFixedItemCount();

    return Array.from(allFixedFiles);
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

  private *getText(
    fix: CodeFixAction,
    context: PluginsRunnerContext,
    diagnostic: DiagnosticWithContext
  ): Generator<{ file: string; text: string }> {
    for (const fileTextChange of fix.changes) {
      let text = context.rehearsal.getFileText(fileTextChange.fileName);

      const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
      for (const textChange of textChanges) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t ${textChange.newText}`);

        text = applyTextChange(text, textChange);
      }

      yield { text, file: fileTextChange.fileName };
    }
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
   * Returns a code fix that expected to fix provided diagnostic
   */
  getCodeFix(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const fixes = codefixes.getCodeFixes(diagnostic);

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
