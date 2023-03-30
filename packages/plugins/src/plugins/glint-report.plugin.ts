import { pathUtils } from '@glint/core';
import {
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  type PluginResult,
  GlintService,
} from '@rehearsal/service';
import { type DiagnosticWithLocation } from 'typescript';

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
    const diagnostics = service.getDiagnostics(fileName);

    if (!diagnostics.length) {
      return [];
    }

    const updatedContents = this.insertTodo(
      service,
      diagnostics[0].file.text,
      diagnostics,
      options.commentTag
    );

    service.setFileText(fileName, updatedContents);

    return Promise.resolve([fileName]);
  }

  insertTodo(
    service: GlintService,
    fileContents: string,
    diagnostics: DiagnosticWithLocation[],
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
    }

    return lines.join('\n');
  }
}
