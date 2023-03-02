import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { GlintService, PluginsRunner } from '@rehearsal/service';
import { DiagnosticCheckPlugin, DiagnosticFixPlugin, LintPlugin } from '@rehearsal/plugins';
import ts from 'typescript';
import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';

export type MigrateInput = {
  basePath: string;
  sourceFiles: Array<string>;
  entrypoint: string;
  configName?: string;
  reporter: Reporter; // Reporter
  logger?: Logger;
  task?: { output: string };
};

export type MigrateOutput = {
  basePath: string;
  configFile: string;
  migratedFiles: Array<string>;
};

const { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } = ts;

export async function migrate(input: MigrateInput): Promise<MigrateOutput> {
  const basePath = resolve(input.basePath);
  const sourceFiles = input.sourceFiles || [resolve(basePath, 'index.js')];
  const configName = input.configName || 'tsconfig.json';
  const reporter = input.reporter;
  const logger = input.logger;
  let entrypoint = input.entrypoint;
  // output is only for tests
  const listrTask = input.task || { output: '' };

  logger?.debug('migration started');
  logger?.debug(`Base path: ${basePath}`);
  logger?.debug(`sourceFiles: ${JSON.stringify(sourceFiles)}`);

  const targetFiles = gitMove(sourceFiles, listrTask, basePath, logger);

  const entrypointFullPath = resolve(basePath, entrypoint);
  if (sourceFiles.includes(entrypointFullPath)) {
    entrypoint = entrypoint.replace(/js$/, 'ts');
  }

  const configFile = findConfigFile(
    basePath,
    (filePath: string) => sys.fileExists(filePath),
    configName
  );

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    logger?.error(message);
    throw Error(message);
  }

  logger?.debug(`config file: ${configFile}`);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { config } = readConfigFile(configFile, (filePath: string, encoding?: string) =>
    sys.readFile(filePath, encoding)
  );

  const { options, fileNames: someFiles } = parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(configFile),
    {},
    configFile
  );

  const fileNames = [...new Set([...someFiles, ...targetFiles])];

  logger?.debug(`fileNames: ${JSON.stringify(fileNames)}`);

  const commentTag = '@rehearsal';

  // const rehearsal = new RehearsalService(options, fileNames);
  const rehearsal = new GlintService(basePath);

  const runner = new PluginsRunner({ basePath, rehearsal, reporter, logger })
    // .queue(new ReRehearsePlugin(), {
    //   commentTag,
    // })
    // .queue(new LintPlugin(), {
    //   eslintOptions: { cwd: basePath, useEslintrc: true, fix: true },
    //   reportErrors: false,
    // })
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
  listrTask: { output: string },
  basePath: string,
  logger?: Logger
): string[] {
  return sourceFiles.map((sourceFile) => {
    const ext = extname(sourceFile);
    const pos = sourceFile.lastIndexOf(ext);
    const destFile = `${sourceFile.substring(0, pos)}`;
    const tsFile = ext === '.gjs' ? `${destFile}.gts` : `${destFile}.ts`;
    // const tsFile = `${destFile}.ts`;
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
