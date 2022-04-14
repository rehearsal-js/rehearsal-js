import { Report } from '@rehearsal/reporter';

/**
 * Format JSON report
 */
export function reportFormatter(report: Report): string {
  const fileNames = [
    ...new Set(report.items.map((item) => item.file.replace(report.summary.basePath, ''))),
  ];
  const uniqueErrors = [...new Set(report.items.map((item) => item.code))];
  const autofixedErrors = [
    ...new Set(report.items.map((item) => (item.fixed ? item.code : undefined)).filter(Boolean)),
  ];

  // Add statistic info to summary
  report.summary = {
    ...report.summary,
    ...{
      timestamp: new Date().toISOString(),
      cumulativeErrors: report.items.length,
      uniqueErrors: uniqueErrors.length,
      uniqueErrorsList: uniqueErrors,
      autofixedErrors: autofixedErrors.length,
      autofixedErrorsList: autofixedErrors,
      files: fileNames.length,
      filesList: fileNames,
    },
  };

  return JSON.stringify(report, null, 2);
}
