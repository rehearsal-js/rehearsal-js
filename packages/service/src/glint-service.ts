import TransformManager from '@glint/core/lib/common/transform-manager';
import DocumentCache from '@glint/core/lib/common/document-cache';
import { GlintConfig } from '@glint/core/lib/config';
import { type Diagnostic as GlintDiagnostic } from '@glint/core/lib/transform';

export interface GlintConfigInput {
  environment: string | Array<string> | Record<string, unknown>;
  checkStandaloneTemplates?: boolean;
}

export class RehearsalGlintService {
  private glintParser: TransformManager;
  constructor(ts: typeof import('typescript'), configPath: string, config: GlintConfigInput) {
    const glintConfig = this.getGlintConfig(ts, configPath, config);
    const documents = new DocumentCache(glintConfig);
    this.glintParser = new TransformManager(glintConfig, documents);
  }
  getGlintDiagnostics(fileName: string): GlintDiagnostic[] {
    return this.glintParser.getTransformDiagnostics(fileName);
  }
  private getGlintConfig(
    ts: typeof import('typescript'),
    configPath: string,
    config: GlintConfigInput
  ): GlintConfig {
    return new GlintConfig(ts, configPath, config);
  }
}
