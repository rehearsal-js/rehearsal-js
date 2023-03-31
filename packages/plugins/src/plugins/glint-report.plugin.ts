import { pathUtils } from '@glint/core';
import { DiagnosticWithContext, hints } from '@rehearsal/codefixes';
import { Reporter } from '@rehearsal/reporter';
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

    const updatedContents = this.insertTodo(
      service,
      context.reporter,
      diagnostics[0].file.text,
      diagnostics,
      options.commentTag
    );

    service.setFileText(fileName, updatedContents);

    return Promise.resolve([fileName]);
  }

  getDiagnostics(service: Service, fileName: string): DiagnosticWithContext[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = service.getDiagnostics(fileName);

    //Sort diagnostics from top to bottom, so that we add comments from top to bottom
    //This will ensure we calculate the line numbers correctly
    diagnostics.sort((a, b) => a.start - b.start);

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
    reporter: Reporter,
    fileContents: string,
    diagnostics: DiagnosticWithContext[],
    commentTag: string
  ): string {
    const lines = fileContents.split('\n');

    for (const diagnostic of diagnostics.reverse()) {
      const filePath = diagnostic.file.fileName;
      const info = service.transformManager.findTransformInfoForOriginalFile(filePath);
      let useHbsComment = false;

      const module = info && info.transformedModule;

      if (module) {
        const template = module.findTemplateAtOriginalOffset(filePath, diagnostic.start);
        // If we're able to find a template associated with the diagnostic, then we know the error
        // is pointing to the body of a template and we need to use HBS comments
        if (template) {
          useHbsComment = true;
        }
      }

      const start = pathUtils.offsetToPosition(fileContents, diagnostic.start);
      const index = start.line;
      const [leadingWhitespace, indentation] = /^\s*\n?(\s*)/.exec(lines[index]) ?? ['', ''];
      const message = `${commentTag} TODO TS${diagnostic.code}: ${diagnostic.messageText}`;

      const todo = useHbsComment
        ? `${leadingWhitespace}{{! @glint-expect-error ${message} }}${indentation}`
        : `${leadingWhitespace}/* @ts-expect-error ${message} */${indentation}`;

      lines.splice(index, 0, todo);

      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);
      const hint = hints.getHint(diagnostic);
      const helpUrl = hints.getHelpUrl(diagnostic);

      reporter.addTSItemToRun(diagnostic, undefined, location, hint, helpUrl);
    }

    return lines.join('\n');
  }
}
