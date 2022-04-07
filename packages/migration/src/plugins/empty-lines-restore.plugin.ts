import { Plugin, PluginParams, PluginResult } from '../interfaces/plugin';

/**
 * Replaces empty line placeholders set by EmptyLinesPreservePlugin with real empty lines
 */
export default class EmptyLinesRestorePlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const text = this.service.getFileText(params.fileName);

    this.logger?.debug(`Plugin 'EmptyLinesRestore' run on ${params.fileName}`);

    return text.replace(/\/\*:line:\*\//g, '');
  }
}
