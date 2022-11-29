import { CodeFixAction } from 'typescript';
import { CodeFixCollection, DiagnosticWithContext } from './types';

/**
 * Provides
 */
export class CodeFixesProvider {
  readonly collections: CodeFixCollection[];

  constructor(collections: CodeFixCollection[]) {
    this.collections = collections;
  }

  /**
   * Returns a code action contains text changes to fix the diagnosed issue
   */
  getCodeFixes(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    for (const collection of this.collections) {
      const action = collection.getFixForDiagnostic(diagnostic);
      // Return the first available CodeFixAction
      if (action !== undefined) {
        return action;
      }
    }

    return undefined;
  }
}
