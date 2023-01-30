import { dirname, resolve } from 'path';
import { Plugin, PluginOptions, RehearsalService } from '@rehearsal/service';
import {
  DiagnosticCheckPlugin,
  DiagnosticCheckPluginOptions,
  LintPlugin,
  LintPluginOption,
  ReRehearsePlugin,
  ReRehearsePluginOptions,
} from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import type { ListrContext } from 'listr2';
import type { Logger } from 'winston';
import type { Reporter } from '@rehearsal/reporter';

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

  const commentTag = '@rehearsal';

  // TODO: Wrap into PluginRunner
  const plugins: { plugin: Plugin<PluginOptions>; options?: PluginOptions }[] = [
    {
      plugin: new ReRehearsePlugin(),
      options: {
        commentTag,
      } as ReRehearsePluginOptions,
    },
    {
      plugin: new LintPlugin(),
      options: {
        eslintOptions: { fix: true, useEslintrc: true },
        reportErrors: false,
      } as LintPluginOption,
    },
    {
      plugin: new DiagnosticCheckPlugin(),
      options: {
        commentTag,
      } as DiagnosticCheckPluginOptions,
    },
    {
      plugin: new LintPlugin(),
      options: {
        eslintOptions: { fix: true, useEslintrc: true },
        reportErrors: false,
      } as LintPluginOption,
    },
    {
      plugin: new LintPlugin(),
      options: {
        eslintOptions: { fix: false, useEslintrc: true },
        reportErrors: true,
      } as LintPluginOption,
    },
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

    for (const plugin of plugins) {
      const changedFiles = await plugin.plugin.run(fileName, {
        ...plugin.options,
        service: service,
        reporter: reporter,
        logger: logger,
      });
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
