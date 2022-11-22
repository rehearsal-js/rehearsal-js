import { Report } from '../types';

export function mdFormatter(report: Report): string {
  const fileNames = [
    ...new Set(report.results.map((result) => result.analysisTarget?.uri).filter(onlyFileNames)),
  ];

  let text = ``;

  text += `### Summary:\n`;
  text += `Typescript Version: ${report.tool.properties?.tsVersion}\n`;
  text += `Files Tested: ${fileNames.length}\n`;
  text += `\n`;
  text += `### Results:\n`;

  for (const fileName of fileNames) {
    const results = report.results.filter((result) => result.analysisTarget === fileName);
    const relativeFileName = fileName.replace(report.tool.properties?.basePath, '');

    text += `\n`;
    text += `#### File: ${relativeFileName}, issues: ${results.length}:\n`;

    for (const result of results) {
      text += `\n`;
      text += `**${result.level} ${result.ruleId}**: ${
        result.properties?.fixed ? 'FIXED' : 'NEED TO BE FIXED MANUALLY'
      }\n`;
      // text += `${result.hint}\n`;
      // text += `Code: \`${result.nodeText}\`\n`;
    }
  }

  return text;
}

function onlyFileNames(uri: string | undefined): uri is string {
  return !!uri;
}
