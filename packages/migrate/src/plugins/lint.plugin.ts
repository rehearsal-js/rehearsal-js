import { ESLint } from 'eslint';

import { Plugin, PluginParams, PluginResult } from '../interfaces/plugin';

/**
 * Lint the text
 */
export default class LintPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    const text = this.service.getFileText(fileName);

    try {
      const eslint = new ESLint({ fix: true, useEslintrc: true });
      const [report] = await eslint.lintText(text, { filePath: fileName });

      if (report && report.output && report.output !== text) {
        this.logger?.debug(`Plugin 'Lint' run on ${params.fileName}`);
        this.service.setFileText(fileName, report.output);
        return [fileName];
      }
    } catch (e) {
      this.logger?.error(`Plugin 'Lint' failed on ${params.fileName}: ${(e as Error).message}`);
    }

    this.logger?.debug(`Plugin 'Lint' run on ${params.fileName} with no changes`);

    return [];
  }
}
