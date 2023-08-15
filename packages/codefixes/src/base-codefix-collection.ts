import { CodeFixAction, FormatCodeSettings } from 'typescript';
import {
  CodeFix,
  CodeFixCollection,
  CodeFixCollectionFilter,
  DiagnosticWithContext,
} from './index.js';

/**
 * Provides
 */
export class BaseCodeFixCollection implements CodeFixCollection {
  readonly fixes: { [key: number]: CodeFix[] } = {};

  constructor(codefixes: CodeFix[]) {
    for (const codefix of codefixes) {
      for (const error of codefix.getErrorCodes()) {
        this.fixes[error] ? this.fixes[error].push(codefix) : (this.fixes[error] = [codefix]);
      }
    }
  }

  getFixesForDiagnostic(
    diagnostic: DiagnosticWithContext,
    _filter: CodeFixCollectionFilter,
    formatCodeSettings: FormatCodeSettings
  ): CodeFixAction[] {
    if (!this.fixes[diagnostic.code]) {
      return [];
    }

    const codeFixActions = this.fixes[diagnostic.code]
      .map((fix) => fix.getCodeAction(diagnostic, formatCodeSettings))
      .filter((codefix) => codefix) as CodeFixAction[];

    return codeFixActions;
  }
}
