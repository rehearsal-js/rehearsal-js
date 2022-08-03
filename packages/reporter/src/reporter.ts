import fs from 'fs';
import ts from 'typescript';
import winston from 'winston';

import { type Report, type ReportItem, type FixResult } from './types';

/**
 * Representation of diagnostic and migration report.
 */
export class Reporter {
  readonly basePath: string;

  private report: Report;
  private logger?: winston.Logger;

  constructor(projectName = '', basePath = '', logger?: winston.Logger) {
    this.basePath = basePath;
    this.logger = logger?.child({ service: 'rehearsal-reporter' });
    this.report = {
      summary: {
        projectName: projectName,
        tsVersion: ts.version,
        timestamp: Date.now().toString(),
        basePath: basePath,
      },
      items: [],
    };
  }

  getFileNames(): string[] {
    return [...new Set(this.report.items.map((item) => item.analysisTarget))];
  }

  getItemsByAnalysisTarget(fileName: string): ReportItem[] {
    return this.report.items.filter((item) => item.analysisTarget === fileName);
  }

  /**
   * Appends an element to the summary
   */
  addSummary(key: string, value: unknown): void {
    this.report.summary[key] = value;
  }

  /**
   * Appends am information about provided diagnostic and related node to the report
   */
  addItem(
    diagnostic: ts.DiagnosticWithLocation,
    fixResult: FixResult,
    node?: ts.Node,
    hint = ''
  ): void {
    this.report.items.push({
      analysisTarget: diagnostic.file.fileName,
      fixedFiles: fixResult.fixedFiles,
      commentedFiles: fixResult.commentedFiles,
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '. '),
      hint: hint,
      fixed: fixResult.fixedFiles.length > 0,
      nodeKind: node ? ts.SyntaxKind[node.kind] : undefined,
      nodeText: node?.getText(),
      nodeLocation: {
        start: diagnostic.start,
        length: diagnostic.length,
        ...diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start),
      },
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
   * Saves the current report information to the file in simple JSON format
   * to be able to load it later with 'load' function
   */
  save(file: string): void {
    const formatter = (report: Report): string => JSON.stringify(report, null, 2);
    this.print(file, formatter);
    this.logger?.info(`Report saved to: ${file}.`);
  }

  /**
   * Loads the report exported by function 'save' from the file
   */
  load(file: string): Reporter {
    if (!fs.existsSync(file)) {
      this.logger?.error(`Report file not found: ${file}.`);
    }

    this.logger?.info(`Report file found: ${file}.`);
    const content = fs.readFileSync(file, 'utf-8');
    const report: Report = JSON.parse(content);

    if (!Reporter.isReport(report)) {
      this.logger?.error(`Report not loaded: wrong file format`);
      return this;
    }

    this.report = report as Report;
    this.logger?.info(`Report loaded from file.`);

    return this;
  }

  private static isReport(report: Report): report is Report {
    return report && report.summary !== undefined && report.items !== undefined;
  }
}
