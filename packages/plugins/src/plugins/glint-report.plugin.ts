import { pathUtils } from '@glint/core';
import { DiagnosticWithContext, hints, getDiagnosticOrder } from '@rehearsal/codefixes';
import {
  GlintService,
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  Service,
  type PluginResult,
} from '@rehearsal/service';
import { getLocation } from '../helpers.js';

export interface GlintReportPluginOptions extends PluginOptions {
  commentTag: string;
}

export class GlintReportPlugin implements Plugin<PluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: GlintReportPluginOptions
  ): PluginResult {
    const service = context.service as GlintService;
    const diagnostics = this.getDiagnostics(service, fileName);

    if (!diagnostics.length) {
      return [];
    }

    const fixedFiles: Set<string> = new Set();

    const numDiagnostics = diagnostics.length;

    diagnostics.reverse().forEach((diagnostic, index) => {
      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      const helpUrl = hints.getHelpUrl(diagnostic);

      const updatedText = this.insertTodo(service, diagnostic, hint, options.commentTag);

      const fileName = diagnostic.file.fileName;
      context.service.setFileText(fileName, updatedText);

      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);
      // Since each TODO comment adds a line to the file, we calculate an offset that takes into
      // account the number of comments already added (index) subtracted from the number of
      // diagnostics (to account for the fact that we reverse the diagnostic list) and subtracting
      // 1 to account for the additional line added by `getLocation`
      const locationOffset = numDiagnostics - index - 1;
      location.startLine += locationOffset;
      location.endLine += locationOffset;

      context.reporter.addTSItemToRun(diagnostic, undefined, location, hint, helpUrl);
      fixedFiles.add(fileName);
    });

    return Promise.resolve(Array.from(fixedFiles));
  }

  getDiagnostics(service: Service, fileName: string): DiagnosticWithContext[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = getDiagnosticOrder(service.getDiagnostics(fileName));

    return diagnostics.map((diagnostic) => {
      return {
        ...diagnostic,
        service: languageService,
        program,
        checker,
      };
    });
  }

  insertTodo(
    service: GlintService,
    diagnostic: DiagnosticWithContext,
    hint: string,
    commentTag: string
  ): string {
    const filePath = diagnostic.file.fileName;
    const fileContents = service.getFileText(filePath);
    const lines = fileContents.split('\n');
    const info = service.transformManager.findTransformInfoForOriginalFile(filePath);
    let useHbsComment = false;

    const module = info && info.transformedModule;

    if (module) {
      const template = module.findTemplateAtOriginalOffset(filePath, diagnostic.start);
      // If we're able to find a template associated with the diagnostic, then we know the error
      // is pointing to the body of a template, and we need to use HBS comments
      if (template) {
        useHbsComment = true;
      }
    }

    const start = pathUtils.offsetToPosition(fileContents, diagnostic.start);
    const index = start.line;
    const [leadingWhitespace, indentation] = /^\s*\n?(\s*)/.exec(lines[index]) ?? ['', ''];
    const message = `${commentTag} TODO TS${diagnostic.code}: ${hint}`;

    const todo = useHbsComment
      ? `${leadingWhitespace}{{! @glint-expect-error ${message} }}${indentation}`
      : `${leadingWhitespace}/* @ts-expect-error ${message} */${indentation}`;

    lines.splice(index, 0, todo);

    return lines.join('\n');
  }
}
