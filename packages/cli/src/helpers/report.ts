// eslint-disable-next-line no-restricted-imports
import type { Report, ReportItem } from '@rehearsal/reporter';

type ReportLike = {
  items: ReportItem[];
  fixedItemCount: number;
};

/**
 * Reads report and generate migration summary
 */
export function getReportSummary(report: Report): string {
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

  return `Types Inferred\n\n
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
