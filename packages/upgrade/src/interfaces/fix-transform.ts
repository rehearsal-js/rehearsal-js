import ts from 'typescript';
import { Artifact } from 'sarif';
import { type RehearsalService } from '@rehearsal/service';
import { getCommentsOnlyResult } from '../helpers/transform-utils';

type FileRole = Extract<
  Artifact.roles,
  'analysisTarget' | 'tracedFile' | 'unmodified' | 'added' | 'deleted' | 'renamed'
>;

export interface ProcessedFile {
  fileName: string;
  updatedText?: string;
  location?: {
    line: number;
    character: number;
  };
  codemod: boolean;
  code?: string;
  commentAdded: boolean;
  comment?: string;
  roles: FileRole[];
}

export interface FixResult {
  files: ProcessedFile[];
}

export class FixTransform {
  /** Engineer friendly message describes steps needs to be done to fix the related issue */
  hint?: string;

  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService) => FixResult;

  run(diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult {
    return this.fix ? this.fix(diagnostic, service) : getCommentsOnlyResult(diagnostic);
  }
}
