import { existsSync } from 'fs';
import ts, { createLanguageService, ScriptSnapshot } from 'typescript';

import { RehearsalGlintService, GlintConfigInput } from './glint-service';
import { RehearsalServiceHost } from './rehearsal-service-host';
import type {
  CompilerOptions,
  Diagnostic,
  DiagnosticWithLocation,
  LanguageService,
  SourceFile,
} from 'typescript';

/**
 * Service represents the list of helper functions wrapped over compiled program context.
 * Service helps to get diagnostics and work with source files content (through ServiceHost).
 */
export class RehearsalService {
  protected readonly host: RehearsalServiceHost;
  protected readonly service: LanguageService;
  protected readonly glintService?: RehearsalGlintService;

  constructor(
    tsCompilerOptions: CompilerOptions = {},
    fileNames: string[],
    configPath?: string,
    glintConfigInput?: GlintConfigInput
  ) {
    this.host = new RehearsalServiceHost(tsCompilerOptions, fileNames);
    this.service = createLanguageService(this.host);
    if (configPath && existsSync(configPath) && glintConfigInput) {
      this.glintService = new RehearsalGlintService(ts, configPath, glintConfigInput);
    }
  }

  private withLocation(diagnostic: Diagnostic): diagnostic is DiagnosticWithLocation {
    return diagnostic.start !== undefined && diagnostic.length !== undefined;
  }

  /**
   * Gets the content of the file from its latest in-memory state
   */
  getFileText(fileName: string): string {
    const snapshot = this.host.getScriptSnapshot(fileName);
    return snapshot?.getText(0, snapshot?.getLength()) || '';
  }

  /**
   * Updates the current state of the file with the new content
   */
  setFileText(fileName: string, text: string): void {
    this.host.setScriptSnapshot(fileName, ScriptSnapshot.fromString(text));
  }

  /**
   * Saves the latest state (snapshot) of the file to filesystem
   */
  saveFile(fileName: string): void {
    const snapshot = this.host.getScriptSnapshot(fileName);
    this.host.writeFile(fileName, snapshot?.getText(0, snapshot?.getLength()) || '');
  }

  /**
   * Gets a SourceFile object from the compiled program
   */
  getSourceFile(fileName: string): SourceFile {
    return this.service.getProgram()!.getSourceFile(fileName)!;
  }

  /**
   * Gets the LanguageService
   */
  getLanguageService(): LanguageService {
    return this.service;
  }

  /**
   * Gets a list of semantic diagnostic objects only with location information (those have related node in the AST)
   */
  getSemanticDiagnosticsWithLocation(fileName: string): DiagnosticWithLocation[] {
    return this.service.getSemanticDiagnostics(fileName).filter(this.withLocation);
  }

  /**
   * Gets a list of suggested diagnostic objects
   */
  getSuggestionDiagnostics(fileName: string): DiagnosticWithLocation[] {
    return this.service.getSuggestionDiagnostics(fileName);
  }

  getGlintDiagnostics(fileName: string): DiagnosticWithLocation[] {
    if (this.glintService) {
      return this.glintService.getGlintDiagnostics(fileName).filter(this.withLocation);
    }
    return [];
  }
}
