import ts from 'typescript';
import winston from 'winston';

import { parse, resolve } from 'path';

import RehearsalService from './rehearsal-service';
import PipeTransform from './interfaces/pipe-transform';

import { addHintComment, getFixForDiagnostic } from './plugins/diagnostics-autofix';

export type MigrateInput = {
  basePath: string;
  configName?: string;
  reportName?: string;
  modifySourceFiles?: boolean;
  pipesBefore?: PipeTransform[];
  pipesAfter?: PipeTransform[];
  logger?: winston.Logger;
};

export type MigrateOutput = {
  basePath: string;
  configFile: string;
  reportFile: string;
  sourceFiles: string[];
  sourceFilesModified: boolean;
};

/**
 * Provides semantic diagnostic information in @ts-ignore comments and in a JSON report
 */
export default async function migrate(input: MigrateInput): Promise<MigrateOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const reportName = input.reportName || '.rehearsal-diagnostics.json';
  const modifySourceFiles = input.modifySourceFiles !== undefined ? input.modifySourceFiles : true;
  const logger = input.logger;
  const pipesBefore = input.pipesBefore || [];
  const pipesAfter = input.pipesAfter || [];

  logger?.info('Migration started.');
  logger?.info(`Base path: ${basePath}`);

  const configFile = ts.findConfigFile(basePath, ts.sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.info(`Config file found: ${configFile}`);

  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
  const { options, fileNames } = ts.parseJsonConfigFileContent(config, ts.sys, basePath);

  const reportFile = resolve(parse(configFile).dir, reportName);

  const service = new RehearsalService(options, fileNames);

  for (const fileName of fileNames) {
    logger?.info(`Processing file: ${fileName}`);

    // Pre-processing
    await runPipes(pipesBefore, fileName, service, logger);

    // Migration
    // TODO: Convert migration part and pipes to "plugins"?..
    let diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);
    let tries = diagnostics.length + 1;

    while (diagnostics.length > 0 && tries-- > 0) {
      const diagnostic = diagnostics.shift()!;

      const fix = getFixForDiagnostic(diagnostic);

      let text = fix.run(diagnostic, service.getLanguageService());

      if (diagnostic.file.getFullText() === text) {
        text = addHintComment(diagnostic, fix);
        logger?.info(` - TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      } else {
        logger?.info(` - TS${diagnostic.code} at ${diagnostic.start}:\t fix applied`);
      }

      service.setFileText(fileName, text);

      // Get updated list of diagnostics
      diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);
    }

    // Post-processing
    await runPipes(pipesAfter, fileName, service, logger);

    // Save file to the filesystem
    service.saveFile(fileName);
  }

  logger?.info(`Migration finished.`);

  // TODO: Save report using configured printers

  logger?.info(`Report saved to ${reportFile}`);

  return {
    basePath,
    configFile,
    reportFile,
    sourceFiles: fileNames,
    sourceFilesModified: modifySourceFiles,
  };
}

async function runPipes(
  pipes: PipeTransform[],
  fileName: string,
  service: RehearsalService,
  logger?: winston.Logger
): Promise<string> {
  let text = service.getFileText(fileName);
  for (const transformer of pipes) {
    text = await transformer({ text, fileName, logger });
    logger?.info(` - pipe applied: ${transformer.name}`);
  }
  service.setFileText(fileName, text);

  return text;
}
