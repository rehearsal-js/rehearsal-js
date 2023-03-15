import { Plugin, PluginOptions, type PluginResult, PluginsRunnerContext } from '@rehearsal/service';
import { format } from 'prettier';

import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:prettier');

export type PrettierPluginOptions = PluginOptions;

/**
 * Source code formatting
 */
export class PrettierPlugin implements Plugin<PrettierPluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: PrettierPluginOptions
  ): PluginResult {
    const text = context.rehearsal.getFileText(fileName);

    try {
      const result = format(text, options);

      DEBUG_CALLBACK(`Plugin 'Prettier' run on %O:`, fileName);
      context.rehearsal.setFileText(fileName, result);

      return Promise.resolve([fileName]);
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Prettier' failed on ${fileName}: ${(e as Error).message}`);
    }

    return Promise.resolve([]);
  }
}
