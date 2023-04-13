import path from 'node:path';
import { PluginOptions, type PluginResult, Plugin, PluginsRunnerContext } from '@rehearsal/service';
import { ESLint } from 'eslint';
import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:formatting');

export interface LintPluginOptions extends PluginOptions {
  eslintOptions?: ESLint.Options;
  reportErrors: boolean;
}

/**
 * Source code formatting
 */
export class LintPlugin extends Plugin<LintPluginOptions> {
  constructor(fileName: string, context: PluginsRunnerContext, options: LintPluginOptions) {
    super(fileName, context, options);
    this.options = {
      eslintOptions: {},
      ...options,
    };
  }
  async run(): PluginResult {
    const { fileName, context, options } = this;

    if (path.extname(fileName) === '.hbs') {
      return [];
    }

    const text = context.service.getFileText(fileName);

    try {
      const eslint = new ESLint(options.eslintOptions);

      this.terminalOutput(false);
      const [report] = await eslint.lintText(text, { filePath: fileName });
      this.terminalOutput(true);

      if (options.reportErrors && report) {
        const { messages: errors } = report;
        for (const error of errors) {
          context.reporter.addLintItemToRun(fileName, error);
        }
      }

      DEBUG_CALLBACK('Lint report: %O', report);

      if (report && report.output && report.output !== text) {
        DEBUG_CALLBACK(`Plugin 'Lint' run on %O:`, fileName);

        context.service.setFileText(fileName, report.output);

        return [fileName];
      }
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Lint' failed on ${fileName}: ${(e as Error).message}`);
      throw e;
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
