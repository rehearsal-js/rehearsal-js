import type { CodeFixAction } from 'typescript';
import type { CodeFixCollection, DiagnosticWithContext } from './types.js';

/**
 * Provides
 */
export class CodeFixesProvider {
  readonly collections: CodeFixCollection[];

  constructor(collections: CodeFixCollection[]) {
    this.collections = collections;
  }

  /**
   * Returns all available to user code actions containing text changes to fix the diagnosed issue
   */
  getCodeFixes(diagnostic: DiagnosticWithContext): CodeFixAction[] {
    let fixActions: CodeFixAction[] = [];
    for (const collection of this.collections) {
      fixActions = [...fixActions, ...collection.getFixesForDiagnostic(diagnostic)];
    }

    return fixActions;
  }
}
