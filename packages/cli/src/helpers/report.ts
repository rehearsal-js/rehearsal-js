import { mkdirSync } from 'fs';
import { resolve } from 'path';
import {
  jsonFormatter,
  Report,
  Reporter,
  sonarqubeFormatter,
  mdFormatter,
  sarifFormatter,
  ReportFormatter,
} from '@rehearsal/reporter';

import type { CliCommand, Formats } from '../types';

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

    reporter.print(reportPath, formatter);
    generatedReports.push(reportPath);
  });

  return generatedReports;
}

/**
 * Upgrade command result JSON report formatter
 */
export function reportFormatter(report: Report): string {
  const fileNames = [
    ...new Set(
      report.items.map((item) => item.analysisTarget.replace(report.summary.basePath, ''))
    ),
  ];

  const totalErrors: { [key: string]: number } = {};

  // Add statistic info to summary
  report.summary = {
    ...report.summary,
    ...{
      timestamp: new Date().toISOString(),
      uniqueErrors: Object.keys(totalErrors).length,
      totalErrors: totalErrors.length,
      totalErrorsList: totalErrors,
      files: fileNames.length,
      filesList: fileNames,
    },
  };

  return JSON.stringify(report, null, 2);
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

export function getRegenSummary(report: Report, scannedFileCount: number): string {
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

  return `Migration Report Generated\n\n
  ${scannedFileCount} ts files have been scanned\n
  ${totalErrorCount} errors caught by rehearsal\n
    -- ${tsErrorCount} ts errors, marked by @ts-expect-error @rehearsal TODO\n
    -- ${lintErrorCount} eslint errors, with details in the report\n`;
}
