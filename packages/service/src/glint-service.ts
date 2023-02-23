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
  }
  getGlintDiagnostics(fileName: string): GlintDiagnostic[] {
    console.log('filename', fileName);
    if (!this.glintParser) {
      console.log('not glintParser');
      const { transformManager } = analyzeProject(this.rootDir);
      this.glintParser = transformManager;
    }
    console.log('this.glintParser', this.glintParser.getTransformDiagnostics);
    return this.glintParser.getTransformDiagnostics(fileName);
  }
}
