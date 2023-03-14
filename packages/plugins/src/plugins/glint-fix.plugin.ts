import {
  GlintService,
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  type PluginResult,
} from '@rehearsal/service';
import { applyTextChange, normalizeTextChanges } from '@rehearsal/ts-utils';
import { CodeFixAction, FileTextChanges, TextChange } from 'typescript';
import { CodeActionKind, Diagnostic } from 'vscode-languageserver';

export class GlintFixPlugin implements Plugin<PluginOptions> {
  async run(fileName: string, context: PluginsRunnerContext): PluginResult {
    const allFixedFiles: Set<string> = new Set();
    const service = context.service as GlintService;

    const diagnostics = this.getDiagnostics(fileName, service);

    for (const diagnostic of diagnostics) {
      const fix = this.getCodeFix(fileName, diagnostic, service);

      if (fix === undefined) {
        continue;
      }

      for (const fileTextChange of fix.changes) {
        let text = context.service.getFileText(fileTextChange.fileName);

        const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
        for (const textChange of textChanges) {
          text = applyTextChange(text, textChange);
        }

        context.service.setFileText(fileTextChange.fileName, text);
        allFixedFiles.add(fileTextChange.fileName);
      }
    }

    return Array.from(allFixedFiles);
  }

  getDiagnostics(fileName: string, service: GlintService): Diagnostic[] {
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
        const strictFix = this.makeCodeFixStrict(fix);

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

  private makeCodeFixStrict(fix: CodeFixAction): CodeFixAction | undefined {
    // Filtering out all text changes contain `any`
    const safeChanges: FileTextChanges[] = [];
    for (const changes of fix.changes) {
      const safeTextChanges: TextChange[] = [];
      for (const textChanges of changes.textChanges) {
        // Don't return dummy function declarations
        if (textChanges.newText.includes('throw new Error')) {
          continue;
        }

        // Covers: `: any`, `| any`, `<any`, `any>`, `any |`, and same cases with `any[]`
        const anyTypeUsageRegex = /[:<|]\s*any|any(\[])*\s*[|>]/i;
        if (anyTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers: `: object`, `| object`, `<object`, `object>`, `object |`, and same cases with `object[]`
        const objectTypeUsageRegex = /[:<|]\s*object|object(\[])*\s*[|>]/i;
        if (objectTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers cases with broken type signatures, like: `() =>`
        const brokenTypeSignatures = /\(\) =>\s*$/i;
        if (brokenTypeSignatures.test(textChanges.newText)) {
          continue;
        }

        safeTextChanges.push(textChanges);
      }

      if (safeTextChanges.length) {
        safeChanges.push({ ...changes, textChanges: safeTextChanges });
      }
    }

    if (safeChanges.length) {
      return { ...fix, changes: safeChanges };
    }

    return undefined;
  }
}
