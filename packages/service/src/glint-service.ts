// This is disabled because vscode-uri is a commonjs module, which causes TS and Eslint to disagree
// about how it should be imported (╯°□°)╯︵ ┻━┻
// eslint-disable-next-line import/default
import VSCodeURI from 'vscode-uri';
import ts from 'typescript';
import {
  DiagnosticSeverity,
  type TextDocumentEdit,
  type Diagnostic,
  type Range,
  type CodeAction,
} from 'vscode-languageserver';
import { Service } from './rehearsal-service.js';
import type { GlintLanguageServer, TransformManager } from '@glint/core';

import type { DiagnosticWithLocation, Node } from 'typescript';

const { forEachChild, isFunctionLike } = ts;

type TS = typeof import('typescript');
export type GlintCore = typeof import('@glint/core');
export type PathUtils = GlintCore['pathUtils'];

export { Range, Diagnostic };

export class GlintService implements Service {
  protected readonly service: GlintLanguageServer;
  readonly transformManager: TransformManager;
  readonly ts: TS;
  readonly pathUtils: PathUtils;

  private tsService: ts.LanguageService;

  constructor(glintCore: GlintCore, glintProjectDir: string) {
    this.pathUtils = glintCore.pathUtils;
    const { languageServer, transformManager, glintConfig } =
      glintCore.analyzeProject(glintProjectDir);

    this.service = languageServer;
    this.transformManager = transformManager;
    this.ts = glintConfig.ts;
    this.tsService = languageServer.service;
  }

  /**
   * Gets the content of the file from its latest in-memory state
   */
  getFileText(fileName: string): string {
    return this.service.getOriginalContents(fileName) ?? '';
  }

  /**
   * Updates the current state of the file with the new content
   */
  setFileText(fileName: string, text: string): void {
    this.service.updateFile(fileName.replace('.ts', '.gts'), text);
  }

  /**
   * Saves the latest state (snapshot) of the file to filesystem
   */
  saveFile(fileName: string): void {
    const snapshot = this.getFileText(fileName);
    this.ts.sys.writeFile(fileName, snapshot);
  }

  /**
   * Gets a SourceFile object from the compiled program
   */
  getSourceFile(fileName: string): ts.SourceFile {
    // Returning AST for file with "greek" symbols (transformed)
    return this.getLanguageService().getProgram()!.getSourceFile(fileName.replace('.gts', '.ts'))!;
  }

  /**
   * Gets the LanguageService
   */
  getLanguageService(): ts.LanguageService {
    return this.tsService;
  }

  getGlintService(): GlintLanguageServer {
    return this.service;
  }

  getDiagnostics(fileName: string): ts.DiagnosticWithLocation[] {
    const diagnostics = this.service
      .getDiagnostics(fileName)
      .map((diagnostic) => this.convertLSPDiagnosticToTs(fileName, diagnostic));

    return [...diagnostics, ...this.getAdditionalDiagnostics(fileName)];
  }

  getAdditionalDiagnostics(fileName: string): DiagnosticWithLocation[] {
    const sourceFile = this.getSourceFile(fileName);
    const diagnostics: DiagnosticWithLocation[] = [];

    const visitEveryNode = (node: Node): Node | undefined => {
      if (isFunctionLike(node) && node.name && !node.type) {
        diagnostics.push({
          file: sourceFile,
          start: node.getStart(),
          length: node.getEnd() - node.getStart(),
          category: ts.DiagnosticCategory.Suggestion,
          code: 7050,
          messageText:
            (isFunctionLike(node) ? `Function` : `Method`) +
            ` '${node.name.getText()}' lacks a return-type annotation.`,
        });

        return undefined;
      }

      return forEachChild(node, visitEveryNode);
    };

    visitEveryNode(sourceFile);

    return diagnostics;
  }

  convertLSPDiagnosticToTs(fileName: string, diagnostic: Diagnostic): ts.DiagnosticWithLocation {
    const sourceFile = this.getSourceFile(fileName);
    const diagnosticCode = diagnostic.code;
    const code = diagnosticCode
      ? typeof diagnosticCode === 'string'
        ? parseInt(diagnosticCode, 10)
        : diagnosticCode
      : 0;

    const start = this.pathUtils.positionToOffset(sourceFile.text, diagnostic.range.start);
    const finish = this.pathUtils.positionToOffset(sourceFile.text, diagnostic.range.end);

    return {
      source: diagnostic.source,
      category: categoryForDiagnostic(this.ts, diagnostic),
      code,
      file: sourceFile,
      start,
      length: finish - start,
      messageText: diagnostic.message,
    };
  }

  convertTsDiagnosticToLSP(diagnostic: ts.DiagnosticWithLocation): Diagnostic {
    const originalRange = this.transformManager.getOriginalRange(
      diagnostic.file.fileName.replace('.ts', '.gts'),
      diagnostic.start,
      diagnostic.start + diagnostic.length
    );

    const text = this.getFileText(diagnostic.file.fileName.replace('.ts', '.gts'));

    return {
      source: diagnostic.source,
      severity: severityForDiagnostic(this.ts, diagnostic),
      code: diagnostic.code,
      message: diagnostic.messageText as string,
      range: {
        start: this.pathUtils.offsetToPosition(text, originalRange.originalStart),
        end: this.pathUtils.offsetToPosition(text, originalRange.originalEnd),
      },
    };
  }

  transformCodeActionToCodeFixAction(codeActions: CodeAction[]): ts.CodeFixAction[] {
    return codeActions.map((action) => {
      const documentChanges = action.edit?.documentChanges;

      let changes: ts.FileTextChanges[] = [];

      if (documentChanges === undefined) {
        changes = [];
      } else {
        changes = (documentChanges as TextDocumentEdit[]).map((change) => {
          // This is disabled because vscode-uri is a commonjs module, which causes TS and Eslint
          // to disagree about how it should be imported (╯°□°)╯︵ ┻━┻
          // eslint-disable-next-line import/no-named-as-default-member
          const filePath = VSCodeURI.URI.parse(change.textDocument.uri).fsPath.replace(/\\/g, '/');

          const fixSourceFile = this.getSourceFile(filePath);

          return {
            fileName: filePath,
            textChanges: change.edits.map((edit) => {
              const start = this.pathUtils.positionToOffset(fixSourceFile.text, edit.range.start);
              const finish = this.pathUtils.positionToOffset(fixSourceFile.text, edit.range.end);
              return {
                newText: edit.newText,
                span: {
                  start,
                  length: finish - start,
                },
              };
            }),
          };
        });
      }

      return {
        fixName: action.title,
        description: action.title,
        changes: changes,
      };
    });
  }
}

function categoryForDiagnostic(ts: TS, diagnostic: Diagnostic): ts.DiagnosticCategory {
  switch (diagnostic.severity) {
    case DiagnosticSeverity.Error:
      return ts.DiagnosticCategory.Error;
    case DiagnosticSeverity.Warning:
      return ts.DiagnosticCategory.Warning;
    case DiagnosticSeverity.Information:
      return ts.DiagnosticCategory.Message;
    case DiagnosticSeverity.Hint:
      return ts.DiagnosticCategory.Suggestion;
    default:
      throw new Error(`found unknown severity code ${diagnostic.severity}`);
  }
}

export function severityForDiagnostic(ts: TS, diagnostic: ts.Diagnostic): DiagnosticSeverity {
  switch (diagnostic.category) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Message:
      return DiagnosticSeverity.Information;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
  }
}
