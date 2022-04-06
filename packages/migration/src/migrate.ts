import ts from 'typescript';
import winston from 'winston';

import { parse, resolve } from 'path';

import RehearsalService from './rehearsal-service';

import DiagnosticAutofixPlugin from './plugins/diagnostics-autofix.plugin';
import LintPlugin from './plugins/lint.plugin';
import EmptyLinesPreservePlugin from './plugins/empty-lines-preserve.plugin';
import EmptyLinesRestorePlugin from './plugins/empty-lines-restore.plugin';

export type MigrateInput = {
  basePath: string;
  configName?: string;
  reportName?: string;
  modifySourceFiles?: boolean;
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

  const plugins = [
    LintPlugin,
    EmptyLinesPreservePlugin,
    DiagnosticAutofixPlugin,
    EmptyLinesRestorePlugin,
    LintPlugin,
  ];

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

  const service = new RehearsalService(options, fileNames);

  for (const fileName of fileNames) {
    logger?.info(`Processing file: ${fileName}`);

    for (const pluginClass of plugins) {
      const plugin = new pluginClass(service, logger, undefined);
      const updatedText = await plugin.run({ fileName });
      service.setFileText(fileName, updatedText);
    }

    // Save file to the filesystem
    service.saveFile(fileName);
  }

  logger?.info(`Migration finished.`);

  // TODO: Save report using configured printers
  const reportFile = resolve(parse(configFile).dir, reportName);
  logger?.info(`Report saved to ${reportFile}`);

  return {
    basePath,
    configFile,
    reportFile,
    sourceFiles: fileNames,
    sourceFilesModified: modifySourceFiles,
  };
}
