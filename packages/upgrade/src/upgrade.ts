import { dirname, resolve } from 'path';
import {
  DiagnosticFixPlugin,
  LintFixPlugin,
  ReRehearsePlugin,
  DiagnosticCheckPlugin,
  LintCheckPlugin,
} from '@rehearsal/plugins';
import { Reporter } from '@rehearsal/reporter';
import { RehearsalService } from '@rehearsal/service';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import { debug } from 'debug';
import type { Logger } from 'winston';

export type UpgradeInput = {
  basePath: string;
  configName?: string;
  reporter: Reporter;
  logger?: Logger;
};

export type UpgradeOutput = {
  basePath: string;
  configFile: string;
  sourceFiles: string[];
};

const DEBUG_CALLBACK = debug('rehearsal:upgrade');

/**
 * Provides semantic diagnostic information in @ts-expect-error comments and in a JSON report
 */
export async function upgrade(input: UpgradeInput): Promise<UpgradeOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;

  const plugins = [
    ReRehearsePlugin,
    LintFixPlugin,
    DiagnosticFixPlugin,
    LintFixPlugin,
    DiagnosticCheckPlugin,
    LintFixPlugin,
    LintCheckPlugin,
  ];

  DEBUG_CALLBACK('Upgrade started at Base path: %O', basePath);

  const configFile = findConfigFile(basePath, sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  DEBUG_CALLBACK('Config file found: %O', configFile);

  const { config } = readConfigFile(configFile, sys.readFile);
  const { options, fileNames } = parseJsonConfigFileContent(
    config,
    sys,
    dirname(configFile),
    {},
    configFile
  );

  DEBUG_CALLBACK('Config file content: %O', { options, fileNames });

  const service = new RehearsalService(options, fileNames);

  for (const fileName of fileNames) {
    DEBUG_CALLBACK('Processing file: %O', fileName);

    let allChangedFiles: Set<string> = new Set();

    for (const pluginClass of plugins) {
      const plugin = new pluginClass(service, reporter, logger);
      const changedFiles = await plugin.run(fileName);
      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);
    }

    DEBUG_CALLBACK('Plugins Complete on: %O', fileName);

    // Save file to the filesystem
    allChangedFiles.forEach((file) => service.saveFile(file));
    DEBUG_CALLBACK('Files Saved: %O', allChangedFiles);
  }
  DEBUG_CALLBACK('Upgrade finished');

  return {
    basePath,
    configFile,
    sourceFiles: fileNames,
  };
}
