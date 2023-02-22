import { analyzeProject } from '@glint/core';
import { Diagnostic } from 'typescript';

type GlintDiagnostic = Diagnostic & { isGlintTransformDiagnostic?: boolean };
type TransformManager = {
  getTransformDiagnostics: (fileName: string) => GlintDiagnostic[];
};
export class RehearsalGlintService {
  private rootDir: string;
  private glintParser?: TransformManager;
  constructor(projectDirectory: string) {
    this.rootDir = projectDirectory;
    // if (!this.glintParser) {
    //   const { transformManager } = analyzeProject(projectDirectory);
    //   this.glintParser = transformManager;
    // }
    // const { transformManager } = analyzeProject(projectDirectory);
    // this.glintParser = transformManager;
  }
  getGlintDiagnostics(fileName: string): GlintDiagnostic[] {
    if (!this.glintParser) {
      const { transformManager } = analyzeProject(this.rootDir);
      this.glintParser = transformManager;
    }
    return this.glintParser.getTransformDiagnostics(fileName);
  }
}
