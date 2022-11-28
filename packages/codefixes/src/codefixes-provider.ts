import { CodeFixCollection, DiagnosticWithContext, FixTransform } from './types';

/**
 * Provides
 */
export class CodeFixesProvider {
  readonly collections: CodeFixCollection[];

  constructor(collections: CodeFixCollection[]) {
    this.collections = collections;
  }

  /**
   * Returns a list of FixTransforms.
   */
  getCodeFixes(diagnostic: DiagnosticWithContext): FixTransform[] {
    const fixes: FixTransform[] = [];

    for (const collection of this.collections) {
      const fix = collection.getFixForDiagnostic(diagnostic);
      if (fix !== undefined) {
        fixes.push(fix);
      }
    }

    return fixes;
  }
}
