import { resolve } from 'path';
import { Logger } from 'winston';
import { Reporter } from '@rehearsal/reporter';
import { regen } from '@rehearsal/regen';
import execa = require('execa');

import { determineProjectName, getPathToBinary } from '@rehearsal/utils';
import { generateReports, getRegenSummary } from '../../../helpers/report';
import type { ListrTask } from 'listr2';

import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

export async function regenTask(
  options: MigrateCommandOptions,
  logger: Logger
): Promise<ListrTask> {
  return {
    title: 'Regenerating report for TS errors and Eslint errors',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_: MigrateCommandContext, task): Promise<void> => {
      const projectName = determineProjectName() || '';
      const { basePath } = options;
      const tscPath = await getPathToBinary('tsc');
      const { stdout } = await execa(tscPath, ['--version']);
      const tsVersion = stdout.split(' ')[1];
      const reporter = new Reporter(
        { tsVersion, projectName, basePath, commandName: '@rehearsal/migrate' },
        logger
      );

      const input = {
        basePath,
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
