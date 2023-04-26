import { dirname, resolve } from 'node:path';
import findup from 'findup-sync';
import { readJSON } from '@rehearsal/utils';
import {
  PluginsRunner,
  RehearsalService,
  isGlintFile,
  isGlintProject,
  type GlintService,
  DummyPlugin,
} from '@rehearsal/service';
import debug from 'debug';
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
import type { Reporter } from '@rehearsal/reporter';
import type { TsConfigJson } from 'type-fest';

export type MigrateInput = {
  basePath: string;
  sourceFiles: Array<string>;
  reporter: Reporter; // Reporter
  task?: { output: string };
};

export type MigrateOutput = {
  basePath: string;
  configFile: string;
  migratedFiles: Array<string>;
};

const { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } = ts;

const DEBUG_CALLBACK = debug('rehearsal:migrate');

export async function* migrate(input: MigrateInput): AsyncGenerator<string> {
  const basePath = resolve(input.basePath);
  const sourceFiles = input.sourceFiles || [resolve(basePath, 'index.js')];
  const reporter = input.reporter;
  const configName = 'tsconfig.json';
  // output is only for tests
  const listrTask = input.task || { output: '' };

  DEBUG_CALLBACK('migration started');
  DEBUG_CALLBACK(`Base path: ${basePath}`);
  DEBUG_CALLBACK(`sourceFiles: ${JSON.stringify(sourceFiles)}`);

  const commentTag = '@rehearsal';
  const useGlint = await isGlintProject(basePath);

  const configFile = findConfigFile(
    basePath,
    (filePath: string) => sys.fileExists(filePath),
    configName
  );

  if (!configFile) {
    const message = `Config file '${configName}' not found in '${basePath}'`;
    throw Error(message);
  }

  DEBUG_CALLBACK(`config file: ${configFile}`);

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

  const fileNames = [...new Set([...someFiles, ...input.sourceFiles])];
  const servicesMap = await readServiceMap(resolve(basePath, '.rehearsal/services-map.json'));

  DEBUG_CALLBACK(`fileNames: ${JSON.stringify(fileNames)}`);

  if (useGlint) {
    const rawTsConfig = (await readJSON(configName)) as TsConfigJson;
    const moduleNameMap = createEmberAddonModuleNameMap(basePath);
    // Update the tsconfig with any module name mapping so that any subsequent type checking will
    // be actually work if we happen to encounter any ember addons that specify a `moduleName`
    await addFilePathsForAddonModules(configName, rawTsConfig, moduleNameMap);
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

  yield* runner.run(fileNames, { log: (message: string) => (listrTask.output = message) });

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
