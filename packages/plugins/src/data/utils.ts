import { type DiagnosticWithLocation, type SourceFile, isLineBreak } from 'typescript';
import type { FixedFile } from '@rehearsal/codefixes';
import type { FileRole, Location, ProcessedFile } from '@rehearsal/reporter';

export function getFilesData(
  fixedFiles: FixedFile[],
  diagnostic: DiagnosticWithLocation,
  hint = ''
): { [fileName: string]: ProcessedFile } {
  const entryFileName = diagnostic.file.fileName;

  let filesData: { [fileName: string]: ProcessedFile } = {
    [entryFileName]: getInitialEntryFileData(diagnostic),
  };

  if (fixedFiles.length > 0) {
    for (const fixedFile of fixedFiles) {
      filesData = {
        ...filesData,
        [fixedFile.fileName]: getFixedFileData(fixedFile, entryFileName),
      };
    }
  } else {
    filesData = {
      [entryFileName]: {
        ...filesData[entryFileName],
        hintAdded: true,
        hint,
      },
    };
  }

  return filesData;
}

function getRoles(fileName: string, entryFileName: string, fixed: boolean): FileRole[] {
  const isEntryFile = fileName === entryFileName;

  if (isEntryFile) {
    return fixed
      ? ['analysisTarget' as const, 'modified' as const]
      : ['analysisTarget', 'unmodified'];
  }
  return fixed ? ['tracedFile' as const, 'modified' as const] : ['tracedFile', 'unmodified'];
}

export function getLocation(sourceFile: SourceFile, start: number, length: number): Location {
  const { line: startLine, character: startColumn } =
    sourceFile.getLineAndCharacterOfPosition(start);
  const { line: endLine, character: endColumn } = sourceFile.getLineAndCharacterOfPosition(
    start + length - 1
  );

  // bump 0 to 1, so on and so forth, so that sarif reader can show correct line and column numbers
  return {
    startLine: startLine + 1,
    startColumn: startColumn + 1,
    endLine: endLine + 1,
    endColumn: endColumn + 1,
  };
}

export function getFixedFileData(fixedFile: FixedFile, entryFileName: string): ProcessedFile {
  const roles = getRoles(fixedFile.fileName, entryFileName, true);
  return {
    fileName: fixedFile.fileName,
    location: fixedFile.location,
    fixed: true,
    newCode: fixedFile.newCode,
    oldCode: fixedFile.oldCode,
    codeFixAction: fixedFile.codeFixAction,
    hint: undefined,
    hintAdded: false,
    roles,
  };
}

export function getCommentedFileData(
  fileName: string,
  location: Location,
  hint: string,
  entryFileName: string
): ProcessedFile {
  const roles = getRoles(fileName, entryFileName, false);
  return {
    fileName,
    location,
    fixed: false,
    newCode: undefined,
    oldCode: undefined,
    codeFixAction: undefined,
    hint: hint,
    hintAdded: true,
    roles,
  };
}

export function getInitialEntryFileData(diagnostic: DiagnosticWithLocation): ProcessedFile {
  const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);
  // add 1 to line number, because comment pushes diagnostic down by 1 line
  const adjustedLocation = {
    ...location,
    startLine: location.startLine + 1,
    endLine: location.endLine + 1,
  };
  return {
    fileName: diagnostic.file.fileName,
    location: adjustedLocation,
    fixed: false,
    newCode: undefined,
    oldCode: undefined,
    codeFixAction: undefined,
    hint: undefined,
    hintAdded: false,
    roles: ['analysisTarget', 'unmodified'],
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
