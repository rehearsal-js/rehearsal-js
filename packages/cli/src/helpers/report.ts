import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
// eslint-disable-next-line no-restricted-imports -- these functions are all lazy loaded in consumers
import {
  jsonFormatter,
  Report,
  Reporter,
  sonarqubeFormatter,
  mdFormatter,
  sarifFormatter,
  ReportFormatter,
  ReportItem,
} from '@rehearsal/reporter';

import type { CliCommand, Formats } from '../types.js';

type ReportLike = {
  items: ReportItem[];
  fixedItemCount: number;
};

export function generateReports(
  command: CliCommand,
  reporter: Reporter,
  outputPath: string,
  formats: Formats[]
): string[] {
  const generatedReports: string[] = [];

  if (formats.length === 0) {
    return generatedReports;
  }
  //We make sure json report will be printed out whether user specifies it or not.
  //json report preserves the detailed raw data.
  formats = Array.from(new Set([...formats, 'json']));

  mkdirSync(outputPath, { recursive: true });

  const reportBaseName = `${command}-report`;

  formats.forEach((format) => {
    let reportPath: string;
    let formatter: ReportFormatter;

    if (format === 'json') {
      reportPath = resolve(outputPath, `${reportBaseName}.json`);
      formatter = jsonFormatter;
    } else if (format === 'sonarqube') {
      reportPath = resolve(outputPath, `${reportBaseName}.sonarqube.json`);
      formatter = sonarqubeFormatter;
    } else if (format === 'md') {
      reportPath = resolve(outputPath, `${reportBaseName}.md`);
      formatter = mdFormatter;
    } else {
      reportPath = resolve(outputPath, `${reportBaseName}.sarif`);
      formatter = sarifFormatter;
    }

    reporter.printReport(reportPath, formatter);
    generatedReports.push(reportPath);
  });

  return generatedReports;
}

/**
 * Reads report and generate migration summary
 */
export function getReportSummary(report: Report, migratedFileCount: number): string {
  const fileMap = new Set<string>();
  let tsErrorCount = 0;
  let lintErrorCount = 0;

  report.items.forEach((item) => {
    fileMap.add(item.analysisTarget);
    if (item.hintAdded) {
      tsErrorCount++;
    } else {
      lintErrorCount++;
    }
  });
  const totalUnfixedCount = report.items.length;
  const totalErrorCount = totalUnfixedCount + report.fixedItemCount;

  return `Migration Complete\n\n
  ${migratedFileCount} JS ${migratedFileCount === 1 ? 'file' : 'files'} converted to TS\n
  ${totalErrorCount} errors caught by rehearsal\n
  ${report.fixedItemCount} have been fixed by rehearsal\n
  ${totalUnfixedCount} errors need to be fixed manually\n
    -- ${tsErrorCount} ts errors, marked by @ts-expect-error @rehearsal TODO\n
    -- ${lintErrorCount} eslint errors, with details in the report\n`;
}

export function getRegenSummary<T extends ReportLike>(
  report: T,
  scannedFileCount: number,
  isSequential = false
): string {
  const fileMap = new Set<string>();
  let tsErrorCount = 0;
  let lintErrorCount = 0;

  report.items.forEach((item) => {
    fileMap.add(item.analysisTarget);
    if (item.hintAdded) {
      tsErrorCount++;
    } else {
      lintErrorCount++;
    }
  });
  const totalErrorCount = report.items.length;

  let message;
  if (!isSequential) {
    message = `Migration Report Generated\n\n
  ${scannedFileCount} ts files have been scanned\n
  ${totalErrorCount} errors caught by rehearsal\n
    -- ${tsErrorCount} ts errors, marked by @ts-expect-error @rehearsal TODO\n
    -- ${lintErrorCount} eslint errors, with details in the report\n`;
  } else {
    message = `Rescanning previously migrated files based on existing report:\n
  ${scannedFileCount} ts files have been scanned\n
  ${totalErrorCount} errors caught by rehearsal, and will be merged into the migration report\n
    `;
  }

  return message;
}
