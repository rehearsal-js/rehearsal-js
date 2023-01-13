import { type SourceFile } from 'typescript';
import { Location } from '@rehearsal/reporter';

const INDEX_BUMP = 1; //bump line and column numbers from 0 to 1 for sarif reader
const COMMENT_BUMP = 1; //bump line numbers because added comment pushes the line number down by 1

export function getLocation(sourceFile: SourceFile, start: number, length: number): Location {
  const { line: startLine, character: startColumn } =
    sourceFile.getLineAndCharacterOfPosition(start);
  const { line: endLine, character: endColumn } = sourceFile.getLineAndCharacterOfPosition(
    start + length
  );

  return {
    startLine: startLine + INDEX_BUMP + COMMENT_BUMP,
    startColumn: startColumn + INDEX_BUMP,
    endLine: endLine + INDEX_BUMP + COMMENT_BUMP,
    endColumn: endColumn + INDEX_BUMP,
  };
}

export function setProcessTTYto(setting: boolean): void {
  if (typeof process !== 'undefined') {
    process.stdout.isTTY = setting;
  }
}
