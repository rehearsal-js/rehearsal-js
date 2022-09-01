import ts from 'typescript';
import winston from 'winston';
import { dirname, resolve } from 'path';

import { Reporter } from '@rehearsal/reporter';
import { RehearsalService } from '@rehearsal/service';
import {
  EmptyLinesPreservePlugin,
  EmptyLinesRestorePlugin,
  LintPlugin,
  ReRehearsePlugin,
  DiagnosticAutofixPlugin,
} from '@rehearsal/plugins';

export type UpgradeInput = {
  basePath: string;
  configName?: string;
  reporter?: Reporter;
  logger?: winston.Logger;
};

export type UpgradeOutput = {
  basePath: string;
  configFile: string;
  sourceFiles: string[];
};

/**
 * Provides semantic diagnostic information in @ts-ignore comments and in a JSON report
 */
export async function upgrade(input: UpgradeInput): Promise<UpgradeOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;

  const plugins = [
    ReRehearsePlugin,
    LintPlugin,
    EmptyLinesPreservePlugin,
    DiagnosticAutofixPlugin,
    EmptyLinesRestorePlugin,
    LintPlugin,
  ];

  logger?.info('Upgrade started.');
  logger?.info(`Base path: ${basePath}`);

  const configFile = ts.findConfigFile(basePath, ts.sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.info(`Config file found: ${configFile}`);

  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
  const { options, fileNames } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(configFile),
    {},
    configFile
  );

  const service = new RehearsalService(options, fileNames);

  for (const fileName of fileNames) {
    logger?.info(`Processing file: ${fileName}`);

    let allChangedFiles: Set<string> = new Set();

    for (const pluginClass of plugins) {
      const plugin = new pluginClass(service, logger, reporter);
      const changedFiles = await plugin.run({ fileName });
      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);
    }

    // Save file to the filesystem
    allChangedFiles.forEach((file) => service.saveFile(file));
  }

  logger?.info(`Upgrade finished.`);

  return {
    basePath,
    configFile,
    sourceFiles: fileNames,
  };
}
