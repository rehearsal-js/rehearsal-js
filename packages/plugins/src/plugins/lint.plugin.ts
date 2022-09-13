import { type PluginResult, Plugin } from '@rehearsal/service';
import { ESLint } from 'eslint';

/**
 * Lint the text
 */
export class LintPlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    try {
      const eslint = new ESLint({ fix: true, useEslintrc: true });
      const [report] = await eslint.lintText(text, { filePath: fileName });

      if (report && report.output && report.output !== text) {
        this.logger?.debug(`Plugin 'Lint' run on ${fileName}`);
        this.service.setFileText(fileName, report.output);
        return [fileName];
      }
    } catch (e) {
      this.logger?.error(`Plugin 'Lint' failed on ${fileName}: ${(e as Error).message}`);
    }

    this.logger?.debug(`Plugin 'Lint' run on ${fileName} with no changes`);

    return [];
  }
}
