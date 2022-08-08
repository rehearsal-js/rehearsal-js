import ts from 'typescript';
import { type FixResult } from '.';

export function getCommentsOnlyResult(diagnostic: ts.DiagnosticWithLocation): FixResult {
  const { file, start } = diagnostic;
  const { line, character } = ts.getLineAndCharacterOfPosition(file, start);
  return {
    fixedFiles: [],
    commentedFiles: [
      {
        fileName: file.fileName,
        location: {
          line,
          character,
        },
      },
    ],
  };
}

export function getCodemodResult(
  modifiedSourceFile: ts.SourceFile,
  updatedText: string,
  insertionPos: number
): FixResult {
  const { line, character } = ts.getLineAndCharacterOfPosition(modifiedSourceFile, insertionPos);
  return {
    fixedFiles: [
      {
        fileName: modifiedSourceFile.fileName,
        updatedText,
        location: {
          line,
          character,
        },
      },
    ],
    commentedFiles: [],
  };
}
