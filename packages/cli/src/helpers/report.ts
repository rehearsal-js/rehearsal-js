// eslint-disable-next-line no-restricted-imports
import type { ReportItem } from '@rehearsal/reporter';

/**
 * Reads report and generate migration summary
 */
export function getReportSummary(reportItems: ReportItem[], fixedItemCount: number): string {
  const fileMap = new Set<string>();
  let tsErrorCount = 0;
  let lintErrorCount = 0;

  reportItems.forEach((item) => {
    fileMap.add(item.analysisTarget);
    if (item.hintAdded) {
      tsErrorCount++;
    } else {
      lintErrorCount++;
    }
  });
  const totalUnfixedCount = reportItems.length;
  const totalErrorCount = totalUnfixedCount + fixedItemCount;

  return `Types Inferred\n\n
  ${totalErrorCount} errors caught by rehearsal\n
  ${fixedItemCount} have been fixed by rehearsal\n
  ${totalUnfixedCount} errors need to be fixed manually\n
    -- ${tsErrorCount} ts errors, marked by @ts-expect-error @rehearsal TODO\n
    -- ${lintErrorCount} eslint errors, with details in the report\n`;
}
