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

  getFixForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    if (this.list[diagnostic.code] !== undefined) {
      return this.list[diagnostic.code].getCodeAction(diagnostic);
    }

    return undefined;
  }
}
