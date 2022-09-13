import { isLineBreak } from 'typescript';

import { Plugin, type PluginResult } from '@rehearsal/service';

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

      // Comment end, including a tailing new line character
      const commentSpanEnd =
        commentSpan.start +
        commentSpan.length +
        +isLineBreak(text.charCodeAt(commentSpan.start + commentSpan.length)); // include `\n`

      // Remove comment
      text = text.substring(0, commentSpan.start) + text.substring(commentSpanEnd);
    }

    this.service.setFileText(fileName, text);

    this.logger?.debug(`Plugin 'Re-Rehearse' run on ${fileName}`);

    return [fileName];
  }
}
