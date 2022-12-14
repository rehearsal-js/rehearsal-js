import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DiagnosticCategory, flattenDiagnosticMessageText, SyntaxKind } from 'typescript';
import {
  type ProcessedFile,
  type Report,
  type ReportFormatter,
  type ReportItem,
  type Location,
} from './types';
import type { DiagnosticWithLocation, Node } from 'typescript';
import type { Logger } from 'winston';

type ReporterMeta = {
  projectName: string;
  basePath: string;
  commandName: string;
  tsVersion: string;
};

/**
 * Representation of diagnostic and migration report.
 */
export class Reporter {
  readonly basePath: string;

  public report: Report;
  private logger?: Logger;

  constructor(meta: ReporterMeta, logger?: Logger) {
    const { projectName, basePath, commandName, tsVersion } = meta;

    this.basePath = basePath;
    this.logger = logger?.child({ service: 'rehearsal-reporter' });

    this.report = {
      summary: {
        projectName: projectName,
        tsVersion: tsVersion,
        timestamp: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hourCycle: 'h24',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        basePath: basePath,
        commandName: commandName,
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
    diagnostic: DiagnosticWithLocation,
    files: { [fileName: string]: ProcessedFile },
    fixed: boolean,
    node?: Node,
    triggeringLocation?: Location,
    hint = '',
    helpUrl = ''
  ): void {
    this.report.items.push({
      analysisTarget: diagnostic.file.fileName,
      files,
      errorCode: diagnostic.code,
      category: DiagnosticCategory[diagnostic.category],
      message: flattenDiagnosticMessageText(diagnostic.messageText, '. '),
      hint: hint,
      fixed,
      nodeKind: node ? SyntaxKind[node.kind] : undefined,
      nodeText: node?.getText(),
      helpUrl,
      //Original node that triggers the error; may not be the node where the codefix happens
      //Location in type ProcessedFile is where the codefix happens or the message is added
      //The two locations in most cases will be the same, but can be different
      nodeLocation: triggeringLocation || undefined,
    });
  }

  /**
   * Prints the current report using provided formatter (ex. json, pull-request etc.)
   */
  print(file: string, formatter: ReportFormatter): string {
    const report = formatter(this.report);

    if (file) {
      writeFileSync(file, report);
    }

    return report;
  }

  /**
   * Saves the current report information to the file in simple JSON format
   * to be able to load it later with 'load' function
   */
  save(file: string): void {
    this.print(file, (report: Report): string => JSON.stringify(report, null, 2));
    this.logger?.info(`Report saved to: ${file}.`);
  }

  /**
   * Loads the report exported by function 'save' from the file
   */
  load(file: string): Reporter {
    if (!existsSync(file)) {
      this.logger?.error(`Report file not found: ${file}.`);
    }

    this.logger?.info(`Report file found: ${file}.`);
    const content = readFileSync(file, 'utf-8');
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
