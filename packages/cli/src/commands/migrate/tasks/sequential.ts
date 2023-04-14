import { resolve } from 'node:path';
import { Logger } from 'winston';
import debug from 'debug';
import { execa } from 'execa';
import { determineProjectName, getPathToBinary } from '@rehearsal/utils';
import { getSourceFiles } from '../../../helpers/sequential.js';

import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions, PreviousRuns } from '../../../types.js';

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
