import debug from 'debug';
import { PluginOptions, Plugin } from '../plugin.js';
import { getBoundaryOfCommentBlock } from './utils.js';

const DEBUG_CALLBACK = debug('rehearsal:plugins:rerehearse');

export interface ReRehearsePluginOptions extends PluginOptions {
  commentTag: string;
}

/**
 * Removes all comments with `@rehearsal` tag inside
 */
export class ReRehearsePlugin extends Plugin<ReRehearsePluginOptions> {
  async run(): Promise<string[]> {
    const { fileName, context, options } = this;

    DEBUG_CALLBACK(`this: %O`, this);

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
      const boundary = getBoundaryOfCommentBlock(commentSpan.start, commentSpan.length, text);
      text = text.substring(0, boundary.start) + text.substring(boundary.end + 1);
    }

    context.service.setFileText(fileName, text);

    DEBUG_CALLBACK(`Plugin 'ReRehearse' run on %O:`, fileName);

    return Promise.resolve([fileName]);
  }
}
