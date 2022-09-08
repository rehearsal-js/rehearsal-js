import { type PluginParams, type PluginResult, Plugin } from '@rehearsal/service';
/**
 * Preserves empty line in a multiline string to restore them in EmptyLinesRestorePlugin
 * by using comments with placeholders (:line: comments)
 */
export class EmptyLinesPreservePlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    const text = this.service.getFileText(fileName);

    this.logger?.debug(`Plugin 'EmptyLinesPreserve' run on ${fileName}`);

    const newText = text.replace(/^(( |\t)*)$/gm, `$1//:line:`);

    this.service.setFileText(fileName, newText);

    return [fileName];
  }
}
