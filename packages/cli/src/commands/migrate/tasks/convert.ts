import { resolve } from 'path';
import { ListrTask } from 'listr2';
import { Logger } from 'winston';
import { debug } from 'debug';
import {
  jsonFormatter,
  mdFormatter,
  Reporter,
  sarifFormatter,
  sonarqubeFormatter,
} from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';
import execa = require('execa');

import { generateReports, getReportSummary } from '../../../helpers/report';
import { MigrateCommandContext, MigrateCommandOptions } from '../../../types';
import { determineProjectName, getPathToBinary } from '../../../utils';

const DEBUG_CALLBACK = debug('rehearsal:migrate');

export function convertTask(options: MigrateCommandOptions, logger: Logger): ListrTask {
  return {
    title: 'Converting JS files to TS',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task) => {
      const projectName = determineProjectName() || '';
      const { basePath } = options;
      const tscPath = await getPathToBinary('tsc');
      const { stdout } = await execa(tscPath, ['--version']);
      const tsVersion = stdout.split(' ')[1];

      const reporter = new Reporter(
        { tsVersion, projectName, basePath, commandName: '@rehearsal/migrate' },
        logger
      );

      if (ctx.sourceFilesWithAbsolutePath) {
        const input = {
          basePath: ctx.targetPackagePath,
          sourceFiles: ctx.sourceFilesWithAbsolutePath,
          logger: logger,
          reporter,
        };

        const { migratedFiles } = await migrate(input);
        DEBUG_CALLBACK('migratedFiles', migratedFiles);
        if (ctx.state) {
          ctx.state.addFilesToPackage(ctx.targetPackagePath, migratedFiles);
          await ctx.state.addStateFileToGit();
        }

        const reportOutputPath = resolve(options.basePath, options.outputPath);
        generateReports(reporter, reportOutputPath, options.format, {
          json: jsonFormatter,
          sarif: sarifFormatter,
          md: mdFormatter,
          sonarqube: sonarqubeFormatter,
        });

        const { totalErrorCount, errorFixedCount, hintAddedCount } = getReportSummary(
          reporter.report
        );
        const migratedFileCount = migratedFiles.length;
        task.title = `${migratedFileCount} JS ${
          migratedFileCount === 1 ? 'file' : 'files'
        } has been converted to TS. There are ${totalErrorCount} errors caught by rehearsal:
                - ${errorFixedCount} have been fixed automatically by rehearsal.
                - ${hintAddedCount} have been updated with @ts-expect-error @rehearsal TODO which need further manual check.`;
      } else {
        task.skip(
          `Skipping JS -> TS conversion task, since there is no JS file to be converted to TS.`
        );
      }
    },
  };
}
