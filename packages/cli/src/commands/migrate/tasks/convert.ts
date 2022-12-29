import { resolve } from 'path';
import { ListrTask } from 'listr2';
import { Logger } from 'winston';
import { debug } from 'debug';
// import launch from 'launch-editor';
import { Reporter } from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';
import execa = require('execa');

import { generateReports, getReportSummary } from '../../../helpers/report';
import { MigrateCommandContext, MigrateCommandOptions } from '../../../types';
import { determineProjectName, getPathToBinary, openInEditor } from '../../../utils';

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
        if (options.interactive) {
          // In interactive mode, go through files one by one
          // and ask user for actions: Accept/Edit/Discard
          for (const f of ctx.sourceFilesWithAbsolutePath) {
            const jsFilePath = f;
            const tsFilePath = f.replace('js', 'ts');
            let completed = false;

            const input = {
              basePath: ctx.targetPackagePath,
              sourceFiles: [f],
              logger: logger,
              reporter,
            };

            await migrate(input);

            const { stdout: diffOutput } = await execa('git', ['diff', tsFilePath]);

            // TODO: better diff with colors instead of using the output straight from git diff
            const message = `Please view the migration changes for ${f} and select an option to continue:\n${diffOutput}`;

            while (!completed) {
              ctx.input = await task.prompt([
                {
                  type: 'Select',
                  name: 'fileActionSelection',
                  message,
                  choices: ['Accept', 'Edit', 'Discard'],
                },
              ]);

              if (ctx.input === 'Accept') {
                completed = true;
              } else if (ctx.input === 'Edit') {
                // TODO: Currently the CLI would be paused if the editor is terminal based (nano, vim, emacs, etc)
                // If it's a separated GUI editor (like vscode),
                // The subprocess would exit at 0 once the file is opened in the editor
                // and the CLI would not be paused in this case.
                if (!process.env.EDITOR) {
                  logger.warn(
                    'Cannot find default editor in environment variables, please set $EDITOR and try again.'
                  );
                  continue;
                } else {
                  await openInEditor(tsFilePath);
                  completed = true;
                }
              } else {
                // discard
                await execa('git', ['restore', tsFilePath]);
                await execa('git', ['mv', tsFilePath, jsFilePath]);
                completed = true;
              }
            }
          }
        } else {
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
          generateReports('migrate', reporter, reportOutputPath, options.format);

          const { totalErrorCount, errorFixedCount, hintAddedCount } = getReportSummary(
            reporter.report
          );
          const migratedFileCount = migratedFiles.length;
          task.title = `${migratedFileCount} JS ${
            migratedFileCount === 1 ? 'file' : 'files'
          } has been converted to TS. There are ${totalErrorCount} errors caught by rehearsal:
                  - ${errorFixedCount} have been fixed automatically by rehearsal.
                  - ${hintAddedCount} have been updated with @ts-expect-error @rehearsal TODO which need further manual check.`;
        }
      } else {
        task.skip(
          `Skipping JS -> TS conversion task, since there is no JS file to be converted to TS.`
        );
      }
    },
  };
}

// function openFileInEditor(filePath: string, editorBin?: string): void {
//   launch(filePath, editorBin);
// }
