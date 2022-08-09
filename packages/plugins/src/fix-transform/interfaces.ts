import ts from 'typescript';
import { type RehearsalService } from '@rehearsal/service';

export interface FixedFile {
  fileName: string;
  updatedText?: string;
  location: {
    line: number;
    character: number;
  };
}

export interface FixResult {
  fixedFiles: FixedFile[];
  commentedFiles: FixedFile[];
}

export interface FixTransform {
  /** Engineer friendly message describes steps needs to be done to fix the related issue */
  hint?: string;

  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService) => FixResult;

  run(diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult;
}
