import { resolve } from 'node:path';
import { Logger } from 'winston';
import { execa } from 'execa';

import { determineProjectName, getPathToBinary } from '@rehearsal/utils';
import type { ListrTask } from 'listr2';

import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

export function regenTask(options: MigrateCommandOptions, logger: Logger): ListrTask {
  return {
    title: 'Regenerating report for TS errors and Eslint errors',
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
