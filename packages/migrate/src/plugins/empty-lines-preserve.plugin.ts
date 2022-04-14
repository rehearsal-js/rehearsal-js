import { Plugin, PluginParams, PluginResult } from '../interfaces/plugin';

/**
 * Preserves empty line in a multiline string to restore them in EmptyLinesRestorePlugin
 * by using comments with placeholders (:line: comments)
 */
export default class EmptyLinesPreservePlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const text = this.service.getFileText(params.fileName);

    this.logger?.debug(`Plugin 'EmptyLinesPreserve' run on ${params.fileName}`);

    return text.replace(/^( |\t)*$/gm, `/*:line:*/`);
  }
}
