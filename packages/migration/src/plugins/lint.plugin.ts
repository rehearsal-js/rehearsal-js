import { ESLint } from 'eslint';

import { Plugin, PluginParams, PluginResult } from '../interfaces/plugin';

/**
 * Lint the text
 */
export default class LintPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const text = this.service.getFileText(params.fileName);

    try {
      const eslint = new ESLint({ fix: true, useEslintrc: true });
      const [report] = await eslint.lintText(text, { filePath: params.fileName });

      if (report && report.output && report.output !== text) {
        this.logger?.debug(`Plugin 'Lint' run on ${params.fileName}`);

        return report.output;
      }
    } catch (e) {
      this.logger?.error(`Plugin 'Lint' failed on ${params.fileName}: ${(e as Error).message}`);
    }

    this.logger?.debug(`Plugin 'Lint' run on ${params.fileName} with no changes`);

    return text;
  }
}
