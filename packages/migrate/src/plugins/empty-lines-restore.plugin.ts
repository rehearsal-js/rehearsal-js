import { Plugin, type PluginParams, type PluginResult } from '@rehearsal/service';

/**
 * Replaces empty line placeholders set by EmptyLinesPreservePlugin with real empty lines
 */
export default class EmptyLinesRestorePlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    const text = this.service.getFileText(fileName);

    this.logger?.debug(`Plugin 'EmptyLinesRestore' run on ${fileName}`);

    const newText = text.replace(/\/\*:line:\*\//g, '');
    this.service.setFileText(fileName, newText);

    return [fileName];
  }
}
