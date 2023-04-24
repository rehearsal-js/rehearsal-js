import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports, Logger } from 'winston';
import { determineProjectName, getPathToBinary } from '@rehearsal/utils';
import { execa } from 'execa';
import debug from 'debug';
import { initTask, validateTask } from './tasks/index.js';
// eslint-disable-next-line no-restricted-imports
import type { SourceFile } from '@rehearsal/migration-graph';
import type { FixCommandOptions } from '../../types.js';

// subcommand migrate init
export const regenCommand = new Command();

regenCommand
  .name('regen')
  .description(
    'Install required dependencies, setup tsconfig.json, eslint config and essential package scripts'
  )
  .addOption(
    new Option('-p, --basePath <project base path>', 'base directory of your project')
      .default(process.cwd())
      // use argParser to ensure process.cwd() is basePath
      // even use passes anything accidentally
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'path to rehearsal config',
    'rehearsal-config.json'
  )
  .option('-v, --verbose', 'print debugging logs')
  .action(async (options: MigrateCommandOptions) => {
    await initCommandHandler(options);
  });

export async function initCommandHandler(options: MigrateCommandOptions): Promise<void> {
  // init should never run in interactive mode
  options.ci = true;

  const loggerLevel = options.verbose ? 'debug' : 'info';
  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
  });
  const defaultListrOption = {
    collapse: false,
    collapseErrors: false,
    concurrent: false,
    exitOnError: true,
  };

  const tasks = [
    validateTask(options, logger),
    initTask(options),
    depInstallTask(options),
    tsConfigTask(options),
    lintConfigTask(options),
    createScriptsTask(options),
  ];

  try {
    await new Listr(tasks, defaultListrOption).run();
    logger.info(
      `The project is ready for migration. Please run "rehearsal migrate" to start the migration.`
    );
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`${e.message + '\n' + (e.stack || '')}`);
    }
  }
}

/*
MERGE THIS
*/

import { resolve, resolve } from 'node:path';

import type { ListrTask, ListrTask, ListrTask } from 'listr2';

import type {
  MigrateCommandContext,
  MigrateCommandOptions,
  MigrateCommandContext,
  MigrateCommandOptions,
  PreviousRuns,
  MigrateCommandContext,
  MigrateCommandOptions,
  PreviousRuns,
} from '../../../types.js';

export function regenTask(options: MigrateCommandOptions, logger: Logger): ListrTask {
  return {
    title: 'Regenerating report for TS errors and ESLint errors',
    enabled: (): boolean => !options.dryRun,
    task: async (_: MigrateCommandContext, task): Promise<void> => {
      // Because we have to eagerly import all the tasks we need to lazily load these
      // modules because they refer to typescript which may or may not be installed
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { generateReports, getRegenSummary } = await import('../../../helpers/report.js');
      const regen = await import('@rehearsal/regen').then((m) => m.regen);

      const projectName = determineProjectName() || '';
      const { basePath, entrypoint } = options;
      const tscPath = await getPathToBinary('tsc', { cwd: options.basePath });
      const { stdout } = await execa(tscPath, ['--version']);
      const tsVersion = stdout.split(' ')[1];
      const reporter = new Reporter(
        { tsVersion, projectName, basePath, commandName: '@rehearsal/migrate' },
        logger
      );

      const input = {
        basePath,
        entrypoint,
        sourceFiles: [],
        logger: logger,
        reporter,
        task,
      };

      const { scannedFiles } = await regen(input);

      const reportOutputPath = resolve(options.basePath, options.outputPath);
      generateReports('migrate', reporter, reportOutputPath, options.format);
      task.title = getRegenSummary(reporter.report, scannedFiles.length);
    },
  };
}

const DEBUG_CALLBACK = debug('rehearsal:migrate:sequential');

