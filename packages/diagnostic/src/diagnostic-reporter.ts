import fs from 'fs';
import ts from 'typescript';

export type DiagnosticInfo = {
  file: string;
  code: number;
  message: string;
  start: number;
  length: number;
  nodeKind?: string;
  nodeText?: string;
};

export type DiagnosticReport = {
  version: string;
  diagnostics: DiagnosticInfo[];
};

export default class DiagnosticReporter {
  readonly basePath: string;
  readonly reportFile: string;
  readonly report: DiagnosticReport;

  constructor(reportFile: string, basePath = '') {
    this.reportFile = reportFile;
    this.basePath = basePath;
    this.report = {
      version: ts.version,
      diagnostics: [],
    };
  }

  /**
   * Appends am information about provided diagnostic and related node to the report
   */
  addDiagnostic(diagnostic: ts.DiagnosticWithLocation, node?: ts.Node): void {
    this.report.diagnostics.push({
      file: diagnostic.file.fileName.replace(this.basePath, ''),
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '. '),
      start: diagnostic.start,
      length: diagnostic.length,
      nodeKind: node ? ts.SyntaxKind[node.kind] : undefined,
      nodeText: node?.getText(),
    });
  }

  /**
   * Saves the current report information to the file in JSON format
   */
  save(): void {
    fs.writeFileSync(this.reportFile, JSON.stringify(this.report, null, 2));
  }
}
