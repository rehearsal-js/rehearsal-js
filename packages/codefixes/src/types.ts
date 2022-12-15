import {
  CodeFixAction,
  DiagnosticWithLocation,
  FileTextChanges,
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

export interface CodeFixCollection {
  getFixForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction | undefined;
}

export type CodeFixKind = 'insert' | 'delete' | 'replace';

export interface FixedFile {
  fileName: string;
  newCode?: string;
  oldCode?: string;
  codeFixAction?: CodeFixKind;
  location: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface CodeFix {
  getCodeAction: (diagnostic: DiagnosticWithContext) => CodeFixAction | undefined;
}

export function createCodeFixAction(
  fixName: string,
  changes: FileTextChanges[],
  description: string
): CodeFixAction {
  return {
    fixName,
    description,
    changes,
  };
}
