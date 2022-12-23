import { type SourceFile, isLineBreak } from 'typescript';
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

export function getBoundaryOfCommentBlock(
  start: number,
  length: number,
  text: string
): { start: number; end: number } {
  const newStart = start - 1 >= 0 && text[start - 1] === '{' ? start - 1 : start;

  let end = start + length - 1;

  end = end + 1 < text.length && text[end + 1] === '}' ? end + 1 : end;
  end = isLineBreak(text.charCodeAt(end + 1)) ? end + 1 : end;

  return {
    start: newStart,
    end,
  };
}
