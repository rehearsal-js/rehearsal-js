import { resolve, join } from 'node:path';
import findup from 'findup-sync';
import { readTSConfig, readJSON } from '@rehearsal/utils';
import {
  PluginsRunner,
  RehearsalService,
  isGlintFile,
  isGlintProject,
  type GlintService,
  DummyPlugin,
} from '@rehearsal/service';
import debug from 'debug';
import ts from 'typescript';
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
import fastGlob from 'fast-glob';
import {
  getGlintFixPlugin,
  getGlintReportPlugin,
  getGlintCommentPlugin,
  createGlintService,
} from './glint-utils.js';
import { getExcludePatterns } from '@rehearsal/migration-graph-shared';
import type { Reporter } from '@rehearsal/reporter';
import type { CompilerOptions } from 'typescript';
import type { TSConfig } from '@rehearsal/utils';

export type MigrateInput = {
  rootPath: string;
  sourceFilesAbs: string[];
  reporter: Reporter; // Reporter
  task?: { output: string };
  ignore?: string[];
};

export type MigrateOutput = {
  rootPath: string;
  configFile: string;
  sourceFilesAbs: string[];
};

const DEBUG_CALLBACK = debug('rehearsal:migrate');
const { parseJsonConfigFileContent } = ts;

export async function* migrate(input: MigrateInput): AsyncGenerator<string> {
  const basePath = resolve(input.rootPath);
  // these will always be typescript files
  const sourceFilesAbs = input.sourceFilesAbs;
  const reporter = input.reporter;
  const ignore = input.ignore || [];
  const configName = 'tsconfig.json';
  // output is only for tests
  const listrTask = input.task || { output: '' };
  const commentTag = '@rehearsal';
  const useGlint = await isGlintProject(basePath);

  DEBUG_CALLBACK('migration started');
  DEBUG_CALLBACK(`Base path: ${basePath}`);
  DEBUG_CALLBACK(`sourceFiles: ${JSON.stringify(sourceFilesAbs)}`);

  // read the tsconfig.json
  const configFile = readTSConfig<TSConfig>(resolve(basePath, configName));

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    throw Error(message);
  }

  const tsConfigOptions = configFile.compilerOptions as CompilerOptions;

  DEBUG_CALLBACK(`tsconfig file: ${configFile}`);

  const { fileNames: someFiles } = parseJsonConfigFileContent(
    configFile,
    ts.sys,
    basePath,
    {},
    configName
  );

  // these should NOT all go into the report
  const fileNames = [...new Set([...someFiles, ...input.sourceFilesAbs])];
  const ignoredPaths = ignore
    .flatMap((glob) => {
      return fastGlob.sync(glob, { cwd: basePath, ignore: getExcludePatterns() });
    })
    .map((filePath) => join(basePath, filePath));

  // remove ignored paths from the list of files to migrate
  const filesToMigrate = fileNames.filter((filePath) => !ignoredPaths.includes(filePath));
  const servicesMap = await readServiceMap(basePath, '.rehearsal/services-map.json');

  DEBUG_CALLBACK(`fileNames: ${JSON.stringify(filesToMigrate)}`);

  const service = useGlint
    ? await createGlintService(basePath)
    : new RehearsalService(tsConfigOptions, filesToMigrate);

  function isGlintService(
    service: GlintService | RehearsalService,
    useGlint: boolean
  ): service is GlintService {
    return service && useGlint;
  }

  const runner = new PluginsRunner({ basePath, service, reporter })
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
    .queue(
      useGlint ? await getGlintReportPlugin() : DummyPlugin,
      {
        commentTag,
      },
      (fileName: string) => isGlintService(service, useGlint) && isGlintFile(service, fileName)
    )
    // Report linter issues
    .queue(LintPlugin, {
      eslintOptions: { cwd: basePath, useEslintrc: true, fix: false },
      reportErrors: true,
    });

  yield* runner.run(filesToMigrate, { log: (message: string) => (listrTask.output = message) });

  // save report after all yields
  reporter.saveCurrentRunToReport(basePath);
}

async function readServiceMap(
  basePath: string,
  mapFilePattern: string
): Promise<Map<string, string> | undefined> {
  try {
    const maybeMapFile = findup(mapFilePattern, { cwd: basePath });
    if (maybeMapFile) {
      const map = await readJSON(maybeMapFile);
      return new Map<string, string>(Object.entries(map as { [key: string]: string }));
    }
  } catch (e) {
    /* empty */
  }

  return undefined;
}
