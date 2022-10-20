import { copyFileSync, existsSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { RehearsalService } from '@rehearsal/service';
import {
  DiagnosticFixPlugin,
  EmptyLinesPreservePlugin,
  EmptyLinesRestorePlugin,
  LintPlugin,
} from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';

export type MigrateInput = {
  basePath: string;
  sourceFiles: Array<string>;
  configName?: string;
  reporter?: Reporter; // Reporter
  logger?: Logger;
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

  const plugins = [
    LintPlugin,
    EmptyLinesPreservePlugin,
    DiagnosticFixPlugin,
    EmptyLinesRestorePlugin,
    LintPlugin,
  ];

  logger?.info('Migration started.');
  logger?.info(`Base path: ${basePath}`);
  logger?.debug(`sourceFiles: ${JSON.stringify(sourceFiles)}`);

  // Rename files to TS extension.

  const targetFiles = sourceFiles.map((sourceFile) => {
    const ext = extname(sourceFile);
    const pos = sourceFile.lastIndexOf(ext);
    const destFile = `${sourceFile.substring(0, pos)}`;
    const tsFile = `${destFile}.ts`;
    const dtsFile = `${destFile}.d.ts`;

    if (sourceFile === tsFile) {
      logger?.info(`no-op ${sourceFile} is a .ts file`);
    } else if (existsSync(tsFile)) {
      logger?.info(`Found ${tsFile} ???`);
    } else if (existsSync(dtsFile)) {
      logger?.info(`Found ${dtsFile} ???`);
      // Should prepend d.ts file if it exists to the new ts file.
    } else {
      const destFile = tsFile;
      copyFileSync(sourceFile, destFile);
      logger?.info(
        `Copying ${sourceFile.replace(basePath, '')} to ${destFile.replace(basePath, '')}`
      );
    }

    return tsFile;
  });

  const configFile = findConfigFile(basePath, sys.fileExists, configName);

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.info(`Config file found: ${configFile}`);

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
    logger?.info(`Processing file: ${fileName}`);

    let allChangedFiles: Set<string> = new Set();

    for (const pluginClass of plugins) {
      const plugin = new pluginClass(service, logger, reporter);
      const changedFiles = await plugin.run(fileName);
      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);
    }

    // Save file to the filesystem
    allChangedFiles.forEach((file) => service.saveFile(file));
  }

  logger?.info(`Conversion finished.`);

  return {
    basePath,
    configFile,
    migratedFiles: fileNames,
  };
}
