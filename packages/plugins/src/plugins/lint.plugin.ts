import { Plugin, PluginOptions, type PluginResult, PluginsRunnerContext } from '@rehearsal/service';
import { ESLint } from 'eslint';
import { debug } from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:formatting');

export interface LintPluginOptions extends PluginOptions {
  eslintOptions?: ESLint.Options;
  reportErrors?: boolean;
}

/**
 * Source code formatting
 */
export class LintPlugin implements Plugin<LintPluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: LintPluginOptions
  ): PluginResult {
    options.eslintOptions ??= {};
    options.reportErrors ??= false;

    const text = context.rehearsal.getFileText(fileName);

    try {
      const eslint = new ESLint(options.eslintOptions);

      this.terminalOutput(false);
      const [report] = await eslint.lintText(text, { filePath: fileName });
      this.terminalOutput(true);

      if (options.reportErrors) {
        const { messages: errors } = report;
        for (const error of errors) {
          context.reporter.addLintItemToRun(fileName, error);
        }
      }

      DEBUG_CALLBACK('Lint report: %O', report);

      if (report && report.output && report.output !== text) {
        DEBUG_CALLBACK(`Plugin 'Lint' run on %O:`, fileName);

        context.rehearsal.setFileText(fileName, report.output);

        return [fileName];
      }
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Lint' failed on ${fileName}: ${(e as Error).message}`);
    }

    DEBUG_CALLBACK(`Plugin 'Lint' run with no changes on: %O`, fileName);
    return [];
  }

  /**
   * Get around typescript-eslint "WARNING:" about pre-released versions of typescript
   */
  terminalOutput(enable: boolean): void {
    if (typeof process !== 'undefined') {
      process.stdout.isTTY = enable;
    }
  }
}
