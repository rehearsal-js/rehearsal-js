import { type PluginResult, Plugin } from '@rehearsal/service';

/**
 * Replaces empty line placeholders set by EmptyLinesPreservePlugin with real empty lines
 */
export class EmptyLinesRestorePlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    this.logger?.debug(`Plugin 'EmptyLinesRestore' run on ${fileName}`);

    const newText = text.replace(/^(( |\t)*)\/\/:line:$/gm, '$1');

    this.service.setFileText(fileName, newText);

    return [fileName];
  }
}
