import { Report } from '@rehearsal/reporter';

/**
 * Format JSON report
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
