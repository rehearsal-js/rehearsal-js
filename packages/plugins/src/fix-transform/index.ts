import ts from 'typescript';
import { type RehearsalService } from '@rehearsal/service';
import { getCodemodResult, getCommentsOnlyResult } from './utils';
import { type FixResult, type FixedFile, FixTransform as FixTransformI } from './interfaces';


export { getCodemodResult, getCommentsOnlyResult };
export { FixResult, FixedFile };

export class FixTransform implements FixTransformI {
  /** Engineer friendly message describes steps needs to be done to fix the related issue */
  hint?: string;

  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService) => FixResult;

  run(diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult {
    return this.fix ? this.fix(diagnostic, service) : getCommentsOnlyResult(diagnostic);
  }
}

