import { type PluginResult, Plugin } from '@rehearsal/service';
import { ESLint } from 'eslint';
import { debug } from 'debug';
import { setProcessTTYto } from '../helpers';

const DEBUG_CALLBACK = debug('rehearsal:plugins:formatting');

/**
 * Lint the text
 */
export class LintFixPlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    try {
      const eslint = new ESLint({ fix: true, useEslintrc: true });
      // get around typescript-eslint "WARNING:" about pre-released versions of typescript
      setProcessTTYto(false);
      const [report] = await eslint.lintText(text, { filePath: fileName });
      setProcessTTYto(true);

      DEBUG_CALLBACK('LintFix report: %O', report);

      if (report && report.output && report.output !== text) {
        DEBUG_CALLBACK(`Plugin 'LintFix' run on %O:`, fileName);

        this.service.setFileText(fileName, report.output);
        return [fileName];
      }
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'LintFix' failed on ${fileName}: ${(e as Error).message}`);
    }

    DEBUG_CALLBACK(`Plugin 'LintFix' run with no changes on: %O`, fileName);

    return [];
  }
}
