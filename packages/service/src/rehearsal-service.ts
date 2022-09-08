import type {
  CompilerOptions,
  Diagnostic,
  DiagnosticWithLocation,
  LanguageService,
  SourceFile,
} from 'typescript';
import { createLanguageService, resolveModuleName, ScriptSnapshot, sys } from 'typescript';

import { RehearsalServiceHost } from './rehearsal-service-host';

/**
 * Service represents the list of helper functions wrapped over compiled program context.
 * Service helps to get diagnostics and work with source files content (through ServiceHost).
 */
export class RehearsalService {
  protected readonly host: RehearsalServiceHost;
  protected readonly service: LanguageService;

  constructor(compilerOptions: CompilerOptions = {}, fileNames: string[]) {
    this.host = new RehearsalServiceHost(compilerOptions, fileNames);
    this.service = createLanguageService(this.host);
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
    // Type-guard for DiagnosticWithLocation
    const withLocation = (diagnostic: Diagnostic): diagnostic is DiagnosticWithLocation =>
      diagnostic.start !== undefined && diagnostic.length !== undefined;

    return this.service.getSemanticDiagnostics(fileName).filter(withLocation);
  }

  /**
   * Provides a path to a module file by its name
   */
  resolveModuleName(moduleName: string, containingFile: string): string | undefined {
    const result = resolveModuleName(
      moduleName,
      containingFile,
      this.host.getCompilationSettings(),
      sys
    );
    return result?.resolvedModule?.resolvedFileName;
  }
}
