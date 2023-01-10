import { resolve } from 'path';
import { Logger } from 'winston';
import { debug } from 'debug';
import { Reporter } from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';
import execa = require('execa');

import { generateReports, getReportSummary } from '../../../helpers/report';
import { determineProjectName, openInEditor, getPathToBinary } from '../../../utils';
import type { ListrTask } from 'listr2';

import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

const DEBUG_CALLBACK = debug('rehearsal:migrate:convert');

export async function convertTask(
  options: MigrateCommandOptions,
  logger: Logger,
  context?: MigrateCommandContext
): Promise<ListrTask> {
  return {
    title: 'Convert JS files to TS',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // During interactive mode, if context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
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
            const tsFilePath = f.replace(/js$/g, 'ts');
            let completed = false;

            const input = {
              basePath: ctx.targetPackagePath,
              sourceFiles: [f],
              logger: logger,
              reporter,
              task,
            };

            const { migratedFiles } = await migrate(input);

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
            const reportOutputPath = resolve(options.basePath, options.outputPath);
            generateReports('migrate', reporter, reportOutputPath, options.format);
            task.title = getReportSummary(reporter.report, migratedFiles.length);
          }
        } else {
          const input = {
            basePath: ctx.targetPackagePath,
            sourceFiles: ctx.sourceFilesWithAbsolutePath,
            logger: logger,
            reporter,
            task,
          };

          const { migratedFiles } = await migrate(input);

          DEBUG_CALLBACK('migratedFiles', migratedFiles);
          if (ctx.state) {
            ctx.state.addFilesToPackage(ctx.targetPackagePath, migratedFiles);
            await ctx.state.addStateFileToGit();
          }
          const reportOutputPath = resolve(options.basePath, options.outputPath);
          generateReports('migrate', reporter, reportOutputPath, options.format);
          task.title = getReportSummary(reporter.report, migratedFiles.length);
        }
      } else {
        task.skip('Skip JS -> TS conversion task, no JS files detected');
      }
    },
  };
}
