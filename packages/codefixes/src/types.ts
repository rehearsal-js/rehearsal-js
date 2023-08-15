import type {
  CodeFixAction,
  DiagnosticWithLocation,
  FormatCodeSettings,
  LanguageService,
  Node,
  Program,
  TypeChecker,
} from 'typescript';

export interface DiagnosticWithContext extends DiagnosticWithLocation {
  service: LanguageService;
  program: Program;
  checker: TypeChecker;
  node?: Node;
}

export interface CodeHintList {
  [key: number]: CodeHintListElement;
}

export interface CodeHintListElement {
  hint: string;
  helpUrl?: string;
  hints?: CodeHint[];
}

export interface CodeHint {
  when: (n: Node, p: Program, c: TypeChecker) => boolean;
  hint: string;
}

export interface CodeFixCollectionFilter {
  safeFixes?: boolean;
  strictTyping?: boolean;
}

export interface CodeFixCollection {
  getFixesForDiagnostic(
    diagnostic: DiagnosticWithContext,
    filter: CodeFixCollectionFilter,
    formatSettings: FormatCodeSettings
  ): CodeFixAction[];
}

export interface CodeFix {
  getErrorCodes: () => number[];
  getCodeAction: (
    diagnostic: DiagnosticWithContext,
    formatSettings: FormatCodeSettings
  ) => CodeFixAction | undefined;
}
