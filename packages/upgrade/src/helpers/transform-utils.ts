import ts from 'typescript';
import { FixResult, FileRole, ProcessedFile } from '../interfaces/fix-transform';

export function getLocation(sourceFile: ts.SourceFile, position: number) {
  const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, position);
  return {
    line,
    character
  };
}

export function getInitialResult(diagnostic: ts.DiagnosticWithLocation): FixResult {
  const { file, start } = diagnostic;
  const location = getLocation(file, start);
  return {
    analysisTarget: file.fileName,
    files: {
      [file.fileName]: {
        ...buildFile(file.fileName),
        location,
        roles: ['analysisTarget', 'unmodified'],
      },
    },
    fixed: false,
    hintAdded: false,
  };
}

export function addCommentDataToResult(
  result: FixResult,
  fileName: string,
  hint = '',
  roles: FileRole[] = [],
  location?: { line: number | undefined; character: number | undefined }
): FixResult {
  const file = fileName in result.files ? result.files[fileName] : buildFile(fileName);
  result.files[fileName] = {
    ...file,
    hintAdded: true,
    location: location || file.location,
    hint,
    roles: mergeRoles(file.roles, roles),
  };
  return {
    ...result,
    hintAdded: true,
  };
}

export function addCodemodDataToResult(
  result: FixResult,
  fileName: string,
  updatedText = '',
  code = '',
  roles: FileRole[] = [],
  location?: { line: number | undefined; character: number | undefined },
): FixResult {
  const file = fileName in result.files ? result.files[fileName] : buildFile(fileName);
  result.files[fileName] = {
    ...file,
    fixed: true,
    updatedText,
    location: location || file.location,
    code,
    roles: mergeRoles(file.roles, roles),
  };

  return {
    ...result,
    fixed: true,
  };
}

function buildFile(fileName: string): ProcessedFile {
  return {
    fileName,
    updatedText: '',
    location: {
      line: undefined,
      character: undefined,
    },
    fixed: false,
    code: '',
    hintAdded: false,
    hint: '',
    roles: [],
  };
}

function mergeRoles(existingRoles: FileRole[], newRoles: FileRole[]): FileRole[] {
  const roles = Array.from(new Set([...existingRoles, ...newRoles, 'modified' as const])).filter(
    (role) => role !== 'unmodified'
  );
  return roles;
}
