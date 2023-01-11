import { existsSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { RehearsalService } from '@rehearsal/service';
import {
  DiagnosticFixPlugin,
  LintFixPlugin,
  DiagnosticCheckPlugin,
  LintCheckPlugin,
} from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import { sync as execaSync } from 'execa';
import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';
import type { ListrTaskWrapper, ListrContext, ListrRendererFactory } from 'listr2';

export type MigrateInput = {
  basePath: string;
  sourceFiles: Array<string>;
  configName?: string;
  reporter: Reporter; // Reporter
  logger?: Logger;
  task?: ListrTaskWrapper<ListrContext, ListrRendererFactory>;
};

export type MigrateOutput = {
  basePath: string;
  configFile: string;
  migratedFiles: Array<string>;
};

export async function migrate(input: MigrateInput): Promise<MigrateOutput> {
  const basePath = resolve(input.basePath);
  const sourceFiles = input.sourceFiles || ['index.js'];
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;
  // output is only for tests
  const listrTask = input.task || { output: '' };

  const plugins = [
    LintFixPlugin,
    DiagnosticFixPlugin,
    LintFixPlugin,
    DiagnosticCheckPlugin,
    LintFixPlugin,
    LintCheckPlugin,
  ];

  logger?.debug('migration started');
  logger?.debug(`Base path: ${basePath}`);
  logger?.debug(`sourceFiles: ${JSON.stringify(sourceFiles)}`);

  // Rename files to TS extension.

  const targetFiles = sourceFiles.map((sourceFile) => {
    const ext = extname(sourceFile);
    const pos = sourceFile.lastIndexOf(ext);
    const destFile = `${sourceFile.substring(0, pos)}`;
    const tsFile = `${destFile}.ts`;
    const dtsFile = `${destFile}.d.ts`;

    if (sourceFile === tsFile) {
      logger?.debug(`no-op ${sourceFile} is a .ts file`);
    } else if (existsSync(tsFile)) {
      logger?.debug(`Found ${tsFile} ???`);
    } else if (existsSync(dtsFile)) {
      logger?.debug(`Found ${dtsFile} ???`);
      // Should prepend d.ts file if it exists to the new ts file.
    } else {
      const destFile = tsFile;

      try {
        // use git mv to keep the commit history in each file
        // would fail if the file is not been tracked
        execaSync('git', ['mv', sourceFile, destFile]);
      } catch (e) {
        // use simple mv if git mv fails
        execaSync('mv', [sourceFile, destFile]);
      }
      listrTask.output = `git mv ${sourceFile.replace(basePath, '')} to ${destFile.replace(
        basePath,
        ''
      )}`;
    }

    return tsFile;
  });

  const configFile = findConfigFile(basePath, sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.debug(`config file: ${configFile}`);

  const { config } = readConfigFile(configFile, sys.readFile);

  const { options, fileNames: someFiles } = parseJsonConfigFileContent(
    config,
    sys,
    dirname(configFile),
    {},
    configFile
  );

  const fileNames = [...new Set([...someFiles, ...targetFiles])];

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

    // Save file to the filesystem
    allChangedFiles.forEach((file) => service.saveFile(file));
  }

  return {
    basePath,
    configFile,
    migratedFiles: fileNames,
  };
}
