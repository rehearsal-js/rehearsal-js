import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DiagnosticCategory, flattenDiagnosticMessageText, SyntaxKind } from 'typescript';
import {
  type Report,
  type ReportFormatter,
  type ReportItem,
  type Location,
  type LintErrorLike,
  type Run,
  ReportItemType,
} from './types';
import { normalizeFilePath } from './normalize-paths';
import type { DiagnosticWithLocation, Node } from 'typescript';
import type { Logger } from 'winston';

type ReporterMeta = {
  projectName: string;
  basePath: string;
  commandName: string;
  tsVersion: string;
  previousFixedCount?: number;
};

/**
 * Representation of diagnostic and migration report.
 */
export class Reporter {
  readonly basePath: string;

  public report: Report;
  private logger?: Logger;
  public currentRun: Run;
  public lastRun: Run | undefined;
  private uniqueFiles: string[];

  constructor(meta: ReporterMeta, logger?: Logger) {
    const { projectName, basePath, commandName, tsVersion, previousFixedCount } = meta;

    this.basePath = basePath;
    this.logger = logger?.child({ service: 'rehearsal-reporter' });
    this.report = {
      summary: [],
      fixedItemCount: previousFixedCount || 0,
      items: [],
    };
    this.uniqueFiles = [];
    this.currentRun = {
      runSummary: {
        projectName,
        tsVersion,
        timestamp: '',
        basePath: '',
        entrypoint: '',
        commandName,
      },
      fixedItemCount: 0,
      items: [],
    };
  }

  public getFileNames(): string[] {
    return this.uniqueFiles;
  }

  getItemsByAnalysisTarget(fileName: string): ReportItem[] {
    return this.report.items.filter((item) => item.analysisTarget === fileName);
  }

  /**
   * Appends an element to the summary
   */
  addToRunSummary(key: string, value: unknown): void {
    this.currentRun.runSummary[key] = value;
  }

  /**
   * Appends am information about provided diagnostic and related node to the report
   */
  addTSItemToRun(
    diagnostic: DiagnosticWithLocation,
    node?: Node,
    triggeringLocation?: Location,
    hint = '',
    helpUrl = '',
    hintAdded = true
  ): void {
    this.currentRun.items.push({
      analysisTarget: normalizeFilePath(this.basePath, diagnostic.file.fileName),
      type: ReportItemType.ts,
      ruleId: `TS${diagnostic.code}`,
      category: DiagnosticCategory[diagnostic.category],
      message: flattenDiagnosticMessageText(diagnostic.messageText, '. '),
      hint: hint,
      hintAdded,
      nodeKind: node ? SyntaxKind[node.kind] : undefined,
      nodeText: node?.getText(),
      helpUrl,
      nodeLocation: triggeringLocation || undefined,
    });
  }

  addLintItemToRun(fileName: string, lintError: LintErrorLike): void {
    this.currentRun.items.push({
      analysisTarget: normalizeFilePath(this.basePath, fileName),
      type: ReportItemType.lint,
      ruleId: lintError.ruleId || '',
      category: 'Error',
      message: lintError.message,
      hint: lintError.message,
      hintAdded: false,
      nodeKind: lintError.nodeType,
      nodeText: '',
      helpUrl: '',
      nodeLocation: {
        startLine: lintError.line,
        startColumn: lintError.column,
        endLine: lintError.line,
        endColumn: lintError.endColumn ?? 0,
      },
    });
  }

  incrementRunFixedItemCount(): void {
    this.currentRun.fixedItemCount++;
  }

  saveCurrentRunToReport(runBasePath: string, runEntrypoint: string, timestamp?: string): void {
    timestamp =
      timestamp ??
      new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hourCycle: 'h24',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    this.currentRun.runSummary.timestamp = timestamp;
    this.currentRun.runSummary.basePath = runBasePath;
    this.currentRun.runSummary.entrypoint = runEntrypoint || '';
    this.report.summary = [...this.report.summary, { ...this.currentRun.runSummary }];

    this.report.fixedItemCount += this.currentRun.fixedItemCount;

    const { uniqueFiles, items } = this.mergeItems();
    this.report.items = items;
    this.uniqueFiles = uniqueFiles;

    this.lastRun = { ...this.currentRun };

    this.resetCurrentRun();
  }

  private mergeItems(): { uniqueFiles: string[]; items: ReportItem[] } {
    const fileSet = new Set<string>();
    for (const item of this.currentRun.items) {
      if (!fileSet.has(item.analysisTarget)) {
        fileSet.add(item.analysisTarget);
      }
    }
    const items = [...this.currentRun.items];
    for (const item of this.report.items) {
      if (!fileSet.has(item.analysisTarget)) {
        fileSet.add(item.analysisTarget);
        items.push(item);
      }
    }
    const uniqueFiles = Array.from(fileSet);
    return { uniqueFiles, items };
  }

  /**
   * Prints the current report using provided formatter (ex. json, pull-request etc.)
   */
  printReport(file: string, formatter: ReportFormatter): string {
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
  saveReport(file: string): void {
    this.printReport(file, (report: Report): string => JSON.stringify(report, null, 2));
    this.logger?.info(`Report saved to: ${file}.`);
  }

  /**
   * Loads the report exported by function 'save' from the file
   */
  loadRun(file: string): Reporter {
    if (!existsSync(file)) {
      this.logger?.error(`Report file not found: ${file}.`);
    }

    this.logger?.info(`Report file found: ${file}.`);

    const content = readFileSync(file, 'utf-8');
    const run: Run = JSON.parse(content);
    this.currentRun = run;

    if (!Reporter.isReport(this.report)) {
      this.logger?.error(`Report not loaded: wrong file format`);
      return this;
    }

    this.logger?.info(`Report loaded from file.`);

    return this;
  }

  private resetCurrentRun(): void {
    this.currentRun.runSummary.timestamp = '';
    this.currentRun.runSummary.basePath = '';
    this.currentRun.runSummary.entrypoint = '';
    this.currentRun.fixedItemCount = 0;
    this.currentRun.items = [];
  }

  private static isReport(report: Report): report is Report {
    return report && report.summary !== undefined && report.items !== undefined;
  }
}
