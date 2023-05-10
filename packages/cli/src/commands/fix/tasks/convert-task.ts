/* eslint-disable @typescript-eslint/no-unused-vars */
import debug from 'debug';
import { execa } from 'execa';
import { getPathToBinary } from '@rehearsal/utils';

import type { ListrTask } from 'listr2';
import type { CommandContext, FixCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:fix:convert-task');

export function convertTask(options: FixCommandOptions, _ctx?: CommandContext): ListrTask {
  return {
    title: 'Infer Types',
    task: async (ctx: CommandContext, task): Promise<void> => {
      // Because we have to eagerly import all the tasks we need to lazily load these
      // modules because they refer to typescript which may or may not be installed
      const migrate = await import('@rehearsal/migrate').then((m) => m.migrate);
      const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
      const { getReportSummary } = await import('../../../helpers/report.js');

      const { rootPath, ignore } = options;
      const { projectName, sourceFilesAbs } = ctx;

      // If there is no access to tsc binary throw
      const tscPath = await getPathToBinary('tsc', { cwd: rootPath });
      let tsVersion = '';
      try {
        const { stdout } = await execa(tscPath, ['--version']);
        tsVersion = stdout.split(' ')[1];
      } catch (e) {
        throw new Error(`Cannot find or access tsc in ${tscPath}`);
      }

      const reporter = new Reporter({
        tsVersion,
        projectName,
        rootPath,
        commandName: '@rehearsal/fix',
      });

      // this just cares about ts files which are already in the proper migration order
      if (sourceFilesAbs) {
        const input = {
          rootPath,
          sourceFilesAbs: ctx.sourceFilesAbs,
          reporter,
          task,
          ignore,
        };

        const migratedFiles = [];

        for await (const tsFile of migrate(input)) {
          migratedFiles.push(tsFile);
        }

        DEBUG_CALLBACK('migratedFiles', migratedFiles);

        reporter.printReport(rootPath, options.format);
        task.title = getReportSummary(reporter.report);
      } else {
        task.skip(`TypeScript files not found in: ${rootPath}`);
      }
    },
  };
}
