import { type SourceFile } from 'typescript';
import { Location } from '@rehearsal/reporter';

const INDEX_BUMP = 1; //bump line and column numbers from 0 to 1 for sarif reader

export function getLocation(sourceFile: SourceFile, start: number, length: number): Location {
  const { line: startLine, character: startColumn } =
    sourceFile.getLineAndCharacterOfPosition(start);
  const { line: endLine, character: endColumn } = sourceFile.getLineAndCharacterOfPosition(
    start + length
  );

  return {
    startLine: startLine + INDEX_BUMP,
    startColumn: startColumn + INDEX_BUMP,
    endLine: endLine + INDEX_BUMP,
    endColumn: endColumn + INDEX_BUMP,
  };
}

export function setProcessTTYto(setting: boolean): void {
  if (typeof process !== 'undefined') {
    process.stdout.isTTY = setting;
  }
}
