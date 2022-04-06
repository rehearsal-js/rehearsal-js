import { Report } from '../types';

export default function pullRequestMd(report: Report): string {
  const fileNames = [...new Set(report.items.map((item) => item.file))];

  let text = ``;

  text += `### Summary:\n`;
  text += `Typescript Version: ${report.summary.tsVersion}\n`;
  text += `Files Tested: ${fileNames.length}\n`;
  text += `\n`;
  text += `### Results:\n`;

  for (const fileName of fileNames) {
    const items = report.items.filter((item) => item.file === fileName);
    const relativeFileName = fileName.replace(report.summary.basePath, '');

    text += `\n`;
    text += `#### File: ${relativeFileName}, issues: ${items.length}:\n`;

    for (const item of items) {
      text += `\n`;
      text += `**${item.category} TS${item.code}**: ${
        item.fixed ? 'FIXED' : 'NEED TO BE FIXED MANUALLY'
      }\n`;
      text += `${item.hint}\n`;
      text += `Code: \`${item.nodeText}\`\n`;
    }
  }

  return text;
}
