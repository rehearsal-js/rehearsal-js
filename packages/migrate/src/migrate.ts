import { existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { PluginsRunner, RehearsalService } from '@rehearsal/service';
import {
  DiagnosticCheckPlugin,
  DiagnosticFixPlugin,
  LintPlugin,
  ReRehearsePlugin,
} from '@rehearsal/plugins';
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import type { ListrContext } from 'listr2';
import type { Logger } from 'winston';
import type { Reporter } from '@rehearsal/reporter';

export type MigrateInput = {
  basePath: string;
  sourceFiles: Array<string>;
  entrypoint: string;
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
  const sourceFiles = input.sourceFiles || [resolve(basePath, 'index.js')];
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;
  let entrypoint = input.entrypoint;
  // output is only for tests
  const listrTask: ListrContext = input.task || { output: '' };

  logger?.debug('migration started');
  logger?.debug(`Base path: ${basePath}`);
  logger?.debug(`sourceFiles: ${JSON.stringify(sourceFiles)}`);

  const targetFiles = gitMove(sourceFiles, listrTask, basePath, logger);

  const entrypointFullPath = resolve(basePath, entrypoint);
  if (sourceFiles.includes(entrypointFullPath)) {
    entrypoint = entrypoint.replace(/js$/, 'ts');
  }

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
    .queue(new DiagnosticFixPlugin(), {
      safeFixes: true,
      strictTyping: true,
    })
    .queue(new LintPlugin(), {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: true },
      reportErrors: false,
    })
    .queue(new DiagnosticCheckPlugin(), {
      commentTag: '@rehearsal',
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
  reporter.saveCurrentRunToReport(basePath, entrypoint);

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
        // would fail if the file has not been tracked
        execSync(`git mv ${sourceFile} ${tsFile}`, { cwd: basePath });
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
