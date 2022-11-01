import { type PluginResult, Plugin } from '@rehearsal/service';
import { ESLint } from 'eslint';
import { debug } from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:lint');

/**
 * Lint the text
 */
export class LintPlugin extends Plugin {
  async run(fileName: string): PluginResult {
    const text = this.service.getFileText(fileName);

    try {
      const eslint = new ESLint({ fix: true, useEslintrc: true });
      // get around typescript-eslint "WARNING:" about pre-released versions of typescript
      setProcessTTYto(false);
      const [report] = await eslint.lintText(text, { filePath: fileName });
      setProcessTTYto(true);

      DEBUG_CALLBACK('Lint report: %O', report);

      if (report && report.output && report.output !== text) {
        DEBUG_CALLBACK(`Plugin 'Lint' run on %O:`, fileName);

        this.service.setFileText(fileName, report.output);
        return [fileName];
      }
    } catch (e) {
      DEBUG_CALLBACK(`Plugin 'Lint' failed on ${fileName}: ${(e as Error).message}`);
    }

    DEBUG_CALLBACK(`Plugin 'Lint' run with no changes on: %O`, fileName);

    return [];
  }
}

function setProcessTTYto(setting: boolean): void {
  if (typeof process !== 'undefined') {
    process.stdout.isTTY = setting;
  }
}
