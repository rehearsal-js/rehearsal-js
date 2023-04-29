import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { readJSON } from '@rehearsal/utils';
import {
  PluginsRunner,
  RehearsalService,
  isGlintFile,
  isGlintProject,
  type GlintService,
  DummyPlugin,
} from '@rehearsal/service';
import {
  DiagnosticFixPlugin,
  DiagnosticCommentPlugin,
  isPrettierUsedForFormatting,
  LintPlugin,
  PrettierPlugin,
  ReRehearsePlugin,
  ServiceInjectionsTransformPlugin,
  DiagnosticReportPlugin,
} from '@rehearsal/plugins';
import ts from 'typescript';
import {
  addFilePathsForAddonModules,
  createEmberAddonModuleNameMap,
  getGlintFixPlugin,
  getGlintReportPlugin,
  getGlintCommentPlugin,
  createGlintService,
} from './glint-utils.js';
import type { Logger } from 'winston';
import type { Reporter } from '@rehearsal/reporter';
import type { TsConfigJson } from 'type-fest';

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

export async function* migrate(input: MigrateInput): AsyncGenerator<string> {
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
  const servicesMap = await readServiceMap(resolve(basePath, '.rehearsal', 'services-map.json'));

  const useGlint = await isGlintProject(basePath);

  if (useGlint) {
    const rawTsConfig = (await readJSON(configFile)) as TsConfigJson;
    const moduleNameMap = createEmberAddonModuleNameMap(basePath);
    // Update the tsconfig with any module name mapping so that any subsequent type checking will
    // be actually work if we happen to encounter any ember addons that specify a `moduleName`
    await addFilePathsForAddonModules(configFile, rawTsConfig, moduleNameMap);
  }

  const service = useGlint
    ? await createGlintService(basePath)
    : new RehearsalService(options, fileNames);

  function isGlintService(
    service: GlintService | RehearsalService,
    useGlint: boolean
  ): service is GlintService {
    return service && useGlint;
  }

  const runner = new PluginsRunner({ basePath, service, reporter, logger })
    // Resetting
    .queue(ReRehearsePlugin, {
      commentTag,
    })
    // Fix errors
    .queue(ServiceInjectionsTransformPlugin, {
      servicesMap,
    })
    .queue(
      DiagnosticFixPlugin,
      {
        safeFixes: true,
        strictTyping: true,
      },
      (fileName: string) => !(isGlintService(service, useGlint) && isGlintFile(service, fileName))
    )
    .queue(
      useGlint ? await getGlintFixPlugin() : DummyPlugin,
      (fileName: string) => isGlintService(service, useGlint) && isGlintFile(service, fileName)
    )
    // Fix formatting
    .queue(PrettierPlugin, (fileName: string) => isPrettierUsedForFormatting(fileName))
    .queue(
      LintPlugin,
      {
        eslintOptions: { cwd: basePath, useEslintrc: true, fix: true },
        reportErrors: false,
      },
      (fileName: string) => !isPrettierUsedForFormatting(fileName)
    )
    // Add ts-expect-error comments and report those errors
    .queue(
      DiagnosticCommentPlugin,
      {
        addHints: true,
        commentTag,
      },
      (fileName: string) => !(isGlintService(service, useGlint) && isGlintFile(service, fileName))
    )
    .queue(
      useGlint ? await getGlintCommentPlugin() : DummyPlugin,
      {
        commentTag,
      },
      (fileName: string) => isGlintService(service, useGlint) && isGlintFile(service, fileName)
    )
    // Format previously added comments
    .queue(PrettierPlugin, (fileName: string) => isPrettierUsedForFormatting(fileName))
    .queue(
      LintPlugin,
      {
        eslintOptions: { cwd: basePath, useEslintrc: true, fix: true },
        reportErrors: false,
      },
      (fileName: string) => !isPrettierUsedForFormatting(fileName)
    )
    .queue(
      DiagnosticReportPlugin,
      {
        commentTag,
      },
      (fileName: string) => !(isGlintService(service, useGlint) && isGlintFile(service, fileName))
    )
    .queue(useGlint ? await getGlintReportPlugin() : DummyPlugin, {
      commentTag,
      filter: (fileName: string) =>
        isGlintService(service, useGlint) && isGlintFile(service, fileName),
    })
    // Report linter issues
    .queue(LintPlugin, {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: false },
      reportErrors: true,
    });

  yield* runner.run(fileNames, { log: (message: string) => (listrTask.output = message) });
  // save report after all yields
  reporter.saveCurrentRunToReport(basePath, entrypoint);
}

/**
 * Renames files to TS extension and use git move to keep edit history
 */
export function gitMove(
  sourceFiles: string[],
  listrTask: { output: string },
  basePath: string,
  logger?: Logger
): string[] {
  return sourceFiles.map((sourceFile) => {
    const ext = extname(sourceFile);

    if (ext === '.hbs') {
      return sourceFile;
    }

    const pos = sourceFile.lastIndexOf(ext);
    const destFile = `${sourceFile.substring(0, pos)}`;
    const tsFile = ext === '.gjs' ? `${destFile}.gts` : `${destFile}.ts`;
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

async function readServiceMap(pathToMapFile: string): Promise<Map<string, string> | undefined> {
  try {
    const map = await readJSON(pathToMapFile);
    return new Map<string, string>(Object.entries(map as { [key: string]: string }));
  } catch (e) {
    return undefined;
  }
}
