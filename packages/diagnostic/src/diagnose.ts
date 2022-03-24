import fs from 'fs';
import ts from 'typescript';
import winston from 'winston';

import { parse, resolve } from 'path';

import DiagnosticReporter from './diagnostic-reporter';
import DiagnosticService from './diagnostic-service';

import { lint } from './helpers/lint';
import { preserveEmptyLines, restoreEmptyLines } from './helpers/empty-lines';

export type DiagnoseInput = {
  basePath: string;
  configName?: string;
  reportName?: string;
  modifySourceFiles?: boolean;
  logger?: winston.Logger;
};

export type DiagnoseOutput = {
  basePath: string;
  configFile: string;
  reportFile: string;
  sourceFiles: string[];
  sourceFilesModified: boolean;
};

/**
 * Provides semantic diagnostic information in @ts-ignore comments and in a JSON report
 */
export default async function diagnose(input: DiagnoseInput): Promise<DiagnoseOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const reportName = input.reportName || '.rehearsal-diagnostics.json';
  const modifySourceFiles = input.modifySourceFiles !== undefined ? input.modifySourceFiles : true;
  const logger = input.logger;

  logger?.info('Diagnose started.');
  logger?.info(`Base path: ${basePath}`);

  const configFile = ts.findConfigFile(basePath, ts.sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.info(`Config file found: ${configFile}`);

  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
  const { fileNames, options } = ts.parseJsonConfigFileContent(config, ts.sys, basePath);

  const reportFile = resolve(parse(configFile).dir, reportName);

  const service = new DiagnosticService(fileNames, options);
  const reporter = new DiagnosticReporter(reportFile, basePath);

  // Prepare source files for compilation
  if (modifySourceFiles) {
    logger?.info(`Prepare`);
    for (const fileName of fileNames) {
      logger?.info(`- ${fileName}`);

      let text = fs.readFileSync(fileName).toString();

      // Format the code and replace empty lines with placeholders
      text = await lint(text, fileName, logger);
      text = await preserveEmptyLines(text);

      fs.writeFileSync(fileName, text);
    }
  }

  // Add diagnostic comments and restore files formatting
  logger?.info(`Diagnose`);
  for (const fileName of fileNames) {
    logger?.info(`- ${fileName}`);
    for (const diagnostic of service.getSemanticDiagnosticsWithLocation(fileName)) {
      const node = findAffectedNode(diagnostic);

      if (node !== undefined) {
        addDiagnosticComment(node, diagnostic);
        reporter.addDiagnostic(diagnostic, node);
      }
    }
  }

  if (modifySourceFiles) {
    logger?.info(`Finalize`);
    for (const fileName of fileNames) {
      logger?.info(`- ${fileName}`);
      let text = fs.readFileSync(fileName).toString();

      // Create an updated source code
      text = service.printSourceFile(service.getSourceFile(fileName));

      // Restore empty lines and reformat the code again
      text = await restoreEmptyLines(text);
      text = await fixReactTemplateComment(text, fileName);
      text = await lint(text, fileName, logger);

      fs.writeFileSync(fileName, text);
    }
  }

  reporter.save();
  logger?.info(`Report saved: ${reporter.reportFile}`);

  return {
    basePath,
    configFile,
    reportFile,
    sourceFiles: fileNames,
    sourceFilesModified: modifySourceFiles,
  };
}

/**
 * Finds a node related to diagnostic issue
 */
function findAffectedNode(diagnostic: ts.DiagnosticWithLocation): ts.Node | undefined {
  const isAffectedNode = (node: ts.Node, diagnostic: ts.DiagnosticWithLocation): boolean =>
    node.getStart() === diagnostic.start && node.getEnd() === diagnostic.start + diagnostic.length;

  const visitor = (node: ts.Node): ts.Node | undefined =>
    isAffectedNode(node, diagnostic) ? node : ts.forEachChild(node, visitor);

  return visitor(diagnostic.file);
}

/**
 * Finds the first node in the line, or the first Statement node to add diagnostic comment
 */
function findNodeToComment(node: ts.Node, sourceFile: ts.SourceFile): ts.Node {
  const isRightNode = (node: ts.Node): boolean => {
    if (node.parent.kind === ts.SyntaxKind.SourceFile) {
      return true;
    }

    const currentPosition = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
    const parentPosition = ts.getLineAndCharacterOfPosition(sourceFile, node.parent.getStart());

    return currentPosition.line > parentPosition.line;
  };

  const visit = (node: ts.Node): ts.Node => (isRightNode(node) ? node : visit(node.parent));

  return visit(node);
}

/**
 * Adds a comment with useful diagnostic information on a line before affected node
 */
function addDiagnosticComment(node: ts.Node, diagnostic: ts.DiagnosticWithLocation): void {
  const info = {
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '. '),
    start: diagnostic.start,
    length: diagnostic.length,
    nodeKind: node.kind.toString(),
    nodeText: node.getText(),
  };

  const comment = ` @ts-ignore @rehearsal(${JSON.stringify(info)}) `;

  const nodeToComment = findNodeToComment(node, diagnostic.file);

  ts.addSyntheticLeadingComment(nodeToComment, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);
}

/**
 * Wraps default compiler added comment with `{` `}`
 */
async function fixReactTemplateComment(text: string, fileName: string): Promise<string> {
  return fileName.includes('.tsx')
    ? text.replace(/^\s*\/\*/gm, '{/*').replace(/\*\/\s*$/gm, '*/}')
    : text;
}
