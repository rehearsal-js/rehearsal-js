import { existsSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { execSync } from 'child_process';
import { RehearsalService } from '@rehearsal/service';
import { DiagnosticFixPlugin, LintPlugin, DiagnosticCheckPlugin } from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';
import type { ListrContext } from 'listr2';

export type MigrateInput = {
  basePath: string;
  sourceFiles: Array<string>;
  configName?: string;
  reporter: Reporter; // Reporter
  logger?: Logger;
  task?: ListrContext;
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

  const plugins = [LintPlugin, DiagnosticFixPlugin, LintPlugin, DiagnosticCheckPlugin, LintPlugin];

  logger?.debug('migration started');
  logger?.debug(`Base path: ${basePath}`);
  logger?.debug(`sourceFiles: ${JSON.stringify(sourceFiles)}`);

  const targetFiles = gitMove(sourceFiles, listrTask, basePath, logger);

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

// Rename files to TS extension.
export function gitMove(
  sourceFiles: string[],
  listrTask: ListrContext,
  basePath: string,
  logger?: Logger
): string[] {
  return sourceFiles.map((sourceFile) => {
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
        execSync(`git mv ${sourceFile} ${tsFile}`);
      } catch (e) {
        // use simple mv if git mv fails
        execSync(`mv ${sourceFile} ${tsFile}`);
      }
      listrTask.output = `git mv ${sourceFile.replace(basePath, '')} to ${destFile.replace(
        basePath,
        ''
      )}`;
    }

    return tsFile;
  });
}
