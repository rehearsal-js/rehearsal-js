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
      reportPath = resolve(outputPath, `${reportBaseName}.json`);
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
  let hintAddedCount = 0;
  report.items.forEach((item) => {
    fileMap.add(item.analysisTarget);
    if (item.hintAdded) {
      hintAddedCount++;
    }
  });
  const totalErrorCount = report.items.length;
  return `Migration Complete. ${migratedFileCount} JS ${
    migratedFileCount === 1 ? 'file' : 'files'
  } has been converted to TS. There are ${totalErrorCount} errors caught by rehearsal.\n
  ${hintAddedCount} have been updated with @ts-expect-error @rehearsal TODO which need further manual check.`;
}
