import { Plugin, type PluginParams, type PluginResult } from '@rehearsal/service';
/**
 * Preserves empty line in a multiline string to restore them in EmptyLinesRestorePlugin
 * by using comments with placeholders (:line: comments)
 */
export default class EmptyLinesPreservePlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    const text = this.service.getFileText(fileName);

    this.logger?.debug(`Plugin 'EmptyLinesPreserve' run on ${fileName}`);

    const newText = text.replace(/^( |\t)*$/gm, `/*:line:*/`);
    this.service.setFileText(fileName, newText);
    return [fileName];
  }
}
