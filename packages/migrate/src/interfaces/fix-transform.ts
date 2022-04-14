import ts from 'typescript';

export default class FixTransform {
  /** Engineer friendly message describes steps needs to be done to fix the related issue */
  hint?: string;

  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: ts.LanguageService) => string;

  run(diagnostic: ts.DiagnosticWithLocation, service: ts.LanguageService): string {
    return this.fix ? this.fix(diagnostic, service) : diagnostic.file.getFullText();
  }
}
