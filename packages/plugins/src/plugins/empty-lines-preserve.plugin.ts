import { type PluginResult, Plugin } from '@rehearsal/service';
import { debug } from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:empty-lines-preserve');

/**
 * Preserves empty line in a multiline string to restore them in EmptyLinesRestorePlugin
 * by using comments with placeholders (:line: comments)
 */
export class EmptyLinesPreservePlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    DEBUG_CALLBACK(`Plugin 'EmptyLinesPreserve' run on %O:`, fileName);

    const newText = text.replace(/^(( |\t)*)$/gm, `$1//:line:`);

    this.service.setFileText(fileName, newText);

    return [fileName];
  }
}
