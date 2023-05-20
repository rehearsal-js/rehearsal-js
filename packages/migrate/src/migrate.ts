import { resolve, join } from 'node:path';
import { findUpSync } from 'find-up';
import { readTSConfig, readJSON } from '@rehearsal/utils';
import {
  PluginsRunner,
  RehearsalService,
  isGlintFile,
  isGlintProject,
  GlintService,
  DummyPlugin,
} from '@rehearsal/service';
import debug from 'debug';
import ts from 'typescript';
import fastGlob from 'fast-glob';
import {
  DiagnosticFixPlugin,
  DiagnosticCommentPlugin,
  isPrettierUsedForFormatting,
  LintPlugin,
  PrettierPlugin,
  ReRehearsePlugin,
  ServiceInjectionsTransformPlugin,
  DiagnosticReportPlugin,
  GlintFixPlugin,
  GlintCommentPlugin,
  GlintReportPlugin,
} from '@rehearsal/plugins';
import { getExcludePatterns } from '@rehearsal/migration-graph';
import * as glintCore from '@glint/core';
import type { Reporter } from '@rehearsal/reporter';
import type { TSConfig } from '@rehearsal/utils';

export type MigrateInput = {
  mode?: 'single-pass' | 'drain';
  projectRootDir: string;
  packageDir: string;
  filesToMigrate: string[];
  reporter: Reporter;
  ignore?: string[];
  configName?: string;
  task?: { output: string };
};

const DEBUG_CALLBACK = debug('rehearsal:migrate');
const { parseJsonConfigFileContent, findConfigFile } = ts;

export async function* migrate(input: MigrateInput): AsyncGenerator<string> {
  const projectRootDir = input.projectRootDir;
  const packageDir = input.packageDir;
  const filesToMigrate = input.filesToMigrate;
  const reporter = input.reporter;
  const ignore = input.ignore || [];
  const configName = input.configName || 'tsconfig.json';
  const commentTag = '@rehearsal';
  const workingDirName = '.rehearsal';
  const mode = input.mode ?? 'single-pass';

  // Output is only for tests
  const listrTask = input.task || { output: '' };

  // We, currently, expect glint deps and config to be in the root package.json...
  // TODO: Find a better way to check if required dependency exists
  const useGlint = await isGlintProject(projectRootDir);

  DEBUG_CALLBACK('Migration started');
  DEBUG_CALLBACK(` package directory: ${packageDir}`);

  // Search for closest to the current package TypeScript config file
  const configFile = findConfigFile(packageDir, (path) => ts.sys.fileExists(path), configName);

  if (!configFile) {
    throw Error(`Config file '${configName}' not found in '${packageDir}'`);
  }

  const tsConfig = readTSConfig<TSConfig>(configFile);

  if (!tsConfig) {
    throw Error(`Could not read '${configFile}'`);
  }

  const { options: tsCompilerOptions, fileNames: filesFromConfig } = parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    packageDir,
    {},
    configName
  );

  const filesToCompile = [...new Set([...filesFromConfig, ...filesToMigrate])];
  const ignoredPaths = resolveIgnoredPaths(ignore, projectRootDir, getExcludePatterns);
  const filteredFilesToMigrate = input.filesToMigrate.filter(
    (filePath) => !ignoredPaths.includes(filePath)
  );

  const servicesMap = await readServiceMap(packageDir, `${workingDirName}/services-map.json`);

  DEBUG_CALLBACK(` configFile: %O'`, configFile);
  DEBUG_CALLBACK(` filesFromConfig: %O`, filesFromConfig);
  DEBUG_CALLBACK(` filesToCompile: %O`, filesToCompile);
  DEBUG_CALLBACK(` filesToMigrate: %O`, filesToMigrate);
  DEBUG_CALLBACK(` ignoredPaths: %O`, ignoredPaths);
  DEBUG_CALLBACK(` filteredFilesToMigrate: %O`, filteredFilesToMigrate);

  const service = useGlint
    ? new GlintService(glintCore, packageDir)
    : new RehearsalService(tsCompilerOptions, filesToMigrate);

  function isGlintService(
    service: GlintService | RehearsalService,
    useGlint: boolean
  ): service is GlintService {
    return service && useGlint;
  }

  const runner = new PluginsRunner({ basePath: packageDir, service, reporter })
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
        mode,
      },
      (fileName: string) => !(isGlintService(service, useGlint) && isGlintFile(service, fileName))
    )
    .queue(
      useGlint ? GlintFixPlugin : DummyPlugin,
      {
        mode,
      },
      (fileName: string) => isGlintService(service, useGlint) && isGlintFile(service, fileName)
    )
    // Fix formatting
    .queue(PrettierPlugin, (fileName: string) => isPrettierUsedForFormatting(fileName))
    .queue(
      LintPlugin,
      {
        eslintOptions: { cwd: packageDir, useEslintrc: true, fix: true },
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
      useGlint ? GlintCommentPlugin : DummyPlugin,
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
        eslintOptions: { cwd: packageDir, useEslintrc: true, fix: true },
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
    .queue(
      useGlint ? GlintReportPlugin : DummyPlugin,
      {
        commentTag,
      },
      (fileName: string) => isGlintService(service, useGlint) && isGlintFile(service, fileName)
    )
    // Report linter issues
    .queue(LintPlugin, {
      eslintOptions: { cwd: packageDir, useEslintrc: true, fix: false },
      reportErrors: true,
    });

  // Run on only files passed to the function
  yield* runner.run(filteredFilesToMigrate, {
    log: (message: string) => (listrTask.output = message),
  });

  // Save report after all yields
  reporter.saveCurrentRunToReport(resolve(projectRootDir, workingDirName));
}

async function readServiceMap(
  basePath: string,
  mapFilePattern: string
): Promise<Map<string, string> | undefined> {
  try {
    const maybeMapFile = findUpSync(mapFilePattern, { cwd: basePath });
    if (maybeMapFile) {
      const map = await readJSON(maybeMapFile);
      return new Map<string, string>(Object.entries(map as { [key: string]: string }));
    }
  } catch (e) {
    /* empty */
  }

  return undefined;
}

export function resolveIgnoredPaths(
  ignore: string[],
  basePath: string,
  excludePattern: () => string[]
): string[] {
  const ignoredPaths = ignore
    .flatMap((glob) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return fastGlob.sync(glob, { cwd: basePath, ignore: excludePattern() });
    })
    .map((filePath) => join(basePath, filePath));

  return ignoredPaths;
}
