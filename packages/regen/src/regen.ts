import { dirname, resolve } from 'path';
import { RehearsalService } from '@rehearsal/service';
import {
  ReRehearsePlugin,
  LintFixPlugin,
  DiagnosticCheckPlugin,
  LintCheckPlugin,
} from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';
import type { ListrContext } from 'listr2';

export type RegenInput = {
  basePath: string;
  configName?: string;
  reporter: Reporter;
  logger?: Logger;
  task?: ListrContext;
};

export type RegenOutput = {
  basePath: string;
  configFile: string;
  scannedFiles: Array<string>;
};

export async function regen(input: RegenInput): Promise<RegenOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;
  // output is only for tests
  const listrTask = input.task || { output: '' };

  const plugins = [
    ReRehearsePlugin,
    LintFixPlugin,
    DiagnosticCheckPlugin,
    LintFixPlugin,
    LintCheckPlugin,
  ];

  logger?.debug('migration regen started');
  logger?.debug(`Base path: ${basePath}`);

  const configFile = findConfigFile(basePath, sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.debug(`config file: ${configFile}`);

  const { config } = readConfigFile(configFile, sys.readFile);

  const { options, fileNames } = parseJsonConfigFileContent(
    config,
    sys,
    dirname(configFile),
    {},
    configFile
  );

  logger?.debug(`fileNames: ${JSON.stringify(fileNames)}`);

  const service = new RehearsalService(options, fileNames);

  for (const fileName of fileNames) {
    listrTask.output = `processing file: ${fileName.replace(basePath, '')}`;

    let allChangedFiles: Set<string> = new Set();

    for (const pluginClass of plugins) {
      const plugin = new pluginClass(service, reporter, logger);
      const changedFiles = await plugin.run(fileName);
      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);
    }

    allChangedFiles.forEach((file) => service.saveFile(file));
  }

  return {
    basePath,
    configFile,
    scannedFiles: fileNames,
  };
}
