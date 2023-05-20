import debug from 'debug';
import { execa } from 'execa';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import { migrate } from '@rehearsal/migrate';
import { Reporter } from '@rehearsal/reporter';
import { getReportSummary } from '../../../helpers/report.js';
import { findPackageRootDirectory, getPathToBinary } from '../../../utils/paths.js';
import type { CommandContext, FixCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:fix:convert-task');

export function convertTask(
  targetPath: string,
  options: FixCommandOptions
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: 'Infer Types',
    task: async (ctx: CommandContext, task): Promise<void> => {
      const { rootPath, ignore } = options;
      const { projectName, orderedFiles } = ctx;

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
        projectRootDir: rootPath,
        commandName: '@rehearsal/fix',
      });

      const packageDir = findPackageRootDirectory(targetPath, rootPath) || rootPath;

      // this just cares about ts files which are already in the proper migration order
      if (orderedFiles) {
        const input = {
          mode: options.mode,
          projectRootDir: rootPath,
          packageDir: packageDir,
          filesToMigrate: ctx.orderedFiles,
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
