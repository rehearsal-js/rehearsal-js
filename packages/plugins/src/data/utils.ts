import type { FixedFile } from '@rehearsal/codefixes';
import type { FileRole, Location, ProcessedFile } from '@rehearsal/reporter';
import type { DiagnosticWithLocation, SourceFile } from 'typescript';
import { getLineAndCharacterOfPosition } from 'typescript';

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

export function getLocation(sourceFile: SourceFile, start: number): Location {
  const { line, character } = getLineAndCharacterOfPosition(sourceFile, start);

  return {
    line: line + 1,
    character: character + 1,
  };
}

export function getFixedFileData(fixedFile: FixedFile, entryFileName: string): ProcessedFile {
  const roles = getRoles(fixedFile.fileName, entryFileName, true);
  return {
    fileName: fixedFile.fileName,
    location: fixedFile.location,
    fixed: true,
    code: fixedFile.code,
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
    code: undefined,
    codeFixAction: undefined,
    hint: hint,
    hintAdded: true,
    roles,
  };
}

export function getInitialEntryFileData(diagnostic: DiagnosticWithLocation): ProcessedFile {
  return {
    fileName: diagnostic.file.fileName,
    location: getLocation(diagnostic.file, diagnostic.start),
    fixed: false,
    code: undefined,
    codeFixAction: undefined,
    hint: undefined,
    hintAdded: false,
    roles: ['analysisTarget', 'unmodified'],
  };
}
