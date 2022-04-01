import fs from 'fs';
import ts from 'typescript';
import winston from 'winston';
import json from './formatters/json';

export type ReportDiagnosticInfo = {
  file: string;
  code: number;
  message: string;
  start: number;
  length: number;
  nodeKind?: string;
  nodeText?: string;
};

export type Report = {
  version: string;
  diagnostics: ReportDiagnosticInfo[];
};

/**
 * Representation of diagnostic and migration report.
 */
export default class Reporter {
  readonly basePath: string;

  private report: Report;
  private logger?: winston.Logger;

  constructor(basePath = '', logger?: winston.Logger) {
    this.basePath = basePath;
    this.logger = logger?.child({ service: 'rehearsal-reporter' });
    this.report = {
      version: ts.version,
      diagnostics: [],
    };
  }

  getFileNames(): string[] {
    const fileNames: string[] = [];
    for (const diagnostic of this.report.diagnostics) {
      if (!fileNames.includes(diagnostic.file)) {
        fileNames.push(diagnostic.file);
      }
    }

    return fileNames;
  }

  getDiagnostics(fileName: string): ReportDiagnosticInfo[] {
    return this.report.diagnostics.filter((diagnostic) => diagnostic.file === fileName);
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
   * Prints the current report using provided formatter (ex. json, pull-request etc.)
   */
  print(file: string, formatter: (report: Report) => string): string {
    const report = formatter(this.report);

    if (file) {
      fs.writeFileSync(file, report);
    }

    return report;
  }

  /**
   * Saves the current report information to the file in JSON format
   */
  save(file: string): void {
    this.print(file, json);
    this.logger?.info(`Report saved to: ${file}.`);
  }

  load(file: string): Reporter {
    if (!fs.existsSync(file)) {
      this.logger?.error(`Report file not found: ${file}.`);
    }

    this.logger?.info(`Report file found: ${file}.`);
    const content = fs.readFileSync(file, 'utf-8');
    const report = JSON.parse(content);

    if (!Reporter.isReport(report)) {
      this.logger?.error(`Report not loaded: wrong file format`);
    }

    this.report = report;
    this.logger?.info(`Report loaded from file.`);

    return this;
  }

  private static isReport(report: any): report is Report {
    return report && report.version !== undefined && report.diagnostics !== undefined;
  }
}
