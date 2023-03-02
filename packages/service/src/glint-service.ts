import { DocumentCache, TransformManager, analyzeProject } from '@glint/core';
import { type ProjectAnalysis } from '@glint/core';
import * as ts from 'typescript';
import { GlintServiceHost } from './glint-service-host.js';

// const { analyzeProject } = import('@glint/core');

type GlintLanguageServer = ProjectAnalysis['languageServer'];
// type TransformManager = ProjectAnalysis['transformManager'];
type Diagnostics = ReturnType<GlintLanguageServer['getDiagnostics']>;
// type GlintConfig = ProjectAnalysis['glintConfig'];
type GetInnerType<T> = T extends Array<infer I> ? I : never;
export type GlintDiagnostic = GetInnerType<Diagnostics>;

export class GlintService {
  protected readonly host: GlintServiceHost;
  protected readonly service: GlintLanguageServer;
  protected readonly transformManager: TransformManager;
  protected readonly ts: typeof import('typescript');
  protected readonly documents: DocumentCache;

  private tsService: ts.LanguageService;

  constructor(glintProjectDir: string) {
    const { languageServer, documents, transformManager, glintConfig } =
      analyzeProject(glintProjectDir);

    this.service = languageServer;
    this.transformManager = transformManager;
    this.ts = glintConfig.ts;
    this.documents = documents;

    this.host = new GlintServiceHost(documents, transformManager, glintConfig);

    this.service = languageServer;
    this.tsService = languageServer.service;
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
    this.host.setScriptSnapshot(fileName, text);
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
  getSourceFile(fileName: string): ts.SourceFile {
    return this.tsService.getProgram()!.getSourceFile(fileName)!;
  }

  /**
   * Gets the LanguageService
   */
  // getLanguageService(): GlintLanguageServer {
  getLanguageService(): ts.LanguageService {
    return this.tsService;
  }

  getDiagnostics(fileName: string): ts.DiagnosticWithLocation[] {
    const diagnostics = this.service.getDiagnostics(fileName);
    console.log('glint diagnostics', diagnostics);
    const sourceFile = this.getSourceFile(fileName);

    return diagnostics.map((diagnostic) => {
      const start = diagnostic.range.start.character;
      const length = diagnostic.range.end.character - start;

      return {
        ...diagnostic,
        file: sourceFile,
        start,
        length,
      } as unknown as ts.DiagnosticWithLocation;
    });
  }
}
