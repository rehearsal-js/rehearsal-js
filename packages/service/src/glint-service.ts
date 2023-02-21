import { analyzeProject } from '@glint/core';
import { Diagnostic } from 'typescript';

type GlintDiagnostic = Diagnostic & { isGlintTransformDiagnostic?: boolean };
type TransformManager = {
  getTransformDiagnostics: (fileName: string) => GlintDiagnostic[];
};
export class RehearsalGlintService {
  private glintParser: TransformManager;
  constructor(projectDirectory: string) {
    const { transformManager } = analyzeProject(projectDirectory);
    this.glintParser = transformManager;
  }
  getGlintDiagnostics(fileName: string): GlintDiagnostic[] {
    return this.glintParser.getTransformDiagnostics(fileName);
  }
}
