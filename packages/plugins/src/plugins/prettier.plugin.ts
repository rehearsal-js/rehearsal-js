import { Plugin } from '@rehearsal/service';
import synchronizedPrettier from '@prettier/sync';

import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:prettier');

/**
 * Source code formatting
 */
export class PrettierPlugin extends Plugin {
  async run(): Promise<string[]> {
    const { fileName, context } = this;

    const text = context.service.getFileText(fileName);

    try {
      const prettierOptions = synchronizedPrettier.resolveConfig(fileName) || {};
      prettierOptions.filepath = fileName;

      const result = synchronizedPrettier.format(text, prettierOptions);

      DEBUG_CALLBACK(`Plugin 'Prettier' run on %O:`, fileName);
      context.service.setFileText(fileName, result);

      return Promise.resolve([fileName]);
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Prettier' failed on ${fileName}: ${(e as Error).message}`);
    }

    return Promise.resolve([]);
  }
}

/**
 * Checks if prettier is used for formatting of the current application independent of eslint
 */
export function isPrettierUsedForFormatting(fileName: string): boolean {
  // TODO: Better validation can be implemented
  return synchronizedPrettier.resolveConfigFile(fileName) !== null;
}
