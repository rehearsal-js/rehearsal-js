import { CodeFixAction } from 'typescript';
import { CodeFix, CodeFixCollection, DiagnosticWithContext } from './index.js';

/**
 * Provides
 */
export class BaseCodeFixCollection implements CodeFixCollection {
  readonly list;

  constructor(list: { [key: number]: CodeFix[] }) {
    this.list = list;
  }

  getFixesForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction[] {
    if (this.list[diagnostic.code] === undefined) {
      return [];
    }

    const codeFixActions = [];

    for (const codefix of this.list[diagnostic.code]) {
      const codeFixAction = codefix.getCodeAction(diagnostic)
      if (codeFixAction !== undefined) {
        codeFixActions.push(codeFixAction);
      }
    }

    return codeFixActions;
  }
}
