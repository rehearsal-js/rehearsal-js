import fs from 'fs';

const emptyLinePlaceholder = ':line:';

/**
 * Preserves empty line in a multiline string to restore them in @restoreEmptyLines
 * by using comments with placeholders (:line: comments)
 */
export async function preserveEmptyLines(text: string): Promise<string> {
  return text.replace(/^( |\t)*$/gm, `/*${emptyLinePlaceholder}*/`);
}

/**
 * Replaces empty line placeholders in a multiline string with real empty lines
 */
export async function restoreEmptyLines(text: string): Promise<string> {
  return text.replace(/\/\*:line:\*\//g, '');
}

/**
 * Preserves empty line in a file to restore them in @restoreEmptyLines
 * by using comments with placeholders (:line: comments)
 */
export async function preserveEmptyLinesInFile(path: fs.PathLike): Promise<string> {
  return await modifyFileContent(path, preserveEmptyLines);
}

/**
 * Replaces empty line placeholders in a multiline file with real empty lines
 */
export async function restoreEmptyLinesInFile(path: fs.PathLike): Promise<string> {
  return await modifyFileContent(path, restoreEmptyLines);
}

/**
 * Modifies a file content by applying modifier function to it
 */
async function modifyFileContent(
  path: fs.PathLike,
  modifier: (text: string) => Promise<string>
): Promise<string> {
  const content = fs.readFileSync(path);
  const contentWithPlaceholders = await modifier(content.toString());
  await fs.writeFileSync(path, contentWithPlaceholders);

  return contentWithPlaceholders;
}
