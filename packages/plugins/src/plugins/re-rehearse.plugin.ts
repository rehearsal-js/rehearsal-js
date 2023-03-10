import ts from 'typescript';
import { Plugin, PluginOptions, type PluginResult, PluginsRunnerContext } from '@rehearsal/service';
import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:rerehearse');
const { isLineBreak } = ts;

export interface ReRehearsePluginOptions extends PluginOptions {
  commentTag?: string;
}

/**
 * Removes all comments with `@rehearsal` tag inside
 */
export class ReRehearsePlugin implements Plugin<ReRehearsePluginOptions> {
  async *run(
    fileName: string,
    context: PluginsRunnerContext,
    options: ReRehearsePluginOptions
  ): PluginResult {
    options.commentTag ??= '@rehearsal';

    let text = context.rehearsal.getFileText(fileName);
    const sourceFile = context.rehearsal.getSourceFile(fileName);
    const tagStarts = [...text.matchAll(new RegExp(options.commentTag, 'g'))].map((m) => m.index!);

    // Walk through all comments with a tag in it from the bottom of the file
    for await (const tagStart of tagStarts.reverse()) {
      const commentSpan = context.rehearsal
        .getLanguageService()
        .getSpanOfEnclosingComment(sourceFile.fileName, tagStart, false);

      if (commentSpan === undefined) {
        continue;
      }

      // Remove comment, together with the {} that wraps around comments in React, and  `\n`
      const boundary = this.getBoundaryOfCommentBlock(commentSpan.start, commentSpan.length, text);
      text = text.substring(0, boundary.start) + text.substring(boundary.end + 1);

      // Yielding back to the prompt if need be
      yield;
    }

    context.rehearsal.setFileText(fileName, text);

    DEBUG_CALLBACK(`Plugin 'ReRehearse' run on %O:`, fileName);

    return [fileName];
  }

  getBoundaryOfCommentBlock(
    start: number,
    length: number,
    text: string
  ): { start: number; end: number } {
    const newStart = start - 1 >= 0 && text[start - 1] === '{' ? start - 1 : start;

    let end = start + length - 1;

    end = end + 1 < text.length && text[end + 1] === '}' ? end + 1 : end;
    end = isLineBreak(text.charCodeAt(end + 1)) ? end + 1 : end;

    return {
      start: newStart,
      end,
    };
  }
}
