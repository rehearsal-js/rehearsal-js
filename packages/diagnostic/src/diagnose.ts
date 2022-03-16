import ts from 'typescript';

import { ESLint } from 'eslint';
import DiagnosticService from './diagnostic-service';

export default async function diagnose(
  basePath: string,
  configName = 'tsconfig.json'
): Promise<boolean> {
  try {
    const configFile = ts.findConfigFile(basePath, ts.sys.fileExists, configName);

    if (!configFile) {
      console.log(`Config file ${configName} not found in ${basePath}`);
      return false;
    }

    const service = new DiagnosticService(basePath, configFile);

    for (let sourceFile of service.getRootSourceFiles()) {
      let diagnostics: ts.Diagnostic[] = [];

      await lint(sourceFile);
      sourceFile = service.updateSourceFile(sourceFile);

      diagnostics = service.getSemanticDiagnostics(sourceFile);
      for (const diagnostic of diagnostics) {
        // TODO: Add diagnostic comment here
        console.log(
          formatDiagnosticMessage(diagnostic),
          ts.getLineAndCharacterOfPosition(sourceFile, diagnostic.start!)
        );
      }

      await lint(sourceFile);
      service.updateSourceFile(sourceFile);
    }
  } catch (e) {
    throw Error('Diagnose failed');
  }

  return true;
}

function formatDiagnosticMessage(diagnostic: ts.Diagnostic): string {
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  };

  return ts.formatDiagnostic(diagnostic, formatHost);
}

async function lint(sourceFile: ts.SourceFile): Promise<string> {
  const eslint = new ESLint({
    fix: true,
    useEslintrc: true,
  });

  try {
    const [report] = await eslint.lintText(sourceFile.text);

    if (!report || !report.output || report.output === sourceFile.text) {
      return sourceFile.text;
    }

    sourceFile.text = report.output;

    return report.output as string;
  } catch (e) {
    console.error('ESLint error');
  }

  return sourceFile.text;
}
