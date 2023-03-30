import { dirname, extname, resolve } from 'path';
import { PluginsRunner, RehearsalService } from '@rehearsal/service';
import {
  DiagnosticReportPlugin,
  LintPlugin,
  PrettierPlugin,
  ReRehearsePlugin,
} from '@rehearsal/plugins';
import ts from 'typescript';
import type { ListrContext } from 'listr2';
import type { Logger } from 'winston';
import type { Reporter } from '@rehearsal/reporter';
import type { ESLint } from 'eslint';

export type RegenInput = {
  basePath: string;
  entrypoint: string;
  sourceFiles: string[];
  tsConfigName?: string;
  eslintOptions?: ESLint.Options;
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
  const tsConfigName = input.tsConfigName || 'tsconfig.json';
  const sourceFiles = input.sourceFiles || [resolve(basePath, 'index.ts')];
  const reporter = input.reporter;
  const logger = input.logger;

  //regen will only work on ts files
  const filteredSourceFiles = sourceFiles.filter((file) => extname(file) === '.ts');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const listrTask: { output: string } = input.task || { output: '' };

  logger?.debug('migration regen started');
  logger?.debug(`Base path: ${basePath}`);

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const configFile = findConfigFile(basePath, sys.fileExists, tsConfigName);

  if (!configFile) {
    const message = `Config file '${tsConfigName}' not found in '${basePath}'`;
    throw Error(message);
  }

  logger?.debug(`config file: ${configFile}`);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { config } = readConfigFile(configFile, (filepath: string, encoding?: string) =>
    sys.readFile(filepath, encoding)
  );

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

  const service = new RehearsalService(options, fileNames);

  const runner = new PluginsRunner({ basePath, service, reporter, logger })
    .queue(new ReRehearsePlugin(), {
      commentTag,
    })
    .queue(new LintPlugin(), {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: true, ...input.eslintOptions },
      reportErrors: false,
    })
    .queue(new DiagnosticReportPlugin(), {
      commentTag,
    })
    .queue(new PrettierPlugin(), {})
    .queue(new LintPlugin(), {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: true, ...input.eslintOptions },
      reportErrors: true,
    });

  for await (const _ of runner.run(fileNames, { log: (message) => (listrTask.output = message) })) {
    // no ops for yield
  }

  reporter.saveCurrentRunToReport(basePath, input.entrypoint || '');

  return {
    basePath,
    configFile,
    scannedFiles: fileNames,
  };
}
