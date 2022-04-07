import ts from 'typescript';
import winston from 'winston';

import { parse, resolve } from 'path';

import RehearsalService from './rehearsal-service';

import DiagnosticAutofixPlugin from './plugins/diagnostics-autofix.plugin';
import EmptyLinesPreservePlugin from './plugins/empty-lines-preserve.plugin';
import EmptyLinesRestorePlugin from './plugins/empty-lines-restore.plugin';
import LintPlugin from './plugins/lint.plugin';
import Reporter from './reporter/reporter';

export type MigrateInput = {
  basePath: string;
  configName?: string;
  reportName?: string;
  reporter?: Reporter;
  logger?: winston.Logger;
};

export type MigrateOutput = {
  basePath: string;
  configFile: string;
  reportFile: string;
  sourceFiles: string[];
};

/**
 * Provides semantic diagnostic information in @ts-ignore comments and in a JSON report
 */
export default async function migrate(input: MigrateInput): Promise<MigrateOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const reportName = input.reportName || '.rehearsal-report.json';
  const reporter = input.reporter;
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
      const plugin = new pluginClass(service, logger, reporter);
      const updatedText = await plugin.run({ fileName });
      service.setFileText(fileName, updatedText);
    }

    // Save file to the filesystem
    service.saveFile(fileName);
  }

  logger?.info(`Migration finished.`);

  const reportFile = resolve(parse(configFile).dir, reportName);
  reporter?.save(reportFile);
  logger?.info(`Report saved to ${reportFile}`);

  return {
    basePath,
    configFile,
    reportFile,
    sourceFiles: fileNames,
  };
}
