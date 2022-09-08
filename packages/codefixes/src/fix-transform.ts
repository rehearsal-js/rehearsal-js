import type { RehearsalService } from '@rehearsal/service';
import type { DiagnosticWithLocation, SourceFile } from 'typescript';
import { getLineAndCharacterOfPosition } from 'typescript';

export type CodeFixAction = 'add' | 'delete';

export interface FixedFile {
  fileName: string;
  updatedText: string;
  code?: string;
  codeFixAction?: CodeFixAction;
  location: {
    line: number;
    character: number;
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
  code?: string,
  action?: CodeFixAction
): FixedFile[] {
  const { line, character } = getLineAndCharacterOfPosition(modifiedSourceFile, insertionPos);
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
