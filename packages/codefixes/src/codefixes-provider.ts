import type { CodeFixAction } from 'typescript';
import type { CodeFixCollection, DiagnosticWithContext } from './types';

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
  getCodeFixes(
    diagnostic: DiagnosticWithContext,
    onlySafeFixes: boolean,
    strictTyping: boolean
  ): CodeFixAction[] {
    let fixActions: CodeFixAction[] = [];
    for (const collection of this.collections) {
      fixActions = [
        ...fixActions,
        ...collection.getFixesForDiagnostic(diagnostic, onlySafeFixes, strictTyping),
      ];
    }

    return fixActions;
  }
}
