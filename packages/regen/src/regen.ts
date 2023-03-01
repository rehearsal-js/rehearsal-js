import { dirname, resolve, extname } from 'path';
import { PluginsRunner, RehearsalService } from '@rehearsal/service';
import { DiagnosticCheckPlugin, LintPlugin, ReRehearsePlugin } from '@rehearsal/plugins';
import ts from 'typescript';
import type { ListrContext } from 'listr2';
import type { Logger } from 'winston';
import type { Reporter } from '@rehearsal/reporter';

export type RegenInput = {
  basePath: string;
  entrypoint: string;
  sourceFiles: string[];
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

const { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } = ts;

export async function regen(input: RegenInput): Promise<RegenOutput> {
  const basePath = resolve(input.basePath);
  const configName = input.configName || 'tsconfig.json';
  const sourceFiles = input.sourceFiles || [resolve(basePath, 'index.ts')];
  const reporter = input.reporter;
  const logger = input.logger;

  //regen will only work on ts files
  const filteredSourceFiles = sourceFiles.filter((file) => extname(file) === '.ts');

  const listrTask = input.task || { output: '' };

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

  const { options, fileNames: someFiles } = parseJsonConfigFileContent(
    config,
    sys,
    dirname(configFile),
    {},
    configFile
  );

  const fileNames = [...new Set([...someFiles, ...filteredSourceFiles])];

  logger?.debug(`fileNames: ${JSON.stringify(fileNames)}`);

  const commentTag = '@rehearsal';

  const rehearsal = new RehearsalService(options, fileNames);

  const runner = new PluginsRunner({ basePath, rehearsal, reporter, logger })
    .queue(new ReRehearsePlugin(), {
      commentTag,
    })
    .queue(new LintPlugin(), {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: true },
      reportErrors: false,
    })
    .queue(new DiagnosticCheckPlugin(), {
      commentTag,
    })
    .queue(new LintPlugin(), {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: true },
      reportErrors: false,
    })
    .queue(new LintPlugin(), {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: false },
      reportErrors: true,
    });

  await runner.run(fileNames, { log: (message) => (listrTask.output = message) });
  reporter.saveCurrentRunToReport(basePath, input.entrypoint || '');

  return {
    basePath,
    configFile,
    scannedFiles: fileNames,
  };
}
