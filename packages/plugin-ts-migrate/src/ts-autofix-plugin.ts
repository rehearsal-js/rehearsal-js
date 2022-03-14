import { Plugin } from 'ts-migrate-server';

import type { Reporter } from '@rehearsal/reporter';

/**
 * This ts-migrate plugin will match against "ts-migrate" comments per file
 * parse the typescript diagnostic code into a more helpful comment
 * and if possible will autofix and mitigate based on the diagnostic code
 */
const tsAutofixPlugin: Plugin<{
  reporter: Reporter;
  updateCommentsOnly?: boolean;
}> = {
  name: 'ts-autofix-plugin',
  async run({ fileName, text, getLanguageService }) {
    const diagnostics = getLanguageService().getSemanticDiagnostics(fileName);
    console.log(diagnostics);

    return text;
  },
};

export default tsAutofixPlugin;
