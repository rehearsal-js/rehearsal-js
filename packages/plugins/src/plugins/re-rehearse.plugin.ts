import { type PluginResult, Plugin } from '@rehearsal/service';
import { debug } from 'debug';
import { getBoundaryOfCommentBlock } from '../data/utils';

const DEBUG_CALLBACK = debug('rehearsal:plugins:rerehearse');

/**
 * Removes all comments with `@rehearsal` tag inside
 */
export class ReRehearsePlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const tag = '@rehearsal';

    let text = this.service.getFileText(fileName);
    const sourceFile = this.service.getSourceFile(fileName);
    const tagStarts = [...text.matchAll(new RegExp(tag, 'g'))].map((m) => m.index!);

    // Walk through all comments with a tag in it from the bottom of the file
    for (const tagStart of tagStarts.reverse()) {
      const commentSpan = this.service
        .getLanguageService()
        .getSpanOfEnclosingComment(sourceFile.fileName, tagStart, false);

      if (commentSpan === undefined) {
        continue;
      }

      // Remove comment, together with the {} that wraps around comments in React, and  `\n`
      const boundary = getBoundaryOfCommentBlock(commentSpan.start, commentSpan.length, text);
      text = text.substring(0, boundary.start) + text.substring(boundary.end + 1);
    }

    this.service.setFileText(fileName, text);

    DEBUG_CALLBACK(`Plugin 'ReRehearse' run on %O:`, fileName);

    return [fileName];
  }
}
