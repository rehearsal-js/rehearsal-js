import { type PluginResult, Plugin } from '@rehearsal/service';
import { debug } from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:empty-lines-restore');

/**
 * Replaces empty line placeholders set by EmptyLinesPreservePlugin with real empty lines
 */
export class EmptyLinesRestorePlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    DEBUG_CALLBACK(`Plugin 'EmptyLinesRestore' run on %O:`, fileName);

    const newText = text.replace(/^(( |\t)*)\/\/:line:$/gm, '$1');

    this.service.setFileText(fileName, newText);

    return [fileName];
  }
}
