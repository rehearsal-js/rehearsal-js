import type { Report, FormatterBase } from '../types.js';

export class MarkdownFormatter implements FormatterBase {
  static extension = '.md';
  static getReport(report: Report): string {
    const fileNames = [...new Set(report.items.map((item) => item.analysisTarget))];

    let text = ``;

    text += `### Summary:\n`;

    for (const block of report.summary) {
      text += `Project Name: ${block.projectName}\n`;
      text += `Typescript Version: ${block.tsVersion}\n`;
      text += `Report path: ${block.reportOutDir}\n`;
      text += `timestamp: ${block.timestamp}\n`;
      text += `\n`;
    }

    text += `### Results:\n`;

    for (const fileName of fileNames) {
      const items = report.items.filter((item) => item.analysisTarget === fileName);

      text += `\n`;
      text += `#### File: ${fileName}, issues: ${items.length}:\n`;

      for (const item of items) {
        text += `\n`;
        text += `**${item.category} ${item.ruleId}**: 'REVIEW REQUIRED'\n`;
        text += `${item.hint}\n`;
        text += `Code: \`${item.nodeText}\`\n`;
      }
    }

    return text;
  }
}
