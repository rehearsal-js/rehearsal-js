import winston from 'winston';

import { ESLint } from 'eslint';

/**
 * Lint the text
 */
export async function lint(
  text: string,
  fileName: string,
  logger?: winston.Logger
): Promise<string> {
  const eslint = new ESLint({
    fix: true,
    useEslintrc: true,
  });

  try {
    const [report] = await eslint.lintText(text, { filePath: fileName });

    if (!report || !report.output || report.output === text) {
      return text;
    }

    return report.output;
  } catch (e) {
    logger?.error(`ESLint failed on ${fileName} with '${(e as Error).message}'`);
  }

  return text;
}
