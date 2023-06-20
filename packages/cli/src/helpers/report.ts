import { ReportItemType } from '@rehearsal/reporter';
// eslint-disable-next-line no-restricted-imports
import type { ReportItem } from '@rehearsal/reporter';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const GlintReportItemType = ReportItemType.glint;

/**
 * Reads report and generate migration summary
 */
export function getReportSummary(reportItems: ReportItem[], fixedItemCount: number): string {
  const fileMap = new Set<string>();
  let tsErrorCount = 0;
  let glintErrorCount = 0;
  let lintErrorCount = 0;

  const hasGlintErrors = reportItems.find((item) => item.type === GlintReportItemType)
    ? true
    : false;

  reportItems.forEach((item) => {
    fileMap.add(item.analysisTarget);
    if (item.hintAdded) {
      if (item.type == GlintReportItemType) {
        glintErrorCount++;
      } else {
        tsErrorCount++;
      }
    } else {
      lintErrorCount++;
    }
  });
  const totalUnfixedCount = reportItems.length;
  const totalErrorCount = totalUnfixedCount + fixedItemCount;

  let summary = `Types Inferred\n\n
  ${totalErrorCount} errors caught by rehearsal\n
  ${fixedItemCount} have been fixed by rehearsal\n
  ${totalUnfixedCount} errors need to be fixed manually\n
    -- ${tsErrorCount} ts errors, marked by @ts-expect-error @rehearsal TODO\n`;

  if (hasGlintErrors) {
    summary += `    -- ${glintErrorCount} glint errors, with details in the report\n`;
  }

  summary += `    -- ${lintErrorCount} eslint errors, with details in the report\n`;

  return summary;
}
