import { resolve } from 'path';
import { Logger } from 'winston';
import { debug } from 'debug';
import execa = require('execa');
import { determineProjectName, getPathToBinary, gitAddIfInRepo } from '@rehearsal/utils';
import { getSourceFiles } from '../../../helpers/sequential';
import type { ListrTask } from 'listr2';

import type { MigrateCommandContext, MigrateCommandOptions, PreviousRuns } from '../../../types';

const DEBUG_CALLBACK = debug('rehearsal:migrate:sequential');

export async function sequentialTask(
  options: MigrateCommandOptions,
  logger: Logger,
  previousRuns: PreviousRuns
): Promise<ListrTask> {
  return {
    title:
      'Regenerating past migrate report(s), generating current migrate report and merging all reports',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_: MigrateCommandContext, task): Promise<void> => {
      const regen = await import('@rehearsal/regen').then((m) => m.regen);
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { generateReports, getReportSummary, getRegenSummary } = await import('../../../helpers/report');

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
        const files = getSourceFiles(runPath.basePath, runPath.entrypoint);
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

      const currentRunFiles = getSourceFiles(options.basePath, options.entrypoint);

      const { migratedFiles } = await migrate({
        basePath,
        entrypoint: options.entrypoint,
        sourceFiles: currentRunFiles,
        logger: logger,
        reporter,
        task,
      });

      DEBUG_CALLBACK('migratedFiles', migratedFiles);
      const reportOutputPath = resolve(options.basePath, options.outputPath);
      generateReports('migrate', reporter, reportOutputPath, options.format);
      gitAddIfInRepo(reportOutputPath, basePath); // stage report if in git repo
      task.title = getReportSummary(reporter.report, migratedFiles.length);
    },
  };
}
