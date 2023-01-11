/* eslint-disable @typescript-eslint/no-unused-vars */
import { existsSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { execSync } from 'child_process';
import { RehearsalService } from '@rehearsal/service';
import { DiagnosticFixPlugin, LintPlugin, DiagnosticCheckPlugin } from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import { ListrContext } from 'listr2';
import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';

const noop = (): void => {
  // noop
};

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

type MigratePlugins = Array<
  typeof LintPlugin | typeof DiagnosticFixPlugin | typeof DiagnosticCheckPlugin
>;

export type ProcessFilesInput = {
  fileNames: string[];
  basePath: string;
  plugins: MigratePlugins;
  reporter: Reporter;
  listrTask: ListrContext;
  service: RehearsalService;
  logger?: Logger;
};

type ProcessPluginsInput = {
  allChangedFiles: Set<string>;
  fileName: string;
  plugins: MigratePlugins;
  service: RehearsalService;
  reporter: Reporter;
  logger?: Logger;
};

export async function migrate(input: MigrateInput): Promise<MigrateOutput> {
  const basePath = resolve(input.basePath);
  const sourceFiles = input.sourceFiles || ['index.js'];
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;
  // output is only for tests
  const listrTask: ListrContext = input.task || { output: '' };

  const plugins: MigratePlugins = [
    LintPlugin,
    DiagnosticFixPlugin,
    LintPlugin,
    DiagnosticCheckPlugin,
    LintPlugin,
  ];

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

  await processFilesIterator({
    fileNames,
    basePath,
    plugins,
    listrTask,
    service,
    reporter,
    logger,
  });

  return {
    basePath,
    configFile,
    migratedFiles: fileNames,
  };
}

// drain the iterator to process all files so we can yield to the event loop
export async function processFilesIterator({
  fileNames,
  basePath,
  plugins,
  listrTask,
  service,
  reporter,
  logger,
}: ProcessFilesInput): Promise<void> {
  const fileIteratorProcesser = processFilesGenerator({
    fileNames,
    basePath,
    plugins,
    listrTask,
    service,
    reporter,
    logger,
  });

  for await (const _ of fileIteratorProcesser) {
    const next = async (): Promise<void> => {
      const { done } = await fileIteratorProcesser.next();
      if (!done) {
        setImmediate(next);
      }
    };

    await next();
  }
}

// async generator to process files
// since this is a long running process, we need to yield to the event loop
// so we dont block the main thread
export async function* processFilesGenerator({
  fileNames,
  basePath,
  plugins,
  listrTask,
  service,
  reporter,
  logger,
}: ProcessFilesInput): AsyncGenerator<void> {
  for (const fileName of fileNames) {
    listrTask.output = `processing file: ${fileName.replace(basePath, '')}`;

    const allChangedFiles: Set<string> = new Set();

    const pluginIteratorProcesser = processPlugins({
      allChangedFiles,
      fileName,
      plugins,
      service,
      reporter,
      logger,
    });

    for await (const _ of pluginIteratorProcesser) {
      // noop();
      const next = async (): Promise<void> => {
        const { done } = await pluginIteratorProcesser.next();

        if (!done) {
          setImmediate(next);
        }
      };

      await next();
    }

    // Save file to the filesystem
    allChangedFiles.forEach((file) => service.saveFile(file));

    yield;
  }
}

async function* processPlugins({
  allChangedFiles,
  fileName,
  plugins,
  service,
  reporter,
  logger,
}: ProcessPluginsInput): AsyncGenerator<void> {
  setTimeout(() => {
    noop();
  }, 10);

  for (const pluginClass of plugins) {
    const plugin = new pluginClass(service, reporter, logger);
    const changedFiles = await plugin.run(fileName);

    allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);

    yield;
  }

  return allChangedFiles;
}

// Rename files to TS extension.
function gitMove(
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
