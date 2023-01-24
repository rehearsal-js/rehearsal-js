import { CodeFixAction } from 'typescript';
import { CodeFix, CodeFixCollection, DiagnosticWithContext } from '.';

/**
 * Provides
 */
export class BaseCodeFixCollection implements CodeFixCollection {
  readonly list;

  constructor(list: { [key: number]: CodeFix }) {
    this.list = list;
  }

  getFixesForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction[] {
    if (this.list[diagnostic.code] === undefined) {
      return [];
    }

    const codeFixAction = this.list[diagnostic.code].getCodeAction(diagnostic);

    if (codeFixAction === undefined) {
      return [];
    }

    return [codeFixAction];
  }
}
