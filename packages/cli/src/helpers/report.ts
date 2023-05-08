// eslint-disable-next-line no-restricted-imports
import type { Report } from '@rehearsal/reporter';

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
