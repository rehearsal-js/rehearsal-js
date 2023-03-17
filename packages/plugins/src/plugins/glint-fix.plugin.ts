import { applyCodeFix, makeCodeFixStrict } from '@rehearsal/codefixes';
import {
  GlintService,
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  type PluginResult,
} from '@rehearsal/service';
import debug from 'debug';

import { pathUtils } from '@glint/core';
import { CodeFixAction } from 'typescript';
import { CodeActionKind, Diagnostic } from 'vscode-languageserver';

const DEBUG_CALLBACK = debug('rehearsal:plugins:glint-fix');

export class GlintFixPlugin implements Plugin<PluginOptions> {
  async run(fileName: string, context: PluginsRunnerContext): PluginResult {
    const allFixedFiles: Set<string> = new Set();
    const service = context.service as GlintService;

    let diagnostics = this.getDiagnostics(service, fileName);

    while (diagnostics.length > 0) {
      const diagnostic = diagnostics.shift();

      if (diagnostic === undefined) {
        break;
      }
      const fileText = service.getFileText(fileName);
      const start = pathUtils.positionToOffset(fileText, diagnostic.range.start);

      const fix = this.getCodeFix(fileName, diagnostic, service);

      if (fix === undefined) {
        continue;
      }

      applyCodeFix(fix, {
        getText(filename: string) {
          return context.service.getFileText(filename);
        },

        applyText(newText: string) {
          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${start}:\t ${newText}`);
        },

        setText(filename: string, text: string) {
          context.service.setFileText(filename, text);
          allFixedFiles.add(filename);
          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${start}:\t codefix applied`);
        },
      });

      // Get updated list of diagnostics
      diagnostics = this.getDiagnostics(service, fileName);
    }

    return Array.from(allFixedFiles);
  }

  getDiagnostics(service: GlintService, fileName: string): Diagnostic[] {
    return service.getDiagnostics(fileName).map((d) => service.convertTsDiagnosticToLSP(d));
  }

  getCodeFix(
    fileName: string,
    diagnostic: Diagnostic,
    service: GlintService
  ): CodeFixAction | undefined {
    const glintService = service.getGlintService();
    const rawActions = glintService.getCodeActions(
      fileName,
      CodeActionKind.QuickFix,
      diagnostic.range,
      [diagnostic]
    );

    const transformedActions = service
      .transformCodeActionToCodeFixAction(rawActions)
      .reduce<CodeFixAction[]>((acc, fix) => {
        const strictFix = makeCodeFixStrict(fix);

        if (strictFix) {
          acc.push(strictFix);
        }

        return acc;
      }, []);

    return transformedActions[0];
  }

  getCodeFixes(
    fileName: string,
    diagnostics: Diagnostic[],
    service: GlintService
  ): CodeFixAction[] {
    const glintService = service.getGlintService();

    const actions = diagnostics.flatMap((diagnostic) => {
      const localActions = glintService.getCodeActions(
        fileName,
        CodeActionKind.QuickFix,
        diagnostic.range,
        [diagnostic]
      );

      return localActions;
    });

    return service.transformCodeActionToCodeFixAction(actions);
  }
}
