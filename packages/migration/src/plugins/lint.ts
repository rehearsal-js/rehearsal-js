import winston from 'winston';

import { ESLint } from 'eslint';

/**
 * Lint the text
 */
export async function lint(params: {
  text: string;
  fileName: string;
  logger?: winston.Logger;
}): Promise<string> {
  const { text, fileName, logger } = params;

  try {
    const eslint = new ESLint({ fix: true, useEslintrc: true });
    const [report] = await eslint.lintText(text, { filePath: fileName });

    if (report && report.output && report.output !== text) {
      logger?.debug(`Pipe transformer 'lint' applied to ${fileName}`);

      return report.output;
    }
  } catch (e) {
    logger?.error(`Pipe transformer 'lint' failed on ${fileName} with '${(e as Error).message}'`);
  }

  logger?.debug(`Pipe transformer 'lint' applied to ${fileName} with no changes`);
  return text;
}
