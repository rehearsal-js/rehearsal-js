import ts from 'typescript';
import { type FixedFile } from '.';

export function getCodemodResult(
  modifiedSourceFile: ts.SourceFile,
  updatedText: string,
  insertionPos: number
): FixedFile[] {
  const { line, character } = ts.getLineAndCharacterOfPosition(modifiedSourceFile, insertionPos);
  return [
    {
      fileName: modifiedSourceFile.fileName,
      updatedText,
      location: {
        line,
        character,
      },
    },
  ];
}
