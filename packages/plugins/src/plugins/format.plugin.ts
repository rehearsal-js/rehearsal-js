import { Plugin, PluginOptions, type PluginResult, PluginsRunnerContext } from '@rehearsal/service';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:format');

export interface FormatPluginOptions extends PluginOptions {
  eslintOptions?: ESLint.Options;
  prettierOptions?: prettier.Options;
}

/**
 * Source code formatting
 */
export class FormatPlugin implements Plugin<FormatPluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: FormatPluginOptions
  ): PluginResult {
    options.eslintOptions ??= {};
    options.prettierOptions ??= {};

    let text: string | undefined = context.service.getFileText(fileName);

    DEBUG_CALLBACK(`Plugin 'Formatter' is running on ${fileName}`);

    try {
      if (this.usePrettier(fileName)) {
        text = await this.prettierFormat(text, fileName, options.prettierOptions);
      }

      if (this.useESlint(fileName)) {
        text = await this.prettierFormat(text, fileName, options.eslintOptions);
      }
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Lint' failed on ${fileName}: ${(e as Error).message}`);
      throw e;
    }

    if (text) {
      DEBUG_CALLBACK(`Plugin 'Lint' run with no changes on: %O`, fileName);
    }
    return [];
  }

  async eslintFormat(
    text: string,
    fileName: string,
    options: ESLint.Options
  ): Promise<string | undefined> {
    const eslint = new ESLint(options);

    this.terminalOutput(false);
    const [report] = await eslint.lintText(text, { filePath: fileName });
    this.terminalOutput(true);

    if (!report || !report.output || report.output === text) {
      return undefined;
    }

    return report.output;
  }

  async prettierFormat(
    text: string,
    fileName: string,
    options: prettier.Options
  ): Promise<string | undefined> {
    const prettierOptions = prettier.resolveConfig.sync(fileName) || {};
    prettierOptions.filepath = fileName;

    return prettier.format(text, options);
  }

  /**
   * Checks if prettier is used for formatting of the current application independent of eslint
   */
  usePrettier(fileName: string): boolean {
    // TODO: Better validation can be implemented
    return prettier.resolveConfigFile.sync(fileName) !== null;
  }

  useESlint(fileName: string): boolean {
    return true;
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
