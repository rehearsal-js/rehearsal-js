import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import { migrate } from '@rehearsal/migrate';
import { Reporter } from '@rehearsal/reporter';
import { getReportSummary } from '../../../helpers/report.js';
import { findPackageRootDirectory, getPathToBinary } from '../../../utils/paths.js';
import type { CommandContext, FixCommandOptions, FixWorkerResponse } from '../../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workerPath = resolve(__dirname, 'convertWorker.js');

export function convertTask(
  srcPath: string,
  options: FixCommandOptions
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: 'Infer Types',
    task: async (ctx: CommandContext, task): Promise<void> => {
      const { rootPath, ignore } = options;
      const { projectName } = ctx;

      // If there is no access to tsc binary throw
      const tscPath = await getPathToBinary('tsc', { cwd: rootPath });
      let tsVersion = '';
      try {
        const { stdout } = await execa(tscPath, ['--version']);
        tsVersion = stdout.split(' ')[1];
      } catch (e) {
        throw new Error(`Cannot find or access tsc in ${tscPath}`);
      }

      const reporterOptions = {
        tsVersion,
        projectName,
        projectRootDir: rootPath,
      };

      const reporter = new Reporter(reporterOptions);
      const packageDir = findPackageRootDirectory(srcPath, rootPath) || rootPath;

      // this just cares about ts files which are already in the proper migration order
      if (ctx.orderedFiles) {
        const migratedFiles: string[] = [];

        if (process.env['TEST'] === 'true' || process.env['WORKER'] === 'false') {
          for await (const tsFile of migrate({
            mode: options.mode,
            projectRootDir: rootPath,
            packageDir: packageDir,
            filesToMigrate: ctx.orderedFiles,
            reporter,
            ignore,
            task,
          })) {
            migratedFiles.push(tsFile);
          }
          reporter.printReport(rootPath, options.format);
          task.title = getReportSummary(reporter.report.items, reporter.report.fixedItemCount);
        } else {
          await new Promise((resolve, reject) => {
            const worker = new Worker(workerPath, {
              workerData: JSON.stringify({
                mode: options.mode,
                projectRootDir: rootPath,
                packageDir: packageDir,
                filesToMigrate: ctx.orderedFiles,
                reporterOptionsTSVersion: tsVersion,
                reporterOptionsProjectName: projectName,
                reporterOptionsProjectRootDir: rootPath,
                reporterOptionsCommandName: 'rehearsal fix',
                format: options.format,
                ignore,
              }),
            });

            worker.on('message', (response: FixWorkerResponse) => {
              switch (response.type) {
                case 'logger':
                  task.output = `processing file: ${response.content.replace(rootPath, '')}`;
                  break;
                case 'message':
                  task.title = getReportSummary(
                    response.content.reportItems,
                    response.content.fixedItemCount
                  );
                  break;
                case 'files':
                  resolve(response.content);
                  break;
              }
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
              if (code !== 0) {
                reject(new Error(`Fix worker stopped with exit code ${code}`));
              }
            });
          });
        }
      } else {
        task.skip(`TypeScript files not found in: ${rootPath}`);
      }
    },
  };
}
