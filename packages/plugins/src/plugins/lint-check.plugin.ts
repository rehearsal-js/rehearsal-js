import { type PluginResult, Plugin } from '@rehearsal/service';
import { ESLint } from 'eslint';
import { debug } from 'debug';
import { setProcessTTYto } from '../helpers';

const DEBUG_CALLBACK = debug('rehearsal:plugins:lint-check');

export class LintCheckPlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    try {
      const eslint = new ESLint({ fix: false, useEslintrc: true });

      // get around typescript-eslint "WARNING:" about pre-released versions of typescript
      setProcessTTYto(false);
      const [report] = await eslint.lintText(text, { filePath: fileName });
      setProcessTTYto(true);
      const { messages: errors } = report;
      for (const error of errors) {
        this.reporter.addLintItem(fileName, error);
      }

      DEBUG_CALLBACK('LintCheck report: %O', report);
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'LintCheck' failed on ${fileName}: ${(e as Error).message}`);
    }

    DEBUG_CALLBACK(`Plugin 'LintCheck' run with no changes on: %O`, fileName);

    return [];
  }
}
