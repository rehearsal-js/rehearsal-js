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
import { CliCommand, Formats, MigrationSummary } from '../types';

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

  const fixedErrors: { [key: string]: number } = {};
  let fixedErrorsCounter = 0;

  const totalErrors: { [key: string]: number } = {};
  let totalErrorsCounter = 0;

  report.items.forEach((item) => {
    const fixed = item.fixed ? 1 : 0;
    fixedErrors[item.errorCode] = (fixedErrors[item.errorCode] || 0) + fixed;
    fixedErrorsCounter += fixed;
    totalErrors[item.errorCode] = (totalErrors[item.errorCode] || 0) + 1;
    totalErrorsCounter += 1;
  });

  // Add statistic info to summary
  report.summary = {
    ...report.summary,
    ...{
      timestamp: new Date().toISOString(),
      uniqueErrors: Object.keys(totalErrors).length,
      totalErrors: totalErrorsCounter,
      totalErrorsList: totalErrors,
      fixedErrors: fixedErrorsCounter,
      fixedErrorsList: fixedErrors,
      files: fileNames.length,
      filesList: fileNames,
    },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Reads report and generate migration summary
 */
export function getReportSummary(report: Report): MigrationSummary {
  const fileMap = new Set<string>();
  let errorFixedCount = 0;
  let hintAddedCount = 0;
  report.items.forEach((item) => {
    fileMap.add(item.analysisTarget);
    if (item.fixed) {
      errorFixedCount++;
    }
    if (item.hint) {
      hintAddedCount++;
    }
  });
  return {
    totalErrorCount: report.items.length,
    errorFixedCount,
    hintAddedCount,
  };
}
