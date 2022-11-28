import { DiagnosticWithLocation, LanguageService, Node, Program, TypeChecker } from 'typescript';
import { RehearsalService } from '@rehearsal/service';

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
  getFixForDiagnostic(diagnostic: DiagnosticWithContext): FixTransform | undefined;
}

export type CodeFixAction = 'add' | 'delete' | 'replace';

export interface FixedFile {
  fileName: string;
  updatedText: string;
  code?: string;
  codeFixAction?: CodeFixAction;
  location: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export class FixTransform {
  hint?: string;
  /** Function to fix the diagnostic issue */
  fix?: (diagnostic: DiagnosticWithLocation, service: RehearsalService) => FixedFile[];

  run(diagnostic: DiagnosticWithLocation, service: RehearsalService): FixedFile[] {
    return this.fix ? this.fix(diagnostic, service) : [];
  }
}
