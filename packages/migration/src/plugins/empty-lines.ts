import winston from 'winston';

const emptyLinePlaceholder = ':line:';

/**
 * Preserves empty line in a multiline string to restore them in @restoreEmptyLines
 * by using comments with placeholders (:line: comments)
 */
export async function preserveEmptyLines(params: {
  text: string;
  fileName: string;
  logger?: winston.Logger;
}): Promise<string> {
  params.logger?.debug(`Pipe transformer preserveEmptyLines run on ${params.fileName}`);
  return params.text.replace(/^( |\t)*$/gm, `/*${emptyLinePlaceholder}*/`);
}

/**
 * Replaces empty line placeholders in a multiline string with real empty lines
 */
export async function restoreEmptyLines(params: {
  text: string;
  fileName: string;
  logger?: winston.Logger;
}): Promise<string> {
  params.logger?.debug(`Pipe transformer restoreEmptyLines run on ${params.fileName}`);
  return params.text.replace(/\/\*:line:\*\//g, '');
}
