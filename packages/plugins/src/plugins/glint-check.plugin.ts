import { pathUtils } from '@glint/core';

import { Plugin, PluginOptions, PluginsRunnerContext, type PluginResult } from '@rehearsal/service';
import { type DiagnosticWithLocation } from 'typescript';

export interface GlintCheckPluginOptions extends PluginOptions {
  commentTag: string;
}

export class GlintCheckPlugin implements Plugin<PluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: GlintCheckPluginOptions
  ): PluginResult {
    const service = context.service;
    const diagnostics = service.getDiagnostics(fileName);

    if (!diagnostics.length) {
      return [];
    }

    const updatedContents = this.insertTodo(
      diagnostics[0].file.text,
      diagnostics,
      options.commentTag
    );

    context.service.setFileText(fileName, updatedContents);

    return Promise.resolve([fileName]);
  }

  insertTodo(
    fileContents: string,
    diagnostics: DiagnosticWithLocation[],
    commentTag: string
  ): string {
    const lines = fileContents.split('\n');

    for (const diagnostic of diagnostics.reverse()) {
      const start = pathUtils.offsetToPosition(fileContents, diagnostic.start);
      const index = start.line;
      const [leadingWhitespace, indentation] = /^\s*\n?(\s*)/.exec(lines[index]) ?? ['', ''];
      lines.splice(
        index,
        0,
        `${leadingWhitespace}{{! @glint-expect-error ${commentTag} TODO TS${diagnostic.code}: ${diagnostic.messageText} }}${indentation}`
      );
    }

    return lines.join('\n');
  }
}
