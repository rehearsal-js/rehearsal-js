import ts from 'typescript';
// import { Artifact } from 'sarif';
import { type RehearsalService } from '@rehearsal/service';
import { DataAggregator, FixResult } from '@rehearsal/reporter';
// import { getInitialResult } from '../helpers/transform-utils';

// export type FileRole = Extract<
//   Artifact.roles,
//   'analysisTarget' | 'tracedFile' | 'unmodified' | 'added' | 'deleted' | 'renamed' | 'modified'
// >;

// export interface ProcessedFile {
//   fileName: string;
//   updatedText?: string;
//   location: {
//     line: number | undefined;
//     character: number | undefined;
//   };
//   fixed: boolean;
//   code?: string;
//   hintAdded: boolean;
//   hint?: string;
//   roles: FileRole[];
// }

// type FileCollection = { [fileName: string]: ProcessedFile };

// export interface FixResult {
//   analysisTarget: string;
//   files: FileCollection;
//   fixed: boolean;
//   hintAdded: boolean;
// }

export class FixTransform {
  /** Engineer friendly message describes steps needs to be done to fix the related issue */
  hint?: string;

  dataAggregator?: DataAggregator;

  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService) => FixResult;

  run(diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult {
    this.dataAggregator = DataAggregator.getInstance(diagnostic);
    return this.fix ? this.fix(diagnostic, service) : this.dataAggregator!.getResult();
  }
}