export function sequentialTask(
  options: MigrateCommandOptions,
  logger: Logger,
  previousRuns: PreviousRuns
): ListrTask {
  return {
    title:
      'Regenerating past migrate report(s), generating current migrate report and merging all reports',
    enabled: (): boolean => !options.dryRun,
    task: async (_: MigrateCommandContext, task): Promise<void> => {
      const regen = await import('@rehearsal/regen').then((m) => m.regen);
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { generateReports, getReportSummary, getRegenSummary } = await import(
        '../../../helpers/report.js'
      );

      const projectName = determineProjectName() || '';
      const { basePath } = options;
      const tscPath = await getPathToBinary('tsc', { cwd: options.basePath });
      const { stdout } = await execa(tscPath, ['--version']);
      const tsVersion = stdout.split(' ')[1];
      const reporter = new Reporter(
        {
          tsVersion,
          projectName,
          basePath,
          commandName: '@rehearsal/migrate',
          previousFixedCount: previousRuns.previousFixedCount,
        },
        logger
      );

      for (const runPath of previousRuns.paths) {
        const files = await getSourceFiles(runPath.basePath, runPath.entrypoint);
        const { scannedFiles } = await regen({
          basePath: runPath.basePath,
          entrypoint: runPath.entrypoint,
          sourceFiles: files,
          logger,
          reporter,
          task,
        });

        task.title = getRegenSummary(reporter.lastRun!, scannedFiles.length, true);
      }

      const currentRunFiles = await getSourceFiles(options.basePath, options.entrypoint);

      const input = {
        basePath,
        entrypoint: options.entrypoint,
        sourceFiles: currentRunFiles,
        logger: logger,
        reporter,
        task,
      };

      const migratedFiles = [];

      for await (const f of migrate(input)) {
        migratedFiles.push(f);
      }

      DEBUG_CALLBACK('migratedFiles', migratedFiles);
      const reportOutputPath = resolve(options.basePath, options.outputPath);
      generateReports('migrate', reporter, reportOutputPath, options.format);
      task.title = getReportSummary(reporter.report, migratedFiles.length);
    },
  };
}

/*
MERGE THIS
*/
import { resolve } from 'node:path';

const DEBUG_CALLBACK = debug('rehearsal:migrate:sequential');

export function sequentialTask(
  options: MigrateCommandOptions,
  logger: Logger,
  previousRuns: PreviousRuns
): ListrTask {
  return {
    title:
      'Regenerating past migrate report(s), generating current migrate report and merging all reports',
    enabled: (): boolean => !options.dryRun,
    task: async (_: MigrateCommandContext, task): Promise<void> => {
      const regen = await import('@rehearsal/regen').then((m) => m.regen);
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { generateReports, getReportSummary, getRegenSummary } = await import(
        '../../../helpers/report.js'
      );

      const projectName = determineProjectName() || '';
      const { basePath } = options;
      const tscPath = await getPathToBinary('tsc', { cwd: options.basePath });
      const { stdout } = await execa(tscPath, ['--version']);
      const tsVersion = stdout.split(' ')[1];
      const reporter = new Reporter(
        {
          tsVersion,
          projectName,
          basePath,
          commandName: '@rehearsal/migrate',
          previousFixedCount: previousRuns.previousFixedCount,
        },
        logger
      );

      for (const runPath of previousRuns.paths) {
        const files = await getSourceFiles(runPath.basePath, runPath.entrypoint);
        const { scannedFiles } = await regen({
          basePath: runPath.basePath,
          entrypoint: runPath.entrypoint,
          sourceFiles: files,
          logger,
          reporter,
          task,
        });

        task.title = getRegenSummary(reporter.lastRun!, scannedFiles.length, true);
      }

      const currentRunFiles = await getSourceFiles(options.basePath, options.entrypoint);

      const input = {
        basePath,
        entrypoint: options.entrypoint,
        sourceFiles: currentRunFiles,
        logger: logger,
        reporter,
        task,
      };

      const migratedFiles = [];

      for await (const f of migrate(input)) {
        migratedFiles.push(f);
      }

      DEBUG_CALLBACK('migratedFiles', migratedFiles);
      const reportOutputPath = resolve(options.basePath, options.outputPath);
      generateReports('migrate', reporter, reportOutputPath, options.format);
      task.title = getReportSummary(reporter.report, migratedFiles.length);
    },
  };
}

async function getSourceFiles(basePath: string, entrypoint: string): Promise<string[]> {
  const getMigrationStrategy = await import('@rehearsal/migration-graph').then(
    (m) => m.getMigrationStrategy
  );

  const strategy = getMigrationStrategy(basePath, {
    entrypoint,
  });
  const sourceFiles: SourceFile[] = strategy.getMigrationOrder();
  const files = sourceFiles.map((f) => f.path);
  return files;
}
