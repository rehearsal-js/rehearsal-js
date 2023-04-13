import ts from 'typescript';
import { PluginOptions, Plugin } from '@rehearsal/service';
import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:rerehearse');
const { isLineBreak } = ts;

export interface ReRehearsePluginOptions extends PluginOptions {
  commentTag: string;
}

/**
 * Removes all comments with `@rehearsal` tag inside
 */
export class ReRehearsePlugin extends Plugin<ReRehearsePluginOptions> {
  async run(): Promise<string[]> {
    const { fileName, context, options } = this;

    let text = context.service.getFileText(fileName);
    const sourceFile = context.service.getSourceFile(fileName);
    const tagStarts = [...text.matchAll(new RegExp(options.commentTag, 'g'))].map((m) => m.index!);

    // Walk through all comments with a tag in it from the bottom of the file
    for (const tagStart of tagStarts.reverse()) {
      const commentSpan = context.service
        .getLanguageService()
        .getSpanOfEnclosingComment(sourceFile.fileName, tagStart, false);

      if (commentSpan === undefined) {
        continue;
      }

      // Remove comment, together with the {} that wraps around comments in React
      const boundary = this.getBoundaryOfCommentBlock(commentSpan.start, commentSpan.length, text);
      text = text.substring(0, boundary.start) + text.substring(boundary.end);
    }

    context.service.setFileText(fileName, text);

    DEBUG_CALLBACK(`Plugin 'ReRehearse' run on %O:`, fileName);

    return Promise.resolve([fileName]);
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
