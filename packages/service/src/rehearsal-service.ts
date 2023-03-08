import type {
  CompilerOptions,
  Diagnostic,
  DiagnosticWithLocation,
  LanguageService,
  Node,
  SourceFile,
} from 'typescript';
import ts from 'typescript';

import { RehearsalServiceHost } from './rehearsal-service-host.js';

const {
  DiagnosticCategory,
  ScriptSnapshot,
  createLanguageService,
  forEachChild,
  isFunctionDeclaration,
  isMethodDeclaration,
} = ts;

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

  getDiagnostics(fileName: string): DiagnosticWithLocation[] {
    return [
      ...this.getSemanticDiagnosticsWithLocation(fileName),
      ...this.getSuggestionDiagnostics(fileName),
      ...this.getAdditionalDiagnostics(fileName),
    ];
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
   * Gets a list of suggested diagnostic objects
   */
  getSuggestionDiagnostics(fileName: string): DiagnosticWithLocation[] {
    return this.service.getSuggestionDiagnostics(fileName);
  }

  getAdditionalDiagnostics(fileName: string): DiagnosticWithLocation[] {
    const sourceFile = this.getSourceFile(fileName);
    const diagnostics: DiagnosticWithLocation[] = [];

    const visitEveryNode = (node: Node): Node | undefined => {
      if ((isFunctionDeclaration(node) || isMethodDeclaration(node)) && node.name && !node.type) {
        diagnostics.push({
          file: sourceFile,
          start: node.getStart(),
          length: node.getEnd() - node.getStart(),
          category: DiagnosticCategory.Suggestion,
          code: 7050,
          messageText: `${node.name.getText()} don't have a return type, but the type may be inferred from usage.`
        });

        return undefined;
      }

      return forEachChild(node, visitEveryNode);
    };

    visitEveryNode(sourceFile);

    return diagnostics;
  }
}
