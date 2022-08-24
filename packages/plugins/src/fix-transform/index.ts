import ts from 'typescript';
import { type RehearsalService } from '@rehearsal/service';
import { getCodemodData } from './utils';
import { type FixedFile, FixTransform as FixTransformI, type CodeFixAction } from './interfaces';

export { getCodemodData };
export { type FixedFile, CodeFixAction };

export class FixTransform implements FixTransformI {
  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService) => FixedFile[];

  run(diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixedFile[] {
    return this.fix ? this.fix(diagnostic, service) : [];
  }
}
