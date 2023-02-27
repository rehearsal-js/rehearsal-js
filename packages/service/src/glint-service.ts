import { analyzeProject, ProjectAnalysis } from '@glint/core';
// import { Diagnostic } from 'typescript';

// type GlintDiagnostic = Diagnostic & { isGlintTransformDiagnostic?: boolean };
type GlintLanguageServer = ProjectAnalysis['languageServer'];
declare type Diagnostic = {
  range: {
    start: {
      line: number;
      character: number;
    }
    end: {
      line: number;
      character: number;
    }
  };
  severity?: 1 | 2 | 3 | 4;
  code?: number | string;
  codeDescription?: { href: string};
  source?: string;
  message: string;
};
// type TransformManager = {
//   getTransformDiagnostics: (fileName: string) => GlintDiagnostic[];
// };
export class RehearsalGlintService {
  private rootDir: string;
  private glintParser?: GlintLanguageServer;
  constructor(projectDirectory: string) {
    this.rootDir = projectDirectory;
  }
  getGlintDiagnostics(fileName: string): Diagnostic[] {
    if (!this.glintParser) {
      const { languageServer } = analyzeProject(this.rootDir);
      this.glintParser = languageServer;
    }
    return this.glintParser.getDiagnostics(fileName);
  }
}
