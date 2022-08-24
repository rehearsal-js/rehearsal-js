import ts from 'typescript';
import { type FixedFile, type CodeFixAction } from '.';

export function getCodemodData(
  modifiedSourceFile: ts.SourceFile,
  updatedText: string,
  insertionPos: number,
  code?: string,
  action?: CodeFixAction
): FixedFile[] {
  const { line, character } = ts.getLineAndCharacterOfPosition(modifiedSourceFile, insertionPos);
  return [
    {
      fileName: modifiedSourceFile.fileName,
      updatedText,
      code: code,
      location: {
        line: line + 1, //bump line 0 to line 1, so on and so forth
        character: character + 1, //bump character 0 to character 1, so on and so forth
      },
      codeFixAction: action,
    },
  ];
}
