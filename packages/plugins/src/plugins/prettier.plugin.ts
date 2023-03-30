import { Plugin, PluginOptions, type PluginResult, PluginsRunnerContext } from '@rehearsal/service';
import pretiter from 'prettier';

import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:prettier');

/**
 * Source code formatting
 */
export class PrettierPlugin implements Plugin<PluginOptions> {
  async run(fileName: string, context: PluginsRunnerContext): PluginResult {
    const text = context.service.getFileText(fileName);

    try {
      const prettierOptions = pretiter.resolveConfig.sync(fileName) || {};
      prettierOptions.filepath = fileName;

      const result = pretiter.format(text, prettierOptions);

      DEBUG_CALLBACK(`Plugin 'Prettier' run on %O:`, fileName);
      context.service.setFileText(fileName, result);

      return Promise.resolve([fileName]);
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Prettier' failed on ${fileName}: ${(e as Error).message}`);
    }

    return Promise.resolve([]);
  }
}
