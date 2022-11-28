import { getLineAndCharacterOfPosition } from 'typescript';
import { CodeFixAction, FixedFile } from './types';
import type { SourceFile } from 'typescript';

export function getCodemodData(
  modifiedSourceFile: SourceFile,
  updatedText: string,
  insertionPos: number,
  code: string,
  action: CodeFixAction
): FixedFile[] {
  const { line, character } = getLineAndCharacterOfPosition(modifiedSourceFile, insertionPos);
  const startLine = line + 1; //bump line 0 to line 1, so on and so forth
  const startColumn = character + 1; //bump character 0 to character 1, so on and so forth

  return [
    {
      fileName: modifiedSourceFile.fileName,
      updatedText,
      code: code,
      location: {
        startLine,
        startColumn,
        endLine: startLine, //TODO: calculate endLine for multiple line insertion
        endColumn: getEndColumn(startColumn, code, action),
      },
      codeFixAction: action,
    },
  ];
}

function getEndColumn(startColumn: number, code: string, action: CodeFixAction): number {
  switch (action) {
    case 'add':
    case 'replace':
      return startColumn + code.length;
      break;
    case 'delete':
      return startColumn;
      break;
  }
}
