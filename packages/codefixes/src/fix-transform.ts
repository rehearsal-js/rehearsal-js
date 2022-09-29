import type { RehearsalService } from '@rehearsal/service';
import type { DiagnosticWithLocation, SourceFile } from 'typescript';
import { getLineAndCharacterOfPosition } from 'typescript';

export type CodeFixAction = 'add' | 'delete' | 'replace';

export interface FixedFile {
  fileName: string;
  updatedText: string;
  code?: string;
  codeFixAction?: CodeFixAction;
  location: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export class FixTransform {
  hint?: string;
  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: DiagnosticWithLocation, service: RehearsalService) => FixedFile[];

  run(diagnostic: DiagnosticWithLocation, service: RehearsalService): FixedFile[] {
    return this.fix ? this.fix(diagnostic, service) : [];
  }
}

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
