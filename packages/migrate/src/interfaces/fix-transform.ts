import ts from 'typescript';

export interface FixedFile {
  fileName: string;
  text: string;
}
export default class FixTransform {
  /** Engineer friendly message describes steps needs to be done to fix the related issue */
  hint?: string;

  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: ts.DiagnosticWithLocation, service: ts.LanguageService) => FixedFile[];

  run(diagnostic: ts.DiagnosticWithLocation, service: ts.LanguageService): FixedFile[] {
    return this.fix ? this.fix(diagnostic, service) : [];
  }
}
