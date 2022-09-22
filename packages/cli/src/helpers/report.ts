import { Report, Reporter, ReportFormatter } from '@rehearsal/reporter';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { MapLike } from 'typescript';

export function generateReports(
  reporter: Reporter,
  outputPath: string,
  formats: string[],
  formatters: MapLike<ReportFormatter>
): string[] {
  const generatedReports: string[] = [];

  if (formats.length === 0) {
    return generatedReports;
  }

  mkdirSync(outputPath, { recursive: true });

  const reportBaseName = 'report';

  formats.forEach((format) => {
    if (formatters[format]) {
      const report = resolve(outputPath, `${reportBaseName}.${format}`);
      generatedReports.push(report);
      reporter.print(report, formatters[format]);
    }
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
